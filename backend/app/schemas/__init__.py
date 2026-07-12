"""Pydantic V2 schemas for strict, validated LLM structured outputs.

These models are the single source of truth for the shape of data the LLM is
allowed to return. Enforcing them with Pydantic V2 (``extra="forbid"`` +
type coercion off for the critical fields) prevents malformed UI schemas from
ever reaching the frontend, where they would otherwise break Framer Motion
animations or React Flow layouts.
"""

from app.schemas.dashboard import (
    DashboardCommandResult,
    Widget,
    WidgetCustomData,
    WidgetType,
    build_gemini_response_schema,
)

__all__ = [
    "DashboardCommandResult",
    "Widget",
    "WidgetCustomData",
    "WidgetType",
    "build_gemini_response_schema",
]
