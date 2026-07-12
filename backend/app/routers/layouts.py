"""Endpoints for saving, loading, and sharing dashboard layouts."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query

from app.services.layout_repository import (
    DashboardLayout,
    get_layout_repository,
)
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.post("/layouts")
async def create_layout(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Save a new dashboard layout (or overwrite one by id)."""
    repo = get_layout_repository()
    layout_id = payload.get("id") or str(uuid.uuid4())
    layout = DashboardLayout(
        id=layout_id,
        name=payload.get("name", "Untitled layout"),
        owner=payload.get("owner", "anonymous"),
        widgets=payload.get("widgets", []),
        is_public=bool(payload.get("is_public", False)),
    )
    saved = repo.save(layout)
    return saved.to_dict()


@router.get("/layouts/{layout_id}")
async def get_layout(layout_id: str) -> Dict[str, Any]:
    repo = get_layout_repository()
    layout = repo.get(layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return layout.to_dict()


@router.get("/layouts")
async def list_layouts(
    owner: str = Query("anonymous"), public: bool = Query(False)
) -> Dict[str, Any]:
    repo = get_layout_repository()
    layouts: List[DashboardLayout] = (
        repo.list_public() if public else repo.list_by_owner(owner)
    )
    return {"layouts": [l.to_dict() for l in layouts], "count": len(layouts)}


@router.delete("/layouts/{layout_id}")
async def delete_layout(layout_id: str) -> Dict[str, Any]:
    repo = get_layout_repository()
    ok = repo.delete(layout_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Layout not found")
    return {"deleted": layout_id}
