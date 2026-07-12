import React, { Suspense } from "react";

const ChartjsChart = React.lazy(
  () => import("./ChartjsChart")
);

export interface LazyChartjsChartProps {
  data: import("./ChartjsChart").Point[];
  xKey?: string;
  yKey?: string;
  height?: number;
  color?: string;
  fill?: boolean;
  options?: import("chart.js").ChartOptions<"line">;
}

export function LazyChartjsChart(props: LazyChartjsChartProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full min-h-[220px] flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse">
          <span className="text-xs font-medium text-slate-400">Loading chart…</span>
        </div>
      }
    >
      <ChartjsChart {...props} />
    </Suspense>
  );
}
