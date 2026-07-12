/**
 * Real-time sync engine for collaborative dashboard layouts.
 *
 * GenAI drafts and Framer-Motion drags change dashboard layouts constantly.
 * Zustand holds ephemeral UI state, but saved/sharable layouts need to stream
 * to every active browser session the moment they change. This module provides
 * a provider abstraction so the transport can be swapped without touching the
 * dashboard code:
 *
 *   - `BroadcastChannelProvider` : zero-dep, same-browser cross-tab sync
 *     (falls back to an in-process hub when `BroadcastChannel` is unavailable,
 *     e.g. unit tests / SSR). Good enough for single-device multi-window.
 *   - `YjsProvider`              : multiplayer CRDT over a WebSocket
 *     (Yjs + y-websocket), the recommended option for true cross-device,
 *     conflict-free collaborative editing. Loaded lazily so the bundle and the
 *     test environment never require Yjs unless this provider is selected.
 *   - `SupabaseProvider`         : hosted realtime (Supabase Realtime / Postgres
 *     changes) — a thin wrapper illustrating the hosted alternative.
 *
 * `DashboardSync` ties a provider to a layout document: local edits are pushed
 * immediately and remote edits are applied through a single `onChange` callback.
 */

import { Widget } from "../types";

export type SyncKind = "update" | "init" | "presence";

export interface SyncMessage {
  kind: SyncKind;
  room: string;
  sender: string;
  widgets: Widget[];
  /** Wall-clock ts used to break ties on concurrent updates. */
  revision: number;
}

export interface RealtimeProvider {
  readonly name: string;
  connect(room: string): Promise<void>;
  broadcast(message: Omit<SyncMessage, "room" | "sender">): void;
  onMessage(cb: (msg: SyncMessage) => void): void;
  disconnect(): void;
}

// --------------------------------------------------------------------------- //
// In-process hub: lets multiple provider instances in the same JS realm (tests,
// SSR) exchange messages when the platform `BroadcastChannel` is missing.
// --------------------------------------------------------------------------- //
const __hubs = new Map<string, Set<(msg: SyncMessage) => void>>();

function hubPublish(room: string, msg: SyncMessage): void {
  const subs = __hubs.get(room);
  if (!subs) return;
  for (const cb of subs) cb(msg);
}
function hubSubscribe(
  room: string,
  cb: (msg: SyncMessage) => void,
): () => void {
  let subs = __hubs.get(room);
  if (!subs) {
    subs = new Set();
    __hubs.set(room, subs);
  }
  subs.add(cb);
  return () => subs!.delete(cb);
}

let __senderId = 0;
function nextSender(): string {
  __senderId += 1;
  return `client-${__senderId}-${Math.random().toString(36).slice(2, 8)}`;
}

// --------------------------------------------------------------------------- //
// Provider: cross-tab via BroadcastChannel (or in-process hub fallback)
// --------------------------------------------------------------------------- //
export class BroadcastChannelProvider implements RealtimeProvider {
  readonly name = "broadcast";
  private room = "";
  private channel: BroadcastChannel | null = null;
  private sender = nextSender();
  private listeners = new Set<(msg: SyncMessage) => void>();

  async connect(room: string): Promise<void> {
    this.room = room;
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(`gridify:${room}`);
      this.channel.onmessage = (e: MessageEvent<SyncMessage>) => {
        if (e.data.sender !== this.sender) {
          for (const cb of this.listeners) cb(e.data);
        }
      };
    }
  }

  broadcast(message: Omit<SyncMessage, "room" | "sender">): void {
    const full: SyncMessage = {
      ...message,
      room: this.room,
      sender: this.sender,
    };
    if (this.channel) {
      this.channel.postMessage(full);
    } else {
      hubPublish(this.room, full);
    }
  }

  onMessage(cb: (msg: SyncMessage) => void): void {
    if (this.channel) {
      this.listeners.add(cb);
    } else {
      this._hubUnsub = hubSubscribe(this.room, (msg) => {
        if (msg.sender !== this.sender) cb(msg);
      });
    }
  }

  private _hubUnsub: (() => void) | null = null;

  disconnect(): void {
    this._hubUnsub?.();
    this._hubUnsub = null;
    this.listeners.clear();
    this.channel?.close();
    this.channel = null;
  }
}

// --------------------------------------------------------------------------- //
// Provider: Yjs multiplayer CRDT (lazy import — no bundle/test cost unless used)
// --------------------------------------------------------------------------- //
export class YjsProvider implements RealtimeProvider {
  readonly name = "yjs";
  private room = "";
  private sender = nextSender();
  private doc: any = null;
  private array: any = null;
  private listeners = new Set<(msg: SyncMessage) => void>();
  private wsUrl: string;

  constructor(opts: { wsUrl?: string } = {}) {
    this.wsUrl = opts.wsUrl ?? "wss://gridify.yjs.dev";
  }

  async connect(room: string): Promise<void> {
    this.room = room;
    let Y: any;
    let WebsocketProvider: any;
    try {
      // Non-literal specifiers keep these optional deps out of the production
      // bundle and let `tsc` pass when they are not installed. Install
      // 'yjs' + 'y-websocket' to enable multiplayer CRDT sync.
      const ySpec: string = "yjs";
      const wsSpec: string = "y-websocket";
      Y = await import(/* @vite-ignore */ ySpec);
      ({ WebsocketProvider } = await import(/* @vite-ignore */ wsSpec));
    } catch (err) {
      throw new Error(
        "YjsProvider requires 'yjs' and 'y-websocket' to be installed. " +
          "Add them as dependencies to enable multiplayer CRDT sync.",
      );
    }
    this.doc = new Y.Doc();
    this.array = (this.doc as any).getArray("widgets");
    new WebsocketProvider(this.wsUrl, room, this.doc);
    this.array.observe(() => {
      const msg: SyncMessage = {
        kind: "update",
        room: this.room,
        sender: this.sender,
        widgets: this.array.toArray() as Widget[],
        revision: Date.now(),
      };
      for (const cb of this.listeners) cb(msg);
    });
  }

  broadcast(message: Omit<SyncMessage, "room" | "sender">): void {
    if (!this.array) return;
    this.array.delete(0, this.array.length);
    this.array.insert(0, message.widgets);
  }

  onMessage(cb: (msg: SyncMessage) => void): void {
    this.listeners.add(cb);
  }

  disconnect(): void {
    this.listeners.clear();
    try {
      this.doc?.destroy();
    } catch {
      /* ignore */
    }
  }
}

// --------------------------------------------------------------------------- //
// Provider: Supabase hosted realtime (illustrative thin wrapper)
// --------------------------------------------------------------------------- //
export class SupabaseProvider implements RealtimeProvider {
  readonly name = "supabase";
  private room = "";
  private sender = nextSender();
  private listeners = new Set<(msg: SyncMessage) => void>();
  private client: any = null;

  constructor(opts: { url?: string; anonKey?: string } = {}) {
    this.url = opts.url;
    this.anonKey = opts.anonKey;
  }
  private url?: string;
  private anonKey?: string;

  async connect(room: string): Promise<void> {
    this.room = room;
    if (!this.url) return; // no-op when unconfigured
    const supaSpec: string = "@supabase/supabase-js";
    const mod = await import(/* @vite-ignore */ supaSpec).catch(() => null);
    if (!mod) return;
    this.client = mod.createClient(this.url, this.anonKey);
    this.client
      .channel(`layout:${room}`)
      .on(
        "broadcast",
        { event: "sync" },
        (payload: { payload: SyncMessage }) => {
          if (payload.payload.sender !== this.sender) {
            for (const cb of this.listeners) cb(payload.payload);
          }
        },
      )
      .subscribe();
  }

  broadcast(message: Omit<SyncMessage, "room" | "sender">): void {
    if (!this.client) return;
    this.client.channel(`layout:${this.room}`).send({
      type: "broadcast",
      event: "sync",
      payload: { ...message, room: this.room, sender: this.sender },
    });
  }

  onMessage(cb: (msg: SyncMessage) => void): void {
    this.listeners.add(cb);
  }

  disconnect(): void {
    this.listeners.clear();
    try {
      this.client?.removeAllChannels();
    } catch {
      /* ignore */
    }
  }
}

// --------------------------------------------------------------------------- //
// DashboardSync: binds a provider to a layout document.
// --------------------------------------------------------------------------- //
export class DashboardSync {
  private provider: RealtimeProvider;
  private room: string;
  private widgets: Widget[] = [];
  private onChange: (widgets: Widget[]) => void;
  private lastRevision = 0;
  private connected = false;

  constructor(opts: {
    provider?: RealtimeProvider;
    room?: string;
    initial: Widget[];
    onChange: (widgets: Widget[]) => void;
  }) {
    this.provider = opts.provider ?? new BroadcastChannelProvider();
    this.room = opts.room ?? "default";
    this.widgets = opts.initial;
    this.onChange = opts.onChange;
  }

  async start(): Promise<void> {
    await this.provider.connect(this.room);
    this.provider.onMessage((msg) => this._applyRemote(msg));
    // Announce our current state so late joiners converge.
    this.provider.broadcast({
      kind: "init",
      widgets: this.widgets,
      revision: Date.now(),
    });
    this.connected = true;
  }

  private _applyRemote(msg: SyncMessage): void {
    if (msg.revision < this.lastRevision) return; // ignore stale
    this.lastRevision = msg.revision;
    this.widgets = msg.widgets;
    this.onChange(msg.widgets);
  }

  /** Push a local layout change to every active session immediately. */
  update(widgets: Widget[]): void {
    this.widgets = widgets;
    this.lastRevision = Date.now();
    if (this.connected) {
      this.provider.broadcast({
        kind: "update",
        widgets,
        revision: this.lastRevision,
      });
    }
  }

  get current(): Widget[] {
    return this.widgets;
  }

  stop(): void {
    this.provider.disconnect();
    this.connected = false;
  }
}

/** Build the provider selected by `REALTIME_PROVIDER` (default: broadcast). */
export function createProvider(kind = "broadcast"): RealtimeProvider {
  if (kind === "yjs") return new YjsProvider();
  if (kind === "supabase") return new SupabaseProvider();
  return new BroadcastChannelProvider();
}
