"""Pluggable OLAP storage tier for the Gridify analytics backend.

The original backend ran DuckDB as an in-process engine. When many FastAPI pods
run heavy analytical AI requests, a single file-attached ``gridify.duckdb`` per
pod leads to split, un-synchronized, duplicated analytical state.

This module introduces a small engine abstraction so the *heavier* cloud
analytical tier can be backed by a serverless / distributed OLAP engine while
DuckDB remains the local-first engine:

- ``DuckDBOLAPEngine``   : local in-process DuckDB (default, zero infra)
- ``ClickHouseOLAPEngine`` : serverless/distributed ClickHouse over HTTP
- ``MotherDuckOLAPEngine`` : shared cloud DuckDB store (DuckDB wire-compatible)

Select the backend with ``OLAP_BACKEND`` (see :mod:`app.config`).
"""

from __future__ import annotations

from app.services.olap.base import BaseOLAPEngine
from app.services.olap.clickhouse_engine import ClickHouseOLAPEngine
from app.services.olap.duckdb_engine import DuckDBOLAPEngine
from app.services.olap.factory import OLAPBackend, get_olap_engine
from app.services.olap.motherduck_engine import MotherDuckOLAPEngine

__all__ = [
    "BaseOLAPEngine",
    "ClickHouseOLAPEngine",
    "DuckDBOLAPEngine",
    "MotherDuckOLAPEngine",
    "OLAPBackend",
    "get_olap_engine",
]
