"""Tests for the strict Pydantic V2 dashboard schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.dashboard import (
    DashboardCommandResult,
    Widget,
    WidgetType,
    build_gemini_response_schema,
)


def test_valid_widget():
    w = Widget(id="w1", title="Temp", type="line", w=4, order=1)
    assert w.type is WidgetType.LINE


def test_widget_rejects_unknown_type():
    with pytest.raises(ValidationError):
        Widget(id="w1", title="Temp", type="pie", w=4, order=1)


def test_widget_forbids_extra_fields():
    with pytest.raises(ValidationError):
        Widget(id="w1", title="Temp", type="line", w=4, order=1, hacked=True)


def test_widget_column_span_bounds():
    with pytest.raises(ValidationError):
        Widget(id="w1", title="Temp", type="line", w=99, order=1)


def test_custom_data_rejects_non_finite():
    with pytest.raises(ValidationError):
        Widget(
            id="w1",
            title="V",
            type="custom_chart",
            w=2,
            order=1,
            customData={"labels": ["a"], "values": [float("inf")]},
        )


def test_command_result_trims_empty_summaries():
    result = DashboardCommandResult(
        aiSummary=["  keep ", "", "   ", "also keep"],
        feedbackMessage="ok",
        newWidgets=[],
    )
    assert result.aiSummary == ["keep", "also keep"]


def test_command_result_full_roundtrip():
    payload = {
        "aiSummary": ["insight one"],
        "feedbackMessage": "Added a chart",
        "newWidgets": [
            {
                "id": "custom_1",
                "title": "Sensor Voltage",
                "subtitle": "generated",
                "type": "custom_chart",
                "w": 2,
                "h": 300,
                "order": 1,
                "customData": {
                    "labels": ["00:00", "04:00"],
                    "values": [3.3, 3.2],
                    "yAxisLabel": "Volts",
                },
            }
        ],
        "status": "Nominal",
    }
    result = DashboardCommandResult.model_validate(payload)
    assert result.newWidgets[0].customData.values == [3.3, 3.2]


def test_gemini_response_schema_shape():
    schema = build_gemini_response_schema()
    assert schema["type"] == "object"
    assert "newWidgets" in schema["properties"]
    widget_props = schema["properties"]["newWidgets"]["items"]["properties"]
    assert set(WidgetType.__members__.values()).issubset(
        set(WidgetType(t) for t in widget_props["type"]["enum"])
    )
