"""Local DuckDB OLAP engine (default, zero-infra analytical tier)."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb

from app.config import settings
from app.services.olap.base import BaseOLAPEngine


class DuckDBOLAPEngine(BaseOLAPEngine):
    """In-process DuckDB engine.

    Reuses the existing DuckDB schema bootstrap so local-first behaviour is
    unchanged. This is the engine selected by ``OLAP_BACKEND=duckdb``.
    """

    backend = "duckdb"

    def __init__(self, db_path: Optional[str] = None):
        db_path = db_path or settings.DUCKDB_PATH
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = duckdb.connect(db_path)
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY,
                device_id VARCHAR,
                metric_type VARCHAR,
                value DOUBLE,
                timestamp TIMESTAMP,
                metadata JSON
            )
            """
        )
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY,
                event_type VARCHAR,
                source VARCHAR,
                details JSON,
                created_at TIMESTAMP
            )
            """
        )

    def query(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        if params:
            rows = self.conn.execute(sql, params).fetchall()
        else:
            rows = self.conn.execute(sql).fetchall()
        columns = [d[0] for d in self.conn.description]
        return [dict(zip(columns, row)) for row in rows]

    def query_to_arrow(self, sql: str, params: Optional[List[Any]] = None):
        if params:
            return self.conn.execute(sql, params).fetch_arrow_table()
        return self.conn.execute(sql).fetch_arrow_table()

    def health(self) -> bool:
        try:
            self.conn.execute("SELECT 1").fetchone()
            return True
        except Exception:
            return False

    def close(self) -> None:
        try:
            self.conn.close()
        except Exception:
            pass
