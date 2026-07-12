"""Semantic layer endpoints: token-efficient, RBAC-safe prompt context."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any

from app.services.semantic_model import Dialect, get_semantic_model
from app.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.get("/semantic/context")
async def semantic_context(
    role: str = Query("analyst", description="RBAC role requesting context"),
    dialect: Dialect = Query(Dialect.DUCKDB, description="Target OLAP dialect"),
) -> Dict[str, Any]:
    """Return the compact semantic context for a role.

    This structured description (not the raw schema) is what gets injected into
    the Gemini prompt, shrinking token usage and constraining the model to the
    role's entitlements.
    """
    model = get_semantic_model()
    try:
        context = model.build_prompt_context(role, dialect)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"role": role, "dialect": dialect.value, "context": context}


@router.post("/semantic/compile")
async def semantic_compile(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Compile an authorized semantic query to engine-specific SQL.

    Body: ``{role, measures, dimensions, filters?, order_by?, limit?, dialect?}``.
    Raises 403-style 400 when the role is not entitled to part of the request.
    """
    model = get_semantic_model()
    try:
        sql = model.compile(
            role=payload["role"],
            measures=payload.get("measures", []),
            dimensions=payload.get("dimensions", []),
            filters=payload.get("filters", []),
            order_by=payload.get("order_by"),
            order_direction=payload.get("order_direction", "DESC"),
            limit=payload.get("limit"),
            dialect=Dialect(payload.get("dialect", "duckdb")),
        )
    except KeyError:
        raise HTTPException(status_code=400, detail="Missing 'role' in body")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"sql": sql}
