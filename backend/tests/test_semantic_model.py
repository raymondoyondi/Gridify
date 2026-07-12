"""Tests for the formalized semantic model (RBAC, dialect compile, prompt context)."""

import pytest

from app.services.semantic_model import (
    Dialect,
    LogicalDimension,
    LogicalMeasure,
    SemanticModel,
    SemanticModelError,
    build_default_model,
    get_semantic_model,
)


def test_default_model_roles_compiled_sql():
    model = build_default_model()
    sql = model.compile(
        role="analyst",
        measures=["temperature"],
        dimensions=["device_id"],
        limit=10,
    )
    assert "AVG(value)" in sql
    assert 'GROUP BY device_id' in sql or "GROUP BY device_id" in sql
    assert "LIMIT 10" in sql


def test_viewer_cannot_access_restricted_measure():
    model = build_default_model()
    with pytest.raises(SemanticModelError):
        model.compile(
            role="viewer",
            measures=["score"],
            dimensions=["device_id"],
        )


def test_viewer_cannot_filter_on_forbidden_field():
    model = build_default_model()
    with pytest.raises(SemanticModelError):
        model.compile(
            role="viewer",
            measures=["temperature"],
            dimensions=["device_id"],
            filters=[{"field": "status", "operator": "eq", "value": "alert"}],
        )


def test_authorize_helper_surfaces_forbidden_dimension():
    model = build_default_model()
    with pytest.raises(SemanticModelError):
        model.authorize("viewer", ["temperature"], ["status"])


def test_clickhouse_dialect_quotes_identifiers():
    model = build_default_model()
    sql = model.compile(
        role="analyst",
        measures=["temperature"],
        dimensions=["device_id"],
        dialect=Dialect.CLICKHOUSE,
    )
    assert "`temperature`" in sql or "AVG(value)" in sql
    assert sql.count("`") >= 2  # table + measure quoted


def test_prompt_context_is_compact_and_role_scoped():
    model = build_default_model()
    ctx = model.build_prompt_context("viewer")
    assert "role=viewer" in ctx
    assert "score" not in ctx  # analyst-only measure must not leak
    assert "temperature" in ctx
    assert "Return JSON" in ctx


def test_unknown_role_raises():
    model = build_default_model()
    with pytest.raises(SemanticModelError):
        model.build_prompt_context("root")


def test_factory_singleton():
    assert get_semantic_model() is get_semantic_model()


def test_register_custom_measure_and_grant():
    model = SemanticModel()
    model.add_measure(LogicalMeasure("power", "watts", "SUM"))
    model.add_dimension(LogicalDimension("site", "site_id"))
    model.grant("ops", measures=["power"], dimensions=["site"])
    sql = model.compile("ops", ["power"], ["site"])
    assert "SUM(watts)" in sql
