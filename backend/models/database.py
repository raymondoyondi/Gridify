"""
SQLAlchemy ORM Models for Gridify
Defines database table structures and relationships
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Boolean, DECIMAL, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from config.database import Base


class User(Base):
    """User account model"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    dashboards = relationship("Dashboard", back_populates="user", cascade="all, delete-orphan")
    query_history = relationship("QueryHistory", back_populates="user", cascade="all, delete-orphan")


class Dashboard(Base):
    """Dashboard configuration model"""
    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    layout = Column(JSONB, default=[])
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="dashboards")
    widgets = relationship("Widget", back_populates="dashboard", cascade="all, delete-orphan")
    query_history = relationship("QueryHistory", back_populates="dashboard")


class Widget(Base):
    """Dashboard widget model"""
    __tablename__ = "widgets"

    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False, index=True)
    widget_id = Column(String(255), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255))
    type = Column(String(50), nullable=False)  # e.g., 'custom_chart', 'table', 'gauge'
    width = Column(Integer, default=2)
    height = Column(Integer, default=300)
    order = Column(Integer)
    custom_data = Column(JSONB)  # Stores chart data, configuration, etc.
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    dashboard = relationship("Dashboard", back_populates="widgets")


class TelemetryData(Base):
    """Telemetry data points from devices"""
    __tablename__ = "telemetry_data"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(255), nullable=False, index=True)
    device_name = Column(String(255))
    device_type = Column(String(100))  # e.g., 'Node', 'Host', 'Proxy'
    status = Column(String(100))  # e.g., 'operational', 'alert', 'flow_controller'
    score = Column(DECIMAL(5, 2))
    uptime = Column(Integer)
    load = Column(String(50))
    active = Column(Boolean, default=True)
    recorded_at = Column(TIMESTAMP, default=datetime.utcnow, index=True)


class QueryHistory(Base):
    """History of AI-generated queries and responses"""
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id", ondelete="SET NULL"), index=True)
    query_text = Column(Text, nullable=False)
    ai_response = Column(JSONB)  # Stores the full AI response including widgets changes
    status = Column(String(50))  # e.g., 'success', 'fallback', 'error'
    created_at = Column(TIMESTAMP, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="query_history")
    dashboard = relationship("Dashboard", back_populates="query_history")
