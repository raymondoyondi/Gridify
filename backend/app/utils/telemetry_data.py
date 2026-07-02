"""Default telemetry data for Gridify dashboard."""

from typing import List, Dict, Any


def get_default_telemetry() -> Dict[str, Any]:
    """Get default telemetry data.
    
    Returns:
        Dictionary containing devices and historical metrics.
    """
    return {
        "devices": [
            {
                "id": "Marchival Arc",
                "score": 41.53,
                "uptime": 42,
                "load": "4.8K",
                "status": "alert",
                "type": "Node",
                "active": True
            },
            {
                "id": "Device 07",
                "score": 41.53,
                "uptime": 42,
                "load": "4.8K",
                "status": "alert",
                "type": "Node",
                "active": True
            },
            {
                "id": "Home Hub",
                "score": 28.78,
                "uptime": 48,
                "load": "2.3K",
                "status": "operational",
                "type": "Host",
                "active": True
            },
            {
                "id": "Device 01",
                "score": 28.78,
                "uptime": 88,
                "load": "2.3K",
                "status": "operational",
                "type": "Host",
                "active": True
            },
            {
                "id": "Device 04",
                "score": 28.78,
                "uptime": 88,
                "load": "2.3K",
                "status": "operational",
                "type": "Host",
                "active": True
            },
            {
                "id": "Device 02",
                "score": 27.73,
                "uptime": 93,
                "load": "6.7K",
                "status": "flow_controller",
                "type": "Proxy",
                "active": True
            },
            {
                "id": "Device 05",
                "score": 27.73,
                "uptime": 93,
                "load": "2.3K",
                "status": "flow_controller",
                "type": "Proxy",
                "active": True
            },
            {
                "id": "Main Server",
                "score": 27.53,
                "uptime": 93,
                "load": "6.7K",
                "status": "operational",
                "type": "Host",
                "active": True
            },
            {
                "id": "Device 03",
                "score": 27.53,
                "uptime": 93,
                "load": "2.3K",
                "status": "alert",
                "type": "Node",
                "active": True
            },
            {
                "id": "Device 06",
                "score": 27.53,
                "uptime": 93,
                "load": "6.7K",
                "status": "flow_controller",
                "type": "Proxy",
                "active": True
            },
        ],
        "temperatureHistory": [
            {"label": "Jan", "value": 15},
            {"label": "Feb", "value": 20},
            {"label": "Mar", "value": 16},
            {"label": "Apr", "value": 23},
            {"label": "May", "value": 19},
            {"label": "Jun", "value": 21},
            {"label": "Jul", "value": 28},
        ],
        "humidityHistory": [
            {"label": "Jan", "value": 30},
            {"label": "Feb", "value": 45},
            {"label": "Mar", "value": 35},
            {"label": "Apr", "value": 50},
            {"label": "May", "value": 40},
            {"label": "Jun", "value": 55},
            {"label": "Jul", "value": 65},
        ]
    }
  
