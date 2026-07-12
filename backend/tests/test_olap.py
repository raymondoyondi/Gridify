"""Tests for the pluggable OLAP storage tier."""

import pytest

from app.services.olap.base import BaseOLAPEngine
from app.services.olap.clickhouse_engine import ClickHouseOLAPEngine
from app.services.olap.duckdb_engine import DuckDBOLAPEngine
from app.services.olap.factory import OLAPBackend, get_olap_engine, reset_olap_engine


def test_duckdb_engine_roundtrip(tmp_path):
    engine = DuckDBOLAPEngine(db_path=str(tmp_path / "gridify.duckdb"))
    engine.query(
        "INSERT INTO telemetry (id, device_id, metric_type, value) "
        "VALUES (1, 'dev-1', 'temperature', 21.5)"
    )
    rows = engine.query("SELECT device_id, value FROM telemetry WHERE id = 1")
    assert rows == [{"device_id": "dev-1", "value": 21.5}]
    assert engine.health() is True
    table = engine.query_to_arrow("SELECT value FROM telemetry")
    assert table.num_rows == 1
    engine.close()


def test_duckdb_engine_is_base_instance():
    engine = DuckDBOLAPEngine(db_path=":memory:")
    assert isinstance(engine, BaseOLAPEngine)
    engine.close()


def test_clickhouse_engine_binds_parameters():
    assert (
        ClickHouseOLAPEngine._bind("WHERE id = ? AND name = ?", [3, "dev"])
        == "WHERE id = 3 AND name = 'dev'"
    )


def test_clickhouse_engine_literal_escaping():
    assert ClickHouseOLAPEngine._literal(None) == "NULL"
    assert ClickHouseOLAPEngine._literal(True) == "1"
    assert ClickHouseOLAPEngine._literal("a'b") == "'a\\'b'"


def test_factory_returns_duckdb_by_default(monkeypatch, tmp_path):
    monkeypatch.setattr("app.config.settings.OLAP_BACKEND", "duckdb")
    monkeypatch.setattr("app.config.settings.DUCKDB_PATH", str(tmp_path / "g.duckdb"))
    reset_olap_engine()
    engine = get_olap_engine()
    try:
        assert engine.backend == OLAPBackend.DUCKDB.value
    finally:
        reset_olap_engine()


def test_factory_selects_clickhouse(monkeypatch):
    reset_olap_engine()

    class FakeClient:
        def post(self, *args, **kwargs):
            return type("Resp", (), {"raise_for_status": lambda: None})()
        def close(self):
            pass

    monkeypatch.setattr(
        "app.services.olap.clickhouse_engine.httpx.Client",
        lambda **kw: FakeClient(),
    )
    engine = get_olap_engine(backend="clickhouse")
    assert engine.backend == OLAPBackend.CLICKHOUSE.value
    engine.close()
    reset_olap_engine()


def test_factory_rejects_unknown_backend():
    reset_olap_engine()
    with pytest.raises(ValueError):
        get_olap_engine(backend="cassandra")
    reset_olap_engine()
