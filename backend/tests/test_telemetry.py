"""Tests for telemetry endpoints."""

import pytest
from httpx import AsyncClient, ASGITransport

from main import app


@pytest.mark.asyncio
async def test_health_check():
    """Test health check endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_get_telemetry():
    """Test telemetry data retrieval."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/telemetry")
        assert response.status_code == 200
        data = response.json()
        assert "devices" in data
        assert "temperatureHistory" in data
        assert "humidityHistory" in data
        assert len(data["devices"]) > 0


@pytest.mark.asyncio
async def test_get_devices():
    """Test getting all devices."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/telemetry/devices")
        assert response.status_code == 200
        data = response.json()
        assert "devices" in data
        assert len(data["devices"]) > 0


@pytest.mark.asyncio
async def test_get_device_by_id():
    """Test getting a specific device."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/telemetry/devices/Marchival Arc")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "Marchival Arc"


@pytest.mark.asyncio
async def test_get_device_not_found():
    """Test getting non-existent device."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/telemetry/devices/NonExistent")
        assert response.status_code == 200
        data = response.json()
        assert "error" in data


@pytest.mark.asyncio
async def test_get_temperature_history():
    """Test temperature history retrieval."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/telemetry/metrics/temperature")
        assert response.status_code == 200
        data = response.json()
        assert "temperatureHistory" in data
        assert len(data["temperatureHistory"]) > 0


@pytest.mark.asyncio
async def test_get_humidity_history():
    """Test humidity history retrieval."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/telemetry/metrics/humidity")
        assert response.status_code == 200
        data = response.json()
        assert "humidityHistory" in data
        assert len(data["humidityHistory"]) > 0
      
