import { useEffect, useState, type ReactNode } from "react";
import {
  fetchArrowTable,
  tableToDevices,
  type ArrowDevice,
} from "../lib/arrowClient";
import { useDuckDBAnalytics } from "../hooks/useDuckDB";
import type { DeviceQueryOptions } from "../lib/duckdbQueries";

/**
 * Demonstrates the DuckDB-WASM offload: telemetry is fetched once as an Arrow
 * stream, loaded into the in-browser database, and every subsequent
 * filter/sort/aggregation below runs locally in a web worker — never hitting the
 * centralized FastAPI/Celery cluster.
 */
export default function DuckDBAnalytics() {
  const [devices, setDevices] = useState<ArrowDevice[]>([]);
  const { loading, error, ready, runQuery, runAggregate } =
    useDuckDBAnalytics(devices);

  const [rows, setRows] = useState<ArrowDevice[]>([]);
  const [agg, setAgg] = useState<{ type: string; device_count: number; avg_score: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchArrowTable("/api/telemetry/arrow/devices")
      .then((t) => {
        if (!cancelled) setDevices(tableToDevices(t));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function runLocal(q: DeviceQueryOptions) {
    setRows(await runQuery(q));
  }

  async function runLocalAgg() {
    setAgg(await runAggregate());
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-6 text-xs text-rose-600">
        Local engine unavailable: {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-slate-800 text-base">
          Edge Analytics (DuckDB-WASM)
        </h3>
        <span
          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
            loading
              ? "bg-amber-50 border-amber-100 text-amber-600"
              : "bg-emerald-50 border-emerald-100 text-emerald-600"
          }`}
        >
          {loading ? "loading wasm…" : ready ? "worker ready" : "offline"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <LocalButton label="Alert devices" disabled={!ready} onClick={() => runLocal({ status: "alert", orderBy: "score", direction: "DESC" })} />
        <LocalButton label="Hosts by uptime" disabled={!ready} onClick={() => runLocal({ type: "Host", orderBy: "uptime", direction: "DESC" })} />
        <LocalButton label="Score ≥ 28" disabled={!ready} onClick={() => runLocal({ minScore: 28, orderBy: "score", direction: "DESC" })} />
        <LocalButton label="Aggregate by type" disabled={!ready} onClick={runLocalAgg} />
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-slate-50 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <Th>id</Th>
                <Th>type</Th>
                <Th>status</Th>
                <Th>score</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <Td>{r.id}</Td>
                  <Td>{r.type}</Td>
                  <Td>{r.status}</Td>
                  <Td>{r.score.toFixed(2)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {agg.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agg.map((a) => (
            <div key={a.type} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider">
                {a.type}
              </span>
              <span className="font-display font-bold text-slate-800 text-lg block mt-1">
                {a.device_count} · {a.avg_score.toFixed(2)}★
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocalButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="text-xs font-medium px-3 py-1.5 rounded-xl border border-teal-100 bg-teal-50/60 text-teal-700 hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="p-3 text-[10px] font-semibold text-slate-400 tracking-wider">{children}</th>;
}
function Td({ children }: { children: ReactNode }) {
  return <td className="p-3 text-xs text-slate-600">{children}</td>;
}
