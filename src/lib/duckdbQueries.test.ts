import { describe, it, expect } from "vitest";
import {
  buildWhereClause,
  buildOrderByClause,
  buildDevicesQuery,
  buildAggregateByTypeQuery,
  buildCreateDevicesTableSQL,
} from "./duckdbQueries";

describe("duckdbQueries builders", () => {
  it("builds empty WHERE when no filters", () => {
    expect(buildWhereClause({})).toBe("");
  });

  it("builds a safe filter clause for valid enums", () => {
    const sql = buildWhereClause({ status: "alert", type: "Host", minScore: 10, maxScore: 40 });
    expect(sql).toContain("status = 'alert'");
    expect(sql).toContain("type = 'Host'");
    expect(sql).toContain("score >= 10");
    expect(sql).toContain("score <= 40");
  });

  it("ignores invalid enum values (injection guard)", () => {
    const sql = buildWhereClause({ status: "x'; DROP TABLE devices;--" as never });
    expect(sql).toBe("");
  });

  it("defaults ORDER BY to score DESC", () => {
    expect(buildOrderByClause({})).toBe("ORDER BY score DESC");
  });

  it("whitelists sort columns", () => {
    expect(buildOrderByClause({ orderBy: "uptime", direction: "ASC" })).toBe("ORDER BY uptime ASC");
    // unknown column falls back to whitelisted default
    expect(buildOrderByClause({ orderBy: "score; DROP" as never })).toBe("ORDER BY score DESC");
  });

  it("assembles a full SELECT", () => {
    const q = buildDevicesQuery({ status: "operational", orderBy: "uptime", direction: "ASC", limit: 5 });
    expect(q).toBe("SELECT * FROM devices WHERE status = 'operational' ORDER BY uptime ASC LIMIT 5");
  });

  it("omits LIMIT when not positive", () => {
    const q = buildDevicesQuery({ limit: 0 });
    expect(q).not.toContain("LIMIT");
  });

  it("builds a grouped aggregate query", () => {
    const q = buildAggregateByTypeQuery({ status: "alert" });
    expect(q).toContain("GROUP BY type");
    expect(q).toContain("AVG(score) AS avg_score");
    expect(q).toContain("WHERE status = 'alert'");
  });

  it("creates a devices table with the cached schema", () => {
    const ddl = buildCreateDevicesTableSQL();
    expect(ddl).toContain("CREATE OR REPLACE TABLE devices");
    expect(ddl).toContain("active BOOLEAN");
  });
});
