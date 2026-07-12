"""DuckDB service: the primary analytical engine for the dashboard backend.

Pipeline
--------
PostgreSQL (source of truth) -> DuckDB (in-process engine) -> Apache Arrow
(zero-copy) -> UI / LLM.

Pandas has been dropped entirely and Polars is no longer loaded in the dashboard
backend; Polars is scoped to the ML microservice only. DuckDB is the single
in-process engine and it hands data to the frontend/LLM as Apache Arrow for
zero-copy efficiency, avoiding intermediate serialization boundaries.
"""

import os
from pathlib import Path
import duckdb
from typing import Any, List, Dict, Optional
from backend.app.config import settings


class DuckDBService:
    """Service for DuckDB analytical database operations."""

    def __init__(self):
        """Initialize DuckDB connection."""
        db_path = settings.DUCKDB_PATH
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = duckdb.connect(db_path)
        self._postgres_attached = False
        self._initialize_schema()

    def _initialize_schema(self):
        """Initialize DuckDB schema."""
        # Create tables for telemetry data
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY,
                device_id VARCHAR,
                metric_type VARCHAR,
                value DOUBLE,
                timestamp TIMESTAMP,
                metadata JSON
            )
        """)

        # Create table for events
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY,
                event_type VARCHAR,
                source VARCHAR,
                details JSON,
                created_at TIMESTAMP
            )
        """)

    def attach_postgres(self, postgres_url: Optional[str] = None) -> bool:
        """Attach the PostgreSQL database so DuckDB can query it directly.

        Returns True when PostgreSQL was successfully attached, False if the
        extension could not be loaded (e.g. offline environment). Once attached,
        PostgreSQL relations are addressable as ``postgres.<schema>.<table>``.
        """
        if self._postgres_attached:
            return True

        url = postgres_url or settings.DATABASE_URL
        if not url:
            return False

        try:
            self.conn.execute("INSTALL postgres; LOAD postgres;")
            self.conn.execute(f"ATTACH '{url}' AS postgres (TYPE POSTGRES)")
            self._postgres_attached = True
            return True
        except Exception as e:  # pragma: no cover - depends on network/DuckDB build
            raise RuntimeError(f"Failed to attach PostgreSQL to DuckDB: {str(e)}")

    def query(self, sql: str, params: List[Any] = None) -> List[Dict]:
        """Execute a SQL query and return rows as a list of dicts."""
        try:
            if params:
                result = self.conn.execute(sql, params).fetchall()
            else:
                result = self.conn.execute(sql).fetchall()
            return result
        except Exception as e:
            raise RuntimeError(f"DuckDB query failed: {str(e)}")

    def query_to_arrow(self, sql: str, params: List[Any] = None) -> "object":
        """Execute a SQL query and return results as an Apache Arrow table.

        This is the zero-copy path used to hand data straight to the frontend
        or the LLM without materializing intermediate Python/Pandas objects.
        """
        try:
            if params:
                return self.conn.execute(sql, params).fetch_arrow_table()
            return self.conn.execute(sql).fetch_arrow_table()
        except Exception as e:
            raise RuntimeError(f"DuckDB Arrow query failed: {str(e)}")

    def query_to_arrow_ipc(self, sql: str, params: List[Any] = None) -> bytes:
        """Execute a SQL query and return Arrow data as serialized IPC bytes.

        The resulting bytes are an Arrow streaming-format payload that the
        frontend/LLM can deserialize without a copy, keeping the analytics path
        free of Pandas serialization overhead.
        """
        table = self.query_to_arrow(sql, params)
        from pyarrow import ipc
        import io

        sink = io.BytesIO()
        with ipc.new_stream(sink, table.schema) as writer:
            writer.write_table(table)
        return sink.getvalue()

    def english_to_sql(self, sql: str, params: List[Any] = None) -> "object":
        """Run a SQL statement produced by the LLM English-to-SQL feature.

        DuckDB is the primary engine for the natural-language query feature
        because it handles larger-than-memory analytics predictably. The result
        is returned as an Arrow table so the caller can stream it zero-copy to
        the UI or feed it to the LLM.
        """
        return self.query_to_arrow(sql, params)

    def insert_telemetry(self, device_id: str, metric_type: str,
                        value: float, metadata: Dict = None):
        """Insert telemetry data efficiently."""
        self.conn.execute(
            """
            INSERT INTO telemetry (device_id, metric_type, value, timestamp, metadata)
            VALUES (?, ?, ?, NOW(), ?)
            """,
            [device_id, metric_type, value, str(metadata or {})]
        )

    def get_device_metrics(self, device_id: str, limit: int = 1000) -> List[Dict]:
        """Get device metrics efficiently."""
        return self.conn.execute(
            """
            SELECT * FROM telemetry
            WHERE device_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            [device_id, limit]
        ).fetchall()

    def aggregate_metrics(self, metric_type: str,
                         group_by: str = "device_id") -> List[Dict]:
        """Aggregate metrics with grouping."""
        return self.conn.execute(
            f"""
            SELECT
                {group_by},
                COUNT(*) as count,
                AVG(value) as avg_value,
                MIN(value) as min_value,
                MAX(value) as max_value
            FROM telemetry
            WHERE metric_type = ?
            GROUP BY {group_by}
            ORDER BY avg_value DESC
            """,
            [metric_type]
        ).fetchall()

    def export_to_csv(self, query: str, output_path: str):
        """Export query results to CSV."""
        self.conn.execute(f"COPY ({query}) TO '{output_path}' (FORMAT CSV, HEADER TRUE)")

    def close(self):
        """Close database connection."""
        self.conn.close()


# Singleton instance
_duckdb_service = None

def get_duckdb_service() -> DuckDBService:
    """Get or create DuckDB service instance."""
    global _duckdb_service
    if _duckdb_service is None:
        _duckdb_service = DuckDBService()
    return _duckdb_service
