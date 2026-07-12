import { useEffect, useState } from "react";
import {
  fetchArrowSeries,
  fetchArrowTable,
  tableToDevices,
  tableToSeries,
  type ArrowDevice,
  type ArrowSeries,
} from "../lib/arrowClient";

/**
 * A live demo of the zero-copy Arrow pipeline: three datasets are pulled from
 * the backend as binary Apache Arrow IPC streams and unpacked on the main
 * thread with no `JSON.parse` round-trip. The same columnar data is what the
 * ECharts widgets consume.
 */

interface ArrowTelemetryState {
  temperature: ArrowSeries | null;
  humidity: ArrowSeries | null;
  devices: ArrowDevice[];
  loading: boolean;
  error: string | null;
}

export default function ArrowTelemetry() {
  const [state, setState] = useState<ArrowTelemetryState>({
    temperature: null,
    humidity: null,
    devices: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [tempTable, humTable, devTable] = await Promise.all([
          fetchArrowSeries("/api/telemetry/arrow/temperature"),
          fetchArrowSeries("/api/telemetry/arrow/humidity"),
          fetchArrowTable("/api/telemetry/arrow/devices"),
        ]);
        if (cancelled) return;
        setState({
          temperature: tempTable,
          humidity: humTable,
          devices: tableToDevices(devTable),
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Arrow load failed",
        }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-6 text-xs text-rose-600">
        Columnar stream unavailable: {state.error}
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-xs text-slate-400 animate-pulse">
        Streaming Apache Arrow IPC from backend…
      </div>
    );
  }

  const peakTemp = state.temperature
    ? Math.max(...state.temperature.values)
    : 0;
  const peakHum = state.humidity ? Math.max(...state.humidity.values) : 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-slate-800 text-base">
          Zero-Copy Columnar Telemetry
        </h3>
        <span className="bg-teal-50 text-[10px] font-mono font-semibold text-teal-600 px-2 py-0.5 rounded border border-teal-100">
          Apache Arrow IPC
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Temperature points" value={state.temperature?.values.length ?? 0} hint={`peak ${peakTemp}°C`} />
        <Stat label="Humidity points" value={state.humidity?.values.length ?? 0} hint={`peak ${peakHum}%`} />
        <Stat label="Devices streamed" value={state.devices.length} hint="from Arrow table" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
      <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider">
        {label}
      </span>
      <span className="font-display font-bold text-slate-800 text-lg block mt-1">
        {value}
      </span>
      <span className="text-[10px] text-slate-400">{hint}</span>
    </div>
  );
}
