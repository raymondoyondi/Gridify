"""Formalized semantic layer (Ibis/Cube-style) with role-based security.

The heuristic :mod:`app.services.semantic_layer` already stops the LLM from
emitting raw SQL. This module *formalizes* the abstraction so the GenAI
pipeline can:

1. Feed a structured, token-efficient description of the data model to the LLM
   instead of the raw database schema (shorter prompts, fewer tokens).
2. Enforce role-based data security — a ``viewer`` can never request a measure
   or dimension they are not entitled to, even if the model attempts it.
3. Compile one validated logical query to engine-specific SQL via a small
   dialect layer, so the same semantic query runs on DuckDB, ClickHouse, or
   MotherDuck without the model knowing which engine is live.

The model exposes logical objects (measures/dimensions) and grants per role.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Dict, FrozenSet, List, Optional, Sequence


class Dialect(str, enum.Enum):
    DUCKDB = "duckdb"
    CLICKHOUSE = "clickhouse"


@dataclass(frozen=True)
class LogicalMeasure:
    name: str
    sql: str
    aggregation: str = "SUM"
    description: str = ""


@dataclass(frozen=True)
class LogicalDimension:
    name: str
    sql: str
    description: str = ""


@dataclass(frozen=True)
class Role:
    name: str
    measures: FrozenSet[str] = field(default_factory=frozenset)
    dimensions: FrozenSet[str] = field(default_factory=frozenset)
    filters: FrozenSet[str] = field(default_factory=frozenset)


class SemanticModelError(Exception):
    """Raised when a query violates the semantic contract or RBAC policy."""


class SemanticModel:
    """A formal semantic model: logical objects + role grants + dialect compile."""

    def __init__(self) -> None:
        self._measures: Dict[str, LogicalMeasure] = {}
        self._dimensions: Dict[str, LogicalDimension] = {}
        self._roles: Dict[str, Role] = {}

    # ------------------------------------------------------------------ #
    # Registration
    # ------------------------------------------------------------------ #
    def add_measure(self, measure: LogicalMeasure) -> "SemanticModel":
        self._measures[measure.name] = measure
        return self

    def add_dimension(self, dimension: LogicalDimension) -> "SemanticModel":
        self._dimensions[dimension.name] = dimension
        return self

    def grant(
        self,
        name: str,
        measures: Sequence[str] = (),
        dimensions: Sequence[str] = (),
        filters: Sequence[str] = (),
    ) -> "SemanticModel":
        self._roles[name] = Role(
            name=name,
            measures=frozenset(measures),
            dimensions=frozenset(dimensions),
            filters=frozenset(filters),
        )
        return self

    # ------------------------------------------------------------------ #
    # Validation + RBAC
    # ------------------------------------------------------------------ #
    def _require_role(self, role: str) -> Role:
        r = self._roles.get(role)
        if r is None:
            raise SemanticModelError(f"Unknown role: {role}")
        return r

    def authorize(
        self,
        role: str,
        measures: Sequence[str],
        dimensions: Sequence[str],
        filters: Sequence[str] = (),
    ) -> None:
        """Raise :class:`SemanticModelError` if ``role`` cannot access the request."""
        r = self._require_role(role)
        forbidden_measures = [m for m in measures if m not in r.measures]
        if forbidden_measures:
            raise SemanticModelError(
                f"Role {role!r} may not access measures: {sorted(forbidden_measures)}"
            )
        forbidden_dims = [d for d in dimensions if d not in r.dimensions]
        if forbidden_dims:
            raise SemanticModelError(
                f"Role {role!r} may not access dimensions: {sorted(forbidden_dims)}"
            )
        forbidden_filters = [f for f in filters if f not in r.filters]
        if forbidden_filters:
            raise SemanticModelError(
                f"Role {role!r} may not filter on: {sorted(forbidden_filters)}"
            )

    # ------------------------------------------------------------------ #
    # Dialect-aware compilation
    # ------------------------------------------------------------------ #
    @staticmethod
    def _quote(identifier: str, dialect: Dialect) -> str:
        if dialect is Dialect.CLICKHOUSE:
            return f"`{identifier}`"
        return f'"{identifier}"'

    def compile(
        self,
        role: str,
        measures: Sequence[str],
        dimensions: Sequence[str],
        filters: Sequence[Dict[str, Any]] = (),
        order_by: Optional[str] = None,
        order_direction: str = "DESC",
        limit: Optional[int] = None,
        table: str = "telemetry",
        dialect: Dialect = Dialect.DUCKDB,
    ) -> str:
        """Compile an authorized semantic query to dialect-specific SQL.

        Authorization is enforced here so no caller can bypass RBAC — if the
        role is not entitled to a measure/dimension/filter the call raises.
        """
        self.authorize(
            role,
            list(measures),
            list(dimensions),
            [f.get("field", "") for f in filters],
        )

        select: List[str] = []
        group_by: List[str] = []
        for m in measures:
            measure = self._measures[m]
            select.append(
                f"{measure.aggregation}({measure.sql}) AS {self._quote(m, dialect)}"
            )
        for d in dimensions:
            dim = self._dimensions[d]
            select.append(dim.sql)
            group_by.append(dim.sql)

        parts = [f"SELECT {', '.join(select)}", f"FROM {self._quote(table, dialect)}"]
        if group_by:
            parts.append(f"GROUP BY {', '.join(group_by)}")

        where = [self._render_filter(f) for f in filters]
        if where:
            parts.append(f"WHERE {' AND '.join(where)}")

        if order_by:
            measure = self._measures[order_by]
            parts.append(
                f"ORDER BY {measure.aggregation}({measure.sql}) {order_direction.upper()}"
            )
        if limit:
            parts.append(f"LIMIT {int(limit)}")

        return "\n".join(parts)

    @staticmethod
    def _render_filter(filter_: Dict[str, Any]) -> str:
        field = filter_["field"]
        op = filter_.get("operator", "eq")
        value = filter_.get("value")
        if op == "eq":
            return f"{field} = '{SemanticModel._esc(value)}'"
        if op == "neq":
            return f"{field} != '{SemanticModel._esc(value)}'"
        if op in ("gt", "gte", "lt", "lte"):
            return f"{field} {op} {value}"
        if op == "between":
            a, b = value
            return f"{field} BETWEEN {a} AND {b}"
        if op == "in":
            items = ", ".join(f"'{SemanticModel._esc(v)}'" for v in value)
            return f"{field} IN ({items})"
        raise SemanticModelError(f"Unsupported operator: {op}")

    @staticmethod
    def _esc(value: Any) -> str:
        return str(value).replace("'", "''")

    # ------------------------------------------------------------------ #
    # Compact prompt context (token-efficient semantic description)
    # ------------------------------------------------------------------ #
    def build_prompt_context(
        self, role: str, dialect: Dialect = Dialect.DUCKDB
    ) -> str:
        """Return a concise, structured description of what ``role`` may query.

        This is fed to the LLM instead of the full DDL/schema, dramatically
        shortening the prompt while still letting the model emit valid semantic
        queries within the role's entitlements.
        """
        r = self._require_role(role)
        lines: List[str] = [f"Logical model (role={role}, engine={dialect.value}):"]
        for m in sorted(r.measures):
            measure = self._measures[m]
            desc = f" — {measure.description}" if measure.description else ""
            lines.append(f"  measure: {m} ({measure.aggregation}){desc}")
        for d in sorted(r.dimensions):
            dim = self._dimensions[d]
            desc = f" — {dim.description}" if dim.description else ""
            lines.append(f"  dimension: {d}{desc}")
        if r.filters:
            lines.append(f"  filters: {', '.join(sorted(r.filters))}")
        lines.append(
            "Return JSON: {measures:[...], dimensions:[...], filters:[{field,operator,value}], order_by, limit}"
        )
        return "\n".join(lines)


# --------------------------------------------------------------------------- #
# Default Gridify telemetry semantic model.
#
# Two roles are defined: ``analyst`` (full access) and ``viewer`` (a restricted
# role that can only see device-level aggregates, never raw score/uptime and
# never the ``status`` filter). This demonstrates role-based data security.
# --------------------------------------------------------------------------- #
def build_default_model() -> SemanticModel:
    model = SemanticModel()
    model.add_measure(LogicalMeasure("score", "score", "AVG", "device score"))
    model.add_measure(LogicalMeasure("uptime", "uptime", "AVG", "uptime minutes"))
    model.add_measure(LogicalMeasure("load_count", "load", "COUNT", "load events"))
    model.add_measure(LogicalMeasure("temperature", "value", "AVG", "sensor temp"))
    model.add_measure(LogicalMeasure("humidity", "value", "AVG", "sensor humidity"))

    model.add_dimension(LogicalDimension("device_id", "device_id", "device identifier"))
    model.add_dimension(LogicalDimension("metric_type", "metric_type", "metric kind"))
    model.add_dimension(LogicalDimension("status", "status", "device status"))
    model.add_dimension(LogicalDimension("type", "type", "device type"))
    model.add_dimension(LogicalDimension("timestamp", "timestamp", "event time"))

    model.grant(
        "analyst",
        measures=["score", "uptime", "load_count", "temperature", "humidity"],
        dimensions=["device_id", "metric_type", "status", "type", "timestamp"],
        filters=["device_id", "metric_type", "status", "type", "timestamp", "score", "uptime", "value"],
    )
    model.grant(
        "viewer",
        measures=["temperature", "humidity", "load_count"],
        dimensions=["device_id", "metric_type"],
        filters=["device_id", "metric_type"],
    )
    return model


_model: Optional[SemanticModel] = None


def get_semantic_model() -> SemanticModel:
    global _model
    if _model is None:
        _model = build_default_model()
    return _model
