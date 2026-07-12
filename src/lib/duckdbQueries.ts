import type { ArrowDevice } from "./arrowClient";

/**
 * Pure, side-effect-free SQL builders for the DuckDB-WASM offload.
 *
 * These translate high-level analytical intent (filter / sort / micro-aggregate)
 * into safe SQL that runs *locally in the browser* against a cached `devices`
 * table, keeping that load off the centralized FastAPI/Celery cluster. Column
 * names and sort directions are whitelisted so untrusted UI input can never be
 * injected into the statement.
 */

export type DeviceStatus = ArrowDevice["status"];
export type DeviceType = ArrowDevice["type"];

export interface DeviceQueryOptions {
  status?: DeviceStatus;
  type?: DeviceType;
  minScore?: number;
  maxScore?: number;
  orderBy?: "score" | "uptime" | "id";
  direction?: "ASC" | "DESC";
  limit?: number;
}

// Whitelist of columns we allow in ORDER BY to prevent SQL injection.
const SORTABLE_COLUMNS = new Set(["score", "uptime", "id"]);
// `status`/`type` are enum-like; `min`/`maxScore` are numeric bounds.
const VALID_STATUSES = new Set(["operational", "alert", "flow_controller"]);
const VALID_TYPES = new Set(["Host", "Proxy", "Node"]);

function escapeLike(value: string): string {
  return value.replace(/'/g, "''");
}

/** Build a parameterized-safe WHERE clause (returns "" when no filters). */
export function buildWhereClause(opts: DeviceQueryOptions): string {
  const clauses: string[] = [];

  if (opts.status !== undefined) {
    const s = String(opts.status);
    if (VALID_STATUSES.has(s)) {
      clauses.push(`status = '${s}'`);
    }
  }
  if (opts.type !== undefined) {
    const t = String(opts.type);
    if (VALID_TYPES.has(t)) {
      clauses.push(`type = '${escapeLike(t)}'`);
    }
  }
  if (typeof opts.minScore === "number" && Number.isFinite(opts.minScore)) {
    clauses.push(`score >= ${opts.minScore}`);
  }
  if (typeof opts.maxScore === "number" && Number.isFinite(opts.maxScore)) {
    clauses.push(`score <= ${opts.maxScore}`);
  }

  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

/** Build a safe ORDER BY clause (defaults to score DESC). */
export function buildOrderByClause(opts: DeviceQueryOptions): string {
  const col = SORTABLE_COLUMNS.has(opts.orderBy ?? "")
    ? (opts.orderBy as string)
    : "score";
  const dir = opts.direction === "ASC" ? "ASC" : "DESC";
  return `ORDER BY ${col} ${dir}`;
}

/** Full SELECT used by the DuckDB-WASM worker for client-side analytics. */
export function buildDevicesQuery(opts: DeviceQueryOptions = {}): string {
  const where = buildWhereClause(opts);
  const orderBy = buildOrderByClause(opts);
  const limit =
    typeof opts.limit === "number" && opts.limit > 0
      ? `LIMIT ${Math.trunc(opts.limit)}`
      : "";
  return `SELECT * FROM devices ${where} ${orderBy} ${limit}`.replace(/\s+/g, " ").trim();
}

/** Micro-aggregation: average score + device count grouped by type. */
export function buildAggregateByTypeQuery(opts: DeviceQueryOptions = {}): string {
  const where = buildWhereClause(opts);
  return (
    `SELECT type, COUNT(*) AS device_count, AVG(score) AS avg_score ` +
    `FROM devices ${where} GROUP BY type ORDER BY avg_score DESC`
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** DDL that materializes the cached telemetry into a queryable table. */
export function buildCreateDevicesTableSQL(): string {
  return `
    CREATE OR REPLACE TABLE devices (
      id VARCHAR,
      score DOUBLE,
      uptime DOUBLE,
      load VARCHAR,
      status VARCHAR,
      type VARCHAR,
      active BOOLEAN
    );
  `;
}
