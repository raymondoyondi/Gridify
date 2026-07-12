import React, { Suspense } from "react";

const RechartsChart = React.lazy(
  () => import("./RechartsChart")
);

export interface LazyRechartsChartProps {
  data: import("./RechartsChart").Point[];
  xKey?: string;
  yKey?: string;
  height?: number;
  color?: string;
}

export function LazyRechartsChart(props: LazyRechartsChartProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full min-h-[220px] flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse">
          <span className="text-xs font-medium text-slate-400">Loading chart…</span>
        </div>
      }
    >
      <RechartsChart {...props} />
    </Suspense>
  );
}
