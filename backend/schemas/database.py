"""
Pydantic schemas for database models
Used for request/response validation in FastAPI endpoints
"""

from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr


# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Widget Schemas
class WidgetBase(BaseModel):
    title: str
    subtitle: Optional[str] = None
    type: str
    width: int = 2
    height: int = 300
    order: Optional[int] = None
    custom_data: Optional[dict] = None


class WidgetCreate(WidgetBase):
    widget_id: str


class WidgetUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    order: Optional[int] = None
    custom_data: Optional[dict] = None


class WidgetResponse(WidgetBase):
    id: int
    widget_id: str
    dashboard_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Dashboard Schemas
class DashboardBase(BaseModel):
    name: str
    description: Optional[str] = None
    layout: Optional[List[dict]] = []


class DashboardCreate(DashboardBase):
    pass


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[List[dict]] = None


class DashboardResponse(DashboardBase):
    id: int
    user_id: int
    widgets: List[WidgetResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Telemetry Schemas
class TelemetryDataBase(BaseModel):
    device_id: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    status: Optional[str] = None
    score: Optional[float] = None
    uptime: Optional[int] = None
    load: Optional[str] = None
    active: bool = True


class TelemetryDataCreate(TelemetryDataBase):
    pass


class TelemetryDataResponse(TelemetryDataBase):
    id: int
    recorded_at: datetime

    class Config:
        from_attributes = True


# Query History Schemas
class QueryHistoryBase(BaseModel):
    query_text: str
    status: Optional[str] = None


class QueryHistoryCreate(QueryHistoryBase):
    dashboard_id: Optional[int] = None


class QueryHistoryResponse(QueryHistoryBase):
    id: int
    user_id: int
    dashboard_id: Optional[int] = None
    ai_response: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Telemetry Summary Response
class TelemetrySummary(BaseModel):
    """Summary of telemetry data with aggregations"""
    total_devices: int
    active_devices: int
    alert_count: int
    average_uptime: float
    devices: List[TelemetryDataResponse]
