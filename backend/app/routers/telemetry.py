"""Telemetry endpoints for Gridify dashboard."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from typing import Dict, Any

from app.utils.telemetry_data import get_default_telemetry
from app.utils.logger import setup_logger
from app.services import arrow_service as arrow

logger = setup_logger(__name__)
router = APIRouter()


@router.get("/telemetry")
async def get_telemetry() -> Dict[str, Any]:
    """Get current telemetry data.
    
    Returns:
        Dictionary containing device metrics and historical data.
    """
    logger.info("Telemetry endpoint called")
    return get_default_telemetry()


@router.get("/telemetry/devices")
async def get_devices() -> Dict[str, Any]:
    """Get list of all devices.
    
    Returns:
        Dictionary containing device list.
    """
    telemetry = get_default_telemetry()
    logger.info(f"Retrieved {len(telemetry['devices'])} devices")
    return {"devices": telemetry["devices"]}


@router.get("/telemetry/devices/{device_id}")
async def get_device(device_id: str) -> Dict[str, Any]:
    """Get specific device by ID.
    
    Args:
        device_id: The ID of the device to retrieve.
        
    Returns:
        Device information or error if not found.
    """
    telemetry = get_default_telemetry()
    device = next(
        (d for d in telemetry["devices"] if d["id"] == device_id),
        None
    )
    
    if not device:
        logger.warning(f"Device {device_id} not found")
        return {"error": "Device not found"}
    
    logger.info(f"Retrieved device: {device_id}")
    return device


@router.get("/telemetry/metrics/temperature")
async def get_temperature_history() -> Dict[str, Any]:
    """Get temperature history data.
    
    Returns:
        Temperature metrics over time.
    """
    telemetry = get_default_telemetry()
    return {"temperatureHistory": telemetry["temperatureHistory"]}


@router.get("/telemetry/metrics/humidity")
async def get_humidity_history() -> Dict[str, Any]:
    """Get humidity history data.
    
    Returns:
        Humidity metrics over time.
    """
    telemetry = get_default_telemetry()
    return {"humidityHistory": telemetry["humidityHistory"]}


# --------------------------------------------------------------------------- #
# Columnar (Arrow IPC) streaming endpoints.
#
# These replace the equivalent JSON endpoints for high-volume consumers. The
# browser fetches the binary Arrow IPC stream and deserializes it directly with
# the native ``apache-arrow`` JS library, skipping ``JSON.parse`` entirely.
# --------------------------------------------------------------------------- #


@router.get("/telemetry/arrow")
async def list_arrow_datasets() -> Dict[str, Any]:
    """List the datasets available as Arrow IPC streams."""
    return {
        "mediaType": arrow.ARROW_STREAM_MEDIA_TYPE,
        "datasets": arrow.DATASETS,
        "endpoints": {
            ds: f"/api/telemetry/arrow/{ds}" for ds in arrow.DATASETS
        },
    }


@router.get("/telemetry/arrow/{dataset}")
async def get_arrow_dataset(dataset: str) -> StreamingResponse:
    """Stream a telemetry dataset as an Apache Arrow IPC byte stream.

    Args:
        dataset: One of ``devices``, ``temperature``, ``humidity``.

    Returns:
        A streaming response with ``application/vnd.apache.arrow.stream`` whose
        body is a self-describing Arrow IPC stream.

    Raises:
        HTTPException: 404 if the dataset name is unknown.
    """
    if dataset not in arrow.DATASETS:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=404,
            detail=f"Unknown Arrow dataset {dataset!r}; expected one of {arrow.DATASETS!r}",
        )

    telemetry = get_default_telemetry()
    payload = arrow.serialize_dataset(telemetry, dataset)
    return StreamingResponse(
        iter([payload]),
        media_type=arrow.ARROW_STREAM_MEDIA_TYPE,
        headers={"X-Arrow-Dataset": dataset, "X-Arrow-Rows": str(len(payload))},
    )
  
