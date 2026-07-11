"""Tests for Gemini integration endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport

from main import app


@pytest.mark.asyncio
async def test_gemini_command_missing_query():
    """Test Gemini command with missing query."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/gemini/command",
            json={"query": "", "currentWidgets": []}
        )
        assert response.status_code == 400


@pytest.mark.asyncio
async def test_gemini_command_emulation():
    """Test Gemini command with emulation (fallback mode)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/gemini/command",
            json={
                "query": "add a chart for temperature",
                "currentWidgets": []
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "aiSummary" in data
        assert "feedbackMessage" in data
        assert "newWidgets" in data
        assert "status" in data


@pytest.mark.asyncio
async def test_gemini_command_add_widget():
    """Test Gemini command to add widget."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/gemini/command",
            json={
                "query": "create a new chart",
                "currentWidgets": []
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["newWidgets"]) > 0


@pytest.mark.asyncio
async def test_gemini_command_remove_widget():
    """Test Gemini command to remove widget."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        current_widgets = [
            {
                "id": "widget1",
                "title": "Widget 1",
                "type": "chart"
            },
            {
                "id": "widget2",
                "title": "Widget 2",
                "type": "chart"
            },
            {
                "id": "widget3",
                "title": "Widget 3",
                "type": "chart"
            }
        ]
        response = await client.post(
            "/api/gemini/command",
            json={
                "query": "remove a widget",
                "currentWidgets": current_widgets
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["newWidgets"]) == len(current_widgets) - 1
      
