"""Strict Pydantic V2 models for the dashboard LLM contract.

The frontend (``src/types.ts``) expects a very specific widget shape. When the
LLM produces widgets, ECharts / Recharts / Framer Motion / React Flow all rely
on that shape being exactly right — a stray field or a wrong type silently
breaks rendering or animation. We therefore validate every LLM response against
these models before returning it to the client.

Design notes
------------
* ``extra="forbid"`` rejects hallucinated fields.
* ``WidgetType`` mirrors the ``Widget["type"]`` union in ``src/types.ts``.
* ``build_gemini_response_schema`` produces an OpenAPI-subset schema that the
  Google GenAI SDK understands as ``response_schema`` for native structured
  output, keeping generation and validation in lock-step.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WidgetType(str, Enum):
    """Allowed widget renderers. Mirrors ``Widget["type"]`` in ``src/types.ts``."""

    LINE = "line"
    BAR = "bar"
    STATUS = "status"
    SUMMARY = "summary"
    ACTIONS = "actions"
    CUSTOM_CHART = "custom_chart"


class WidgetCustomData(BaseModel):
    """Data payload for a dynamically generated ``custom_chart`` widget."""

    model_config = ConfigDict(extra="forbid")

    labels: List[str] = Field(default_factory=list)
    values: List[float] = Field(default_factory=list)
    yAxisLabel: Optional[str] = None

    @field_validator("values")
    @classmethod
    def _finite_values(cls, values: List[float]) -> List[float]:
        """Reject NaN/inf which would break ECharts scales."""
        for v in values:
            if v != v or v in (float("inf"), float("-inf")):
                raise ValueError("chart values must be finite numbers")
        return values


class Widget(BaseModel):
    """A single dashboard widget. Matches the frontend ``Widget`` interface."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=128)
    title: str = Field(min_length=1, max_length=200)
    subtitle: str = Field(default="", max_length=400)
    type: WidgetType
    w: int = Field(default=4, ge=1, le=12)
    h: Optional[int] = Field(default=None, ge=1, le=4000)
    order: int = Field(default=0, ge=0)
    customData: Optional[WidgetCustomData] = None


class DashboardCommandResult(BaseModel):
    """The full validated response for a natural-language dashboard command."""

    model_config = ConfigDict(extra="forbid")

    aiSummary: List[str] = Field(default_factory=list, max_length=8)
    feedbackMessage: str = Field(default="", max_length=600)
    newWidgets: List[Widget] = Field(default_factory=list, max_length=50)
    status: str = Field(default="Nominal", max_length=60)

    @field_validator("aiSummary")
    @classmethod
    def _trim_summary(cls, items: List[str]) -> List[str]:
        # Keep summaries concise and drop empty bullets the model sometimes emits.
        return [s.strip() for s in items if s and s.strip()][:8]


def build_gemini_response_schema() -> Dict[str, Any]:
    """Return an OpenAPI-subset schema for Gemini native structured output.

    The Google GenAI SDK accepts a restricted JSON-schema dialect in
    ``generation_config.response_schema``. We hand-build it here (rather than
    using ``model_json_schema`` which emits ``$ref`` / ``$defs`` the SDK does
    not support) so the model is *constrained* at generation time, not only
    validated afterwards.
    """

    widget_schema: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "title": {"type": "string"},
            "subtitle": {"type": "string"},
            "type": {
                "type": "string",
                "enum": [t.value for t in WidgetType],
            },
            "w": {"type": "integer"},
            "h": {"type": "integer"},
            "order": {"type": "integer"},
            "customData": {
                "type": "object",
                "properties": {
                    "labels": {"type": "array", "items": {"type": "string"}},
                    "values": {"type": "array", "items": {"type": "number"}},
                    "yAxisLabel": {"type": "string"},
                },
            },
        },
        "required": ["id", "title", "type"],
    }

    return {
        "type": "object",
        "properties": {
            "aiSummary": {"type": "array", "items": {"type": "string"}},
            "feedbackMessage": {"type": "string"},
            "newWidgets": {"type": "array", "items": widget_schema},
            "status": {"type": "string"},
        },
        "required": ["aiSummary", "feedbackMessage", "newWidgets"],
    }
