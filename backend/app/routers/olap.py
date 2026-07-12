"""OLAP analytics endpoints backed by the pluggable storage tier."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from typing import Any, Dict, List

from app.services.olap.factory import get_olap_engine
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.get("/olap/engine")
async def olap_engine() -> Dict[str, Any]:
    """Report which OLAP backend is currently active."""
    engine = get_olap_engine()
    return {"backend": engine.backend, "healthy": engine.health()}


@router.get("/olap/query")
async def olap_query(
    sql: str = Query(..., description="Read-only SQL against the analytics tier"),
    limit: int = Query(100, ge=1, le=1000),
) -> Dict[str, Any]:
    """Run a read-only analytics query against the active OLAP backend.

    This is the single entry point used by the GenAI agent and the dashboard so
    that, regardless of whether the tier is DuckDB, ClickHouse, or MotherDuck,
    the rest of the app only depends on one interface.
    """
    engine = get_olap_engine()
    try:
        safe_sql = sql.strip().rstrip(";")
        if not safe_sql.lower().startswith(("select", "show", "with")):
            raise HTTPException(
                status_code=400, detail="Only read-only statements are permitted"
            )
        rows = engine.query(f"{safe_sql} LIMIT {limit}")
        return {"backend": engine.backend, "rows": rows, "count": len(rows)}
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - backend-specific failures
        logger.warning(f"OLAP query failed: {exc}")
        raise HTTPException(status_code=502, detail=f"OLAP query failed: {exc}")
