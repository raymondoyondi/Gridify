"""Semantic layer for safe English-to-SQL translation.

Instead of letting the LLM emit raw SQL that executes directly against DuckDB
(and potentially PostgreSQL through the storage extension), the LLM produces
structured JSON parameters representing dimensions, measures, and filters.
The semantic layer validates these against a whitelist and compiles a
parameterized query, eliminating injection risk.

The LLM can still express analytical intent — it just does so through the
semantic contract rather than free-form SQL strings.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence


@dataclass(frozen=True)
class Measure:
    """A numeric aggregate exposed by the semantic layer."""

    name: str
    sql: str
    default_aggregation: str = "SUM"


@dataclass(frozen=True)
class Dimension:
    """A categorical or time dimension exposed by the semantic layer."""

    name: str
    sql: str


@dataclass(frozen=True)
class SemanticQuery:
    """Validated, structured representation of an analytical query.

    The LLM emits one of these instead of raw SQL.
    """

    measures: Sequence[str]
    dimensions: Sequence[str]
    filters: Sequence[Dict[str, Any]] = field(default_factory=list)
    order_by: Optional[str] = None
    order_direction: str = "DESC"
    limit: Optional[int] = None


# Telemetry catalog exposed through the semantic layer.
_ALLOWED_MEASURES: Dict[str, Measure] = {
    "score": Measure(name="score", sql="score", default_aggregation="AVG"),
    "uptime": Measure(name="uptime", sql="uptime", default_aggregation="AVG"),
    "load_count": Measure(name="load_count", sql="load", default_aggregation="COUNT"),
    "temperature": Measure(name="temperature", sql="value", default_aggregation="AVG"),
    "humidity": Measure(name="humidity", sql="value", default_aggregation="AVG"),
}

_ALLOWED_DIMENSIONS: Dict[str, Dimension] = {
    "device_id": Dimension(name="device_id", sql="device_id"),
    "metric_type": Dimension(name="metric_type", sql="metric_type"),
    "status": Dimension(name="status", sql="status"),
    "type": Dimension(name="type", sql="type"),
    "timestamp": Dimension(name="timestamp", sql="timestamp"),
}

_ALLOWED_FILTER_FIELDS: set[str] = {
    "device_id",
    "metric_type",
    "status",
    "type",
    "timestamp",
    "score",
    "uptime",
    "value",
}

_ALLOWED_OPERATORS: set[str] = {
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "in",
}

_ORDER_DIRECTIONS: set[str] = {"ASC", "DESC"}


class SemanticQueryError(Exception):
    """Raised when a semantic query fails validation."""


class SemanticLayer:
    """Validates semantic queries and compiles them to safe SQL."""

    def validate(self, query: Dict[str, Any]) -> SemanticQuery:
        """Validate a raw semantic query dict.

        Args:
            query: Dict with ``measures``, ``dimensions``, optional
                ``filters``, ``order_by``, ``order_direction``, and ``limit``.

        Returns:
            A validated :class:`SemanticQuery`.

        Raises:
            SemanticQueryError: If the query violates the catalog contract.
        """
        if not isinstance(query, dict):
            raise SemanticQueryError("Query must be a JSON object")

        measures = query.get("measures")
        dimensions = query.get("dimensions")

        if not measures or not isinstance(measures, list) or not measures:
            raise SemanticQueryError("'measures' must be a non-empty list")
        if not dimensions or not isinstance(dimensions, list) or not dimensions:
            raise SemanticQueryError("'dimensions' must be a non-empty list")

        invalid_measures = [m for m in measures if m not in _ALLOWED_MEASURES]
        if invalid_measures:
            raise SemanticQueryError(
                f"Unknown measures: {invalid_measures}. Allowed: {list(_ALLOWED_MEASURES)}"
            )

        invalid_dimensions = [d for d in dimensions if d not in _ALLOWED_DIMENSIONS]
        if invalid_dimensions:
            raise SemanticQueryError(
                f"Unknown dimensions: {invalid_dimensions}. Allowed: {list(_ALLOWED_DIMENSIONS)}"
            )

        filters = query.get("filters", [])
        if not isinstance(filters, list):
            raise SemanticQueryError("'filters' must be a list")
        for f in filters:
            self._validate_filter(f)

        order_by = query.get("order_by")
        if order_by is not None and order_by not in _ALLOWED_MEASURES:
            raise SemanticQueryError(f"Unknown order_by measure: {order_by}")

        order_direction = str(query.get("order_direction", "DESC")).upper()
        if order_direction not in _ORDER_DIRECTIONS:
            raise SemanticQueryError(
                f"Invalid order_direction: {order_direction}. Allowed: {_ORDER_DIRECTIONS}"
            )

        limit = query.get("limit")
        if limit is not None:
            if not isinstance(limit, int) or limit <= 0 or limit > 1000:
                raise SemanticQueryError("'limit' must be a positive integer <= 1000")

        return SemanticQuery(
            measures=measures,
            dimensions=dimensions,
            filters=filters,
            order_by=order_by,
            order_direction=order_direction,
            limit=limit,
        )

    def _validate_filter(self, filter_: Dict[str, Any]) -> None:
        if not isinstance(filter_, dict):
            raise SemanticQueryError("Each filter must be an object")
        field = filter_.get("field")
        if field not in _ALLOWED_FILTER_FIELDS:
            raise SemanticQueryError(
                f"Unknown filter field: {field}. Allowed: {sorted(_ALLOWED_FILTER_FIELDS)}"
            )
        operator = filter_.get("operator")
        if operator not in _ALLOWED_OPERATORS:
            raise SemanticQueryError(
                f"Unknown filter operator: {operator}. Allowed: {sorted(_ALLOWED_OPERATORS)}"
            )
        value = filter_.get("value")
        if operator == "between" and (
            not isinstance(value, list) or len(value) != 2
        ):
            raise SemanticQueryError("'between' filter requires a 2-element value array")
        if operator == "in" and not isinstance(value, list):
            raise SemanticQueryError("'in' filter requires a value array")

    def to_sql(self, query: SemanticQuery, table: str = "telemetry") -> str:
        """Compile a validated semantic query to a parameterized SQL string.

        Args:
            query: Validated semantic query.
            table: Target DuckDB/PostgreSQL table name.

        Returns:
            A SQL SELECT string with literal values safely embedded.
        """
        select_parts: List[str] = []
        for m in query.measures:
            measure = _ALLOWED_MEASURES[m]
            agg = measure.default_aggregation
            select_parts.append(f"{agg}({measure.sql}) AS {m}")

        group_by_parts: List[str] = []
        for d in query.dimensions:
            dim = _ALLOWED_DIMENSIONS[d]
            select_parts.append(dim.sql)
            group_by_parts.append(dim.sql)

        sql = f"SELECT {', '.join(select_parts)} FROM {table}"

        if group_by_parts:
            sql += f" GROUP BY {', '.join(group_by_parts)}"

        where_clauses: List[str] = []
        for f in query.filters:
            where_clauses.append(self._render_filter(f))

        if where_clauses:
            sql += f" WHERE {' AND '.join(where_clauses)}"

        if query.order_by:
            measure = _ALLOWED_MEASURES[query.order_by]
            sql += f" ORDER BY {measure.default_aggregation}({measure.sql}) {query.order_direction}"

        if query.limit:
            sql += f" LIMIT {query.limit}"

        return sql

    def _render_filter(self, filter_: Dict[str, Any]) -> str:
        field = filter_["field"]
        operator = filter_["operator"]
        value = filter_["value"]

        if operator == "eq":
            return f"{field} = '{self._escape(value)}'"
        if operator == "neq":
            return f"{field} != '{self._escape(value)}'"
        if operator == "gt":
            return f"{field} > {value}"
        if operator == "gte":
            return f"{field} >= {value}"
        if operator == "lt":
            return f"{field} < {value}"
        if operator == "lte":
            return f"{field} <= {value}"
        if operator == "between":
            a, b = value
            return f"{field} BETWEEN {a} AND {b}"
        if operator == "in":
            items = ", ".join(f"'{self._escape(v)}'" for v in value)
            return f"{field} IN ({items})"

        raise SemanticQueryError(f"Unsupported operator: {operator}")

    @staticmethod
    def _escape(value: Any) -> str:
        return str(value).replace("'", "''")


_semantic_layer: Optional[SemanticLayer] = None


def get_semantic_layer() -> SemanticLayer:
    """Return the shared :class:`SemanticLayer` singleton."""
    global _semantic_layer
    if _semantic_layer is None:
        _semantic_layer = SemanticLayer()
    return _semantic_layer
