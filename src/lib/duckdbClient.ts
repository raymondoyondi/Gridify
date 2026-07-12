import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import { tableFromArrays } from "apache-arrow";

import type { ArrowDevice } from "./arrowClient";
import {
  buildAggregateByTypeQuery,
  buildCreateDevicesTableSQL,
  buildDevicesQuery,
  type DeviceQueryOptions,
} from "./duckdbQueries";

/**
 * Client-side analytical engine powered by DuckDB-WASM.
 *
 * Instead of round-tripping every filter / sort / micro-aggregation to the
 * centralized FastAPI + Celery cluster, we instantiate DuckDB *inside a web
 * worker* and point it at the telemetry the app has already cached locally. The
 * worker owns all query execution, so the main thread stays free for LLM
 * generation and heavier ML work. Results come back as Apache Arrow tables and are
 * sliced straight into chart datasets.
 */

const BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: duckdb_wasm, mainWorker: mvp_worker },
  eh: { mainModule: duckdb_wasm, mainWorker: eh_worker },
};

export interface TypeAggregate {
  type: string;
  device_count: number;
  avg_score: number;
}

export class DuckDBAnalytics {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private ready: Promise<void> | null = null;

  /** Lazily instantiate DuckDB in a worker. Safe to call repeatedly. */
  init(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const bundle = await duckdb.selectBundle(BUNDLES);
      if (!bundle.mainWorker) {
        throw new Error("DuckDB-WASM bundle is missing a worker URL");
      }
      const worker = new Worker(bundle.mainWorker);
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      this.conn = await this.db.connect();
      await this.conn.query(buildCreateDevicesTableSQL());
    })();
    return this.ready;
  }

  /** Materialize the cached telemetry into the local `devices` table. */
  async loadDevices(devices: ArrowDevice[]): Promise<void> {
    await this.init();
    const conn = this.conn!;
    const table = arrowDevicesToTable(devices);
    await conn.insertArrowTable(table as never, { name: "devices" });
  }

  /** Run a filter/sort/limit query locally and return structured rows. */
  async runDevicesQuery(opts: DeviceQueryOptions = {}): Promise<ArrowDevice[]> {
    await this.init();
    const result = await this.conn!.query(buildDevicesQuery(opts));
    return arrowTableToDevices(result);
  }

  /** Run the grouped micro-aggregation locally. */
  async runAggregateByType(opts: DeviceQueryOptions = {}): Promise<TypeAggregate[]> {
    await this.init();
    const result = await this.conn!.query(buildAggregateByTypeQuery(opts));
    return result.toArray().map((row) => ({
      type: String((row as Record<string, unknown>).type ?? ""),
      device_count: Number((row as Record<string, unknown>).device_count ?? 0),
      avg_score: Number((row as Record<string, unknown>).avg_score ?? 0),
    }));
  }

  async close(): Promise<void> {
    await this.conn?.close();
    this.db?.terminate();
    this.ready = null;
  }
}

// `insertArrowTable` expects the apache-arrow Table bundled *inside*
// duckdb-wasm. We build the table with the top-level `apache-arrow` (shared by
// the Arrow IPC client) and hand it over as `any` — the two Arrow builds are
// structurally identical at runtime, so the cast is safe.
function arrowDevicesToTable(devices: ArrowDevice[]): any {
  return tableFromArrays({
    id: devices.map((d) => d.id),
    score: devices.map((d) => d.score),
    uptime: devices.map((d) => d.uptime),
    load: devices.map((d) => d.load),
    status: devices.map((d) => d.status),
    type: devices.map((d) => d.type),
    active: devices.map((d) => d.active),
  });
}

function arrowTableToDevices(table: any): ArrowDevice[] {
  return table.toArray().map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      score: Number(r.score ?? 0),
      uptime: Number(r.uptime ?? 0),
      load: String(r.load ?? ""),
      status: String(r.status ?? ""),
      type: String(r.type ?? ""),
      active: Boolean(r.active ?? false),
    };
  });
}

/** Shared singleton so every view hits the same in-browser database. */
export const duckDBAnalytics = new DuckDBAnalytics();
