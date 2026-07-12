"""MotherDuck shared cloud OLAP engine (DuckDB wire-compatible).

MotherDuck lets every pod combine local DuckDB querying with a shared, scalable
cloud data store. Because it is DuckDB wire-compatible we reuse the exact same
DuckDB engine — only the connection URL changes to ``md:<database>`` and an
auth token is supplied via ``motherduck_token``.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import duckdb

from app.config import settings
from app.services.olap.base import BaseOLAPEngine


class MotherDuckOLAPEngine(BaseOLAPEngine):
    backend = "motherduck"

    def __init__(
        self,
        database: Optional[str] = None,
        token: Optional[str] = None,
    ):
        database = database or settings.MOTHERDUCK_DATABASE
        token = token or settings.MOTHERDUCK_TOKEN
        if not token:
            raise RuntimeError(
                "MOTHERDUCK_TOKEN is required for the MotherDuck OLAP backend"
            )
        # DuckDB attaches to MotherDuck over the wire using the ``md:`` URL and
        # an auth token kept in a local config file (never logged).
        self.conn = duckdb.connect(f"md:{database}")
        self.conn.execute(f"CREATE SECRET IF NOT EXISTS md_token (TYPE md, TOKEN '{token}')")
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER,
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
                id INTEGER,
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
