import { describe, it, expect } from "vitest";
import {
  BroadcastChannelProvider,
  DashboardSync,
  createProvider,
  RealtimeProvider,
  SyncMessage,
} from "./realtimeSync";
import { Widget } from "../types";

const widgetsA: Widget[] = [
  { id: "a", title: "A", subtitle: "", type: "line", w: 4, order: 0 },
];
const widgetsB: Widget[] = [
  { id: "b", title: "B", subtitle: "", type: "bar", w: 4, order: 0 },
];

describe("BroadcastChannelProvider + DashboardSync", () => {
  it("streams local layout changes to a remote session", async () => {
    const received: Widget[][] = [];
    const remote = new DashboardSync({
      provider: new BroadcastChannelProvider(),
      room: "room-1",
      initial: widgetsA,
      onChange: (w) => received.push(w),
    });
    await remote.start();

    const local = new DashboardSync({
      provider: new BroadcastChannelProvider(),
      room: "room-1",
      initial: widgetsA,
      onChange: () => {},
    });
    await local.start();
    local.update(widgetsB);

    // Give the in-process hub a tick to deliver.
    await new Promise((r) => setTimeout(r, 0));

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[received.length - 1][0].id).toBe("b");
    remote.stop();
    local.stop();
  });

  it("delivers messages between two providers in the same room", async () => {
    const received: SyncMessage[] = [];
    const a = new BroadcastChannelProvider();
    const b = new BroadcastChannelProvider();
    await a.connect("room-2");
    await b.connect("room-2");
    b.onMessage((m) => received.push(m));

    a.broadcast({ kind: "update", widgets: widgetsB, revision: 100 });
    a.broadcast({ kind: "update", widgets: widgetsA, revision: 50 });

    await new Promise((r) => setTimeout(r, 0));
    expect(received).toHaveLength(2);
    expect(received.every((m) => m.sender === (a as any)["sender"])).toBe(true);
    a.disconnect();
    b.disconnect();
  });

  it("createProvider returns the requested transport", () => {
    expect(createProvider("broadcast").name).toBe("broadcast");
    const y = createProvider("yjs");
    expect((y as RealtimeProvider).name).toBe("yjs");
  });

  it("two DashboardSync instances converge on the same room", async () => {
    const changes: Widget[][] = [];
    const a = new DashboardSync({
      provider: new BroadcastChannelProvider(),
      room: "room-3",
      initial: widgetsA,
      onChange: () => {},
    });
    const b = new DashboardSync({
      provider: new BroadcastChannelProvider(),
      room: "room-3",
      initial: widgetsA,
      onChange: (w) => changes.push(w),
    });
    await a.start();
    await b.start();
    a.update(widgetsB);
    await new Promise((r) => setTimeout(r, 0));
    expect(changes.some((c) => c[0]?.id === "b")).toBe(true);
    a.stop();
    b.stop();
  });
});
