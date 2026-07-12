"""FastAPI backend server for Gridify dashboard.

Provides RESTful API endpoints for:
- Telemetry data retrieval
- AI-powered natural language commands via Gemini
- Dashboard widget management
- Production frontend static file serving
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import telemetry, gemini, olap, semantic
from app.middleware.guardrail_middleware import AsyncGuardrailMiddleware
from app.utils.logger import setup_logger

# Setup logging
logger = setup_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("🚀 Gridify backend starting up...")
    logger.info(f"Environment: {settings.PYTHON_ENV}")
    logger.info(f"Frontend URL: {settings.FRONTEND_URL}")
    yield
    logger.info("⏹️ Gridify backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Gridify Backend API",
    description="AI-powered dashboard backend with Gemini integration",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL] if settings.PYTHON_ENV == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(telemetry.router, prefix="/api", tags=["telemetry"])
app.include_router(gemini.router, prefix="/api", tags=["gemini"])
app.include_router(olap.router, prefix="/api", tags=["olap"])
app.include_router(semantic.router, prefix="/api", tags=["semantic"])

# Async guardrails at the network boundary: prompt-injection scans run off the
# synchronous request path (edge service or worker thread) so TTFT stays snappy.
if settings.GUARDRAILS_ENABLED:
    app.add_middleware(AsyncGuardrailMiddleware)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Gridify Backend"}


@app.get("/ready")
async def ready_check():
    """Readiness check endpoint."""
    return {"status": "ready"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Gridify Backend API",
        "docs": "/docs",
        "version": "1.0.0"
    }


if settings.PYTHON_ENV == "production":
    frontend_dist = os.path.join(os.path.dirname(__file__), "..", "dist")
    if os.path.exists(frontend_dist):
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.PYTHON_ENV != "production"
    )
