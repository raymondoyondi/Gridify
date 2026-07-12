import { tableFromIPC, type Table } from "apache-arrow";

/**
 * Client-side columnar parsing for the Gridify telemetry stream.
 *
 * The backend exposes telemetry datasets as Apache Arrow IPC byte streams (see
 * `backend/app/services/arrow_service.py`). Instead of `JSON.parse`-ing a big
 * matrix on the main thread, we pull the *binary* stream and hand it directly to
 * the native JavaScript `apache-arrow` runtime, which reconstructs the columnar
 * table with zero text decoding. Chart datasets are then sliced out of the typed
 * columns.
 */

export const ARROW_MEDIA_TYPE = "application/vnd.apache.arrow.stream";

export interface ArrowSeries {
  labels: string[];
  values: number[];
}

export interface ArrowDevice {
  id: string;
  score: number;
  uptime: number;
  load: string;
  status: string;
  type: string;
  active: boolean;
}

/**
 * Fetch an Arrow IPC stream and return the raw table. Kept separate from the
 * conversion helpers so callers (and tests) can inspect the columnar data.
 */
export async function fetchArrowTable(
  endpoint: string,
  init?: RequestInit
): Promise<Table> {
  const res = await fetch(endpoint, {
    ...init,
    headers: {
      Accept: ARROW_MEDIA_TYPE,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Arrow fetch failed: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  return tableFromIPC(new Uint8Array(buf));
}

/**
 * Convert a `(label, value)` Arrow table into chart-ready arrays. Missing / NaN
 * values are coerced to `0` so downstream ECharts scales never break.
 */
export function tableToSeries(table: Table): ArrowSeries {
  const labelCol = table.getChild("label");
  const valueCol = table.getChild("value");
  const n = table.numRows;
  const labels: string[] = new Array(n);
  const values: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    labels[i] = String(labelCol?.get(i) ?? "");
    const raw = valueCol?.get(i) as number | null | undefined;
    values[i] =
      typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  }
  return { labels, values };
}

/** Convert a `devices` Arrow table into structured device records. */
export function tableToDevices(table: Table): ArrowDevice[] {
  const cols = table.schema.fields.map((f) => f.name);
  const col = (name: string) => table.getChild(name);
  const n = table.numRows;
  const out: ArrowDevice[] = [];

  for (let i = 0; i < n; i++) {
    const at = (name: string) => col(name)?.get(i);
    out.push({
      id: String(at("id") ?? ""),
      score: Number(at("score") ?? 0),
      uptime: Number(at("uptime") ?? 0),
      load: String(at("load") ?? ""),
      status: String(at("status") ?? ""),
      type: String(at("type") ?? ""),
      active: Boolean(at("active") ?? false),
    });
  }
  void cols;
  return out;
}

/** Convenience: fetch + convert a `(label, value)` dataset in one call. */
export async function fetchArrowSeries(
  endpoint: string,
  init?: RequestInit
): Promise<ArrowSeries> {
  return tableToSeries(await fetchArrowTable(endpoint, init));
}
