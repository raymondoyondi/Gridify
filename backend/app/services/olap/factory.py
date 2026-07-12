"""Factory selecting the active OLAP backend from configuration."""

from __future__ import annotations

import enum
from typing import Optional

from app.config import settings
from app.services.olap.base import BaseOLAPEngine


class OLAPBackend(str, enum.Enum):
    DUCKDB = "duckdb"
    CLICKHOUSE = "clickhouse"
    MOTHERDUCK = "motherduck"


_engines: dict[OLAPBackend, type[BaseOLAPEngine]] = {}

_engine_instance: Optional[BaseOLAPEngine] = None


def _build(backend: OLAPBackend) -> BaseOLAPEngine:
    if backend is OLAPBackend.DUCKDB:
        from app.services.olap.duckdb_engine import DuckDBOLAPEngine

        return DuckDBOLAPEngine()
    if backend is OLAPBackend.CLICKHOUSE:
        from app.services.olap.clickhouse_engine import ClickHouseOLAPEngine

        return ClickHouseOLAPEngine()
    if backend is OLAPBackend.MOTHERDUCK:
        from app.services.olap.motherduck_engine import MotherDuckOLAPEngine

        return MotherDuckOLAPEngine()
    raise ValueError(f"Unknown OLAP backend: {backend}")


def get_olap_engine(backend: Optional[str] = None) -> BaseOLAPEngine:
    """Return the configured OLAP engine singleton.

    Args:
        backend: Optional override for ``OLAP_BACKEND`` (used in tests).
    """
    global _engine_instance
    selected = OLAPBackend((backend or settings.OLAP_BACKEND).lower())
    if _engine_instance is None or _engine_instance.backend != selected.value:
        _engine_instance = _build(selected)
    return _engine_instance


def reset_olap_engine() -> None:
    """Drop the cached singleton (used in tests)."""
    global _engine_instance
    if _engine_instance is not None:
        _engine_instance.close()
    _engine_instance = None
