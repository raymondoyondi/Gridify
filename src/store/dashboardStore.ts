import { create } from "zustand";
import { Widget, TelemetryData } from "../types";

/**
 * Central dashboard state.
 *
 * Dynamic generative-UI layouts push a lot of interdependent state (widgets,
 * their ordering, AI summaries, telemetry, filter chips, system status). Keeping
 * this in one Zustand store — instead of prop-drilling many `useState` hooks
 * through `App` -> `DragDropGrid` -> widgets — makes the grid orchestration
 * predictable and lets any component subscribe to just the slice it needs.
 */

export interface DashboardCommandResult {
  aiSummary?: string[];
  feedbackMessage?: string;
  newWidgets?: Widget[];
  status?: string;
}

export const INITIAL_WIDGETS: Widget[] = [
  {
    id: "temp_metrics",
    title: "IoT Sensor Metrics - Temperature",
    subtitle: "Line tracking sensor telemetry",
    type: "line",
    w: 4,
    order: 0,
  },
  {
    id: "humidity_metrics",
    title: "IoT Sensor Metrics - Humidity",
    subtitle: "Bar volume sensor percentages",
    type: "bar",
    w: 4,
    order: 1,
  },
  {
    id: "devices_status",
    title: "IoT Sensor Metrics - Device Status",
    subtitle: "Active status indicator signals (Select device to investigate)",
    type: "status",
    w: 4,
    order: 2,
  },
  {
    id: "analytics_summary",
    title: "Business Analytics Summary",
    subtitle:
      "Real-time device uptime and loading metrics aggregate representation",
    type: "summary",
    w: 4,
    order: 3,
  },
  {
    id: "custom_layouts",
    title: "Custom Layouts & Summaries",
    subtitle:
      "Interact directly with layouts inside Gridify using automated layout templates or quick actions below.",
    type: "actions",
    w: 4,
    order: 4,
  },
];

export const INITIAL_TELEMETRY: TelemetryData = {
  devices: [],
  temperatureHistory: [],
  humidityHistory: [],
};

export const DEFAULT_SUMMARIES: string[] = [
  "Temperature trends humidity. Check peak loads during afternoon operations.",
  "Restrate rine sensor humidity, and heanonate IoT sensor line metrics.",
  "Increase different states and stability values to devices and load balancer.",
  "Decrease the device integers to ensure creation of warm templates in high temperatures.",
  "All core endpoints contact logs for improved performance and maintenance intervals.",
];

const INITIAL_CHIPS = ["IoT Sensor", "Devices Status, IoT"];

interface DashboardState {
  widgets: Widget[];
  telemetry: TelemetryData;
  aiBulletSummaries: string[];
  systemStatus: string;
  searchChips: string[];

  // Widget/grid actions
  setWidgets: (widgets: Widget[]) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  removeWidget: (widgetId: string) => void;

  // Telemetry & summaries
  setTelemetry: (telemetry: TelemetryData) => void;
  setSummaries: (summaries: string[]) => void;
  setSystemStatus: (status: string) => void;

  // Filter chips
  addChip: (chip: string) => void;
  removeChip: (chip: string) => void;

  // High-level orchestration
  applyCommandResult: (result: DashboardCommandResult) => void;
  resetLayout: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  widgets: INITIAL_WIDGETS,
  telemetry: INITIAL_TELEMETRY,
  aiBulletSummaries: DEFAULT_SUMMARIES,
  systemStatus: "Nominal",
  searchChips: INITIAL_CHIPS,

  setWidgets: (widgets) => set({ widgets }),

  reorderWidgets: (fromIndex, toIndex) =>
    set((state) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.widgets.length ||
        toIndex >= state.widgets.length
      ) {
        return {};
      }
      const updated = [...state.widgets];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { widgets: updated.map((w, i) => ({ ...w, order: i })) };
    }),

  removeWidget: (widgetId) =>
    set((state) => ({
      widgets: state.widgets.filter((w) => w.id !== widgetId),
    })),

  setTelemetry: (telemetry) => set({ telemetry }),
  setSummaries: (aiBulletSummaries) => set({ aiBulletSummaries }),
  setSystemStatus: (systemStatus) => set({ systemStatus }),

  addChip: (chip) =>
    set((state) =>
      state.searchChips.includes(chip)
        ? {}
        : { searchChips: [...state.searchChips, chip] }
    ),

  removeChip: (chip) =>
    set((state) => ({
      searchChips: state.searchChips.filter((c) => c !== chip),
    })),

  applyCommandResult: (result) =>
    set((state) => {
      const next: Partial<DashboardState> = {};
      if (result.aiSummary) next.aiBulletSummaries = result.aiSummary;
      if (result.status) next.systemStatus = result.status;
      if (result.newWidgets) {
        next.widgets = result.newWidgets.map((w, idx) => ({
          ...w,
          order: w.order !== undefined ? w.order : idx,
        }));
      }
      return next;
    }),

  resetLayout: () =>
    set({
      widgets: INITIAL_WIDGETS,
      aiBulletSummaries: DEFAULT_SUMMARIES,
      systemStatus: "Nominal",
      searchChips: INITIAL_CHIPS,
    }),
}));
