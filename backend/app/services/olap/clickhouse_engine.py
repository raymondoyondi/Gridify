"""Serverless / distributed ClickHouse OLAP engine (HTTP interface).

ClickHouse gives the FastAPI cluster an industry-standard concurrent multi-user
analytical tier. Every pod talks to the *same* ClickHouse service over HTTP, so
heavy analytical AI requests stay synchronized instead of forking into separate
local ``gridify.duckdb`` files.

Only the lightweight ClickHouse HTTP interface is used (no native driver), so
the engine is installable with the existing ``httpx`` dependency.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.services.olap.base import BaseOLAPEngine


class ClickHouseOLAPEngine(BaseOLAPEngine):
    backend = "clickhouse"

    def __init__(
        self,
        url: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.url = (url or settings.CLICKHOUSE_URL).rstrip("/")
        self.user = user or settings.CLICKHOUSE_USER
        self.password = password or settings.CLICKHOUSE_PASSWORD
        self.database = database or settings.CLICKHOUSE_DATABASE
        self.timeout = timeout
        self._client = httpx.Client(
            base_url=self.url,
            timeout=self.timeout,
            params={"user": self.user, "password": self.password, "database": self.database},
        )
        self._initialize_schema()

    def _query_http(self, sql: str) -> List[Dict[str, Any]]:
        resp = self._client.post(
            "/",
            params={"query": sql, "default_format": "JSONEachRow"},
        )
        resp.raise_for_status()
        if not resp.text.strip():
            return []
        return [self._coerce(row) for row in resp.text.strip().split("\n") if row]

    @staticmethod
    def _coerce(line: str) -> Dict[str, Any]:
        import json

        return json.loads(line)

    def _initialize_schema(self) -> None:
        for stmt in (
            """
            CREATE TABLE IF NOT EXISTS telemetry (
                id UInt32,
                device_id String,
                metric_type String,
                value Float64,
                timestamp DateTime,
                metadata String
            ) ENGINE = MergeTree() ORDER BY (device_id, timestamp)
            """,
            """
            CREATE TABLE IF NOT EXISTS events (
                id UInt32,
                event_type String,
                source String,
                details String,
                created_at DateTime
            ) ENGINE = MergeTree() ORDER BY (event_type, created_at)
            """,
        ):
            self._client.post("/", params={"query": stmt}).raise_for_status()

    def query(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        if params:
            sql = self._bind(sql, params)
        return self._query_http(sql)

    def query_to_arrow(self, sql: str, params: Optional[List[Any]] = None):
        import pyarrow as pa

        rows = self.query(sql, params)
        if not rows:
            return pa.table({})
        columns: Dict[str, list] = {k: [] for k in rows[0].keys()}
        for row in rows:
            for k, v in row.items():
                columns[k].append(v)
        return pa.table(columns)

    def health(self) -> bool:
        try:
            resp = self._client.post("/", params={"query": "SELECT 1"})
            resp.raise_for_status()
            return True
        except Exception:
            return False

    @staticmethod
    def _bind(sql: str, params: List[Any]) -> str:
        """Positional ``?`` binding for simple literals (ClickHouse HTTP).

        Values are escaped and wrapped as SQL literals. This is sufficient for
        telemetry-style parameters; complex payloads should use the native
        client with parameterized statements.
        """
        out: List[str] = []
        idx = 0
        for ch in sql:
            if ch == "?" and idx < len(params):
                out.append(ClickHouseOLAPEngine._literal(params[idx]))
                idx += 1
            else:
                out.append(ch)
        return "".join(out)

    @staticmethod
    def _literal(value: Any) -> str:
        if value is None:
            return "NULL"
        if isinstance(value, bool):
            return "1" if value else "0"
        if isinstance(value, (int, float)):
            return str(value)
        return "'" + str(value).replace("'", "\\'") + "'"

    def close(self) -> None:
        try:
            self._client.close()
        except Exception:
            pass
