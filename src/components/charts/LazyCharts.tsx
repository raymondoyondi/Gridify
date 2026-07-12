import React, { Suspense } from "react";
import { TelemetryData, Widget } from "../../types";

/**
 * Lazy-loaded heavy visualization modules.
 *
 * Apache ECharts (~1MB) and React Flow (with D3 under the hood) are the two
 * largest dependencies in the app. They are only needed on specific
 * views/widgets, so we split them into their own async chunks with
 * `React.lazy` and load them on demand. This keeps the baseline bundle small:
 * a user who never opens the advanced analytics or pipeline views never
 * downloads ECharts or React Flow.
 */

const EChartsVisualization = React.lazy(
  () => import("./EChartsVisualization")
);
const DataPipelineFlow = React.lazy(
  () => import("../DataPipelineFlow")
);

/** Lightweight placeholder shown while a heavy chunk is being fetched. */
export function ChartSkeleton({ label = "Loading visualization…" }: { label?: string }) {
  return (
    <div className="w-full h-full min-h-[220px] flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse">
      <span className="text-xs font-medium text-slate-400">{label}</span>
    </div>
  );
}

interface LazyEChartsProps {
  widget: Widget;
  telemetry: TelemetryData;
}

export function LazyECharts({ widget, telemetry }: LazyEChartsProps) {
  return (
    <Suspense fallback={<ChartSkeleton label="Loading ECharts…" />}>
      <EChartsVisualization widget={widget} telemetry={telemetry} />
    </Suspense>
  );
}

interface LazyPipelineProps {
  title?: string;
  showMiniMap?: boolean;
}

export function LazyDataPipelineFlow({ title, showMiniMap }: LazyPipelineProps) {
  return (
    <Suspense fallback={<ChartSkeleton label="Loading pipeline graph…" />}>
      <DataPipelineFlow title={title} showMiniMap={showMiniMap} />
    </Suspense>
  );
}
