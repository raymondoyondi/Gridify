"""Persistent storage for saved / shared dashboard layouts.

GenAI drafts and dragged widgets live in Zustand for ephemeral UI state, but
users need to *save*, *share*, and *collaborate* on layouts. This repository
persists layouts so they survive reloads and can be opened by others. The
in-memory implementation is the default (zero infra); when a PostgreSQL
connection is available the same interface is backed by a real table so saved
layouts are durable and queryable across pods.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional


@dataclass
class DashboardLayout:
    id: str
    name: str
    owner: str
    widgets: List[dict] = field(default_factory=list)
    is_public: bool = False
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "owner": self.owner,
            "widgets": self.widgets,
            "is_public": self.is_public,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class LayoutRepository:
    """Interface for layout persistence."""

    def save(self, layout: DashboardLayout) -> DashboardLayout:
        raise NotImplementedError

    def get(self, layout_id: str) -> Optional[DashboardLayout]:
        raise NotImplementedError

    def list_by_owner(self, owner: str) -> List[DashboardLayout]:
        raise NotImplementedError

    def list_public(self) -> List[DashboardLayout]:
        raise NotImplementedError

    def delete(self, layout_id: str) -> bool:
        raise NotImplementedError


class InMemoryLayoutRepository(LayoutRepository):
    """Default zero-infra repository (also used in tests)."""

    def __init__(self) -> None:
        self._store: Dict[str, DashboardLayout] = {}

    def save(self, layout: DashboardLayout) -> DashboardLayout:
        now = datetime.now(timezone.utc).isoformat()
        existing = self._store.get(layout.id)
        layout.created_at = existing.created_at or now
        layout.updated_at = now
        self._store[layout.id] = layout
        return layout

    def get(self, layout_id: str) -> Optional[DashboardLayout]:
        return self._store.get(layout_id)

    def list_by_owner(self, owner: str) -> List[DashboardLayout]:
        return [l for l in self._store.values() if l.owner == owner]

    def list_public(self) -> List[DashboardLayout]:
        return [l for l in self._store.values() if l.is_public]

    def delete(self, layout_id: str) -> bool:
        return self._store.pop(layout_id, None) is not None


class PostgresLayoutRepository(LayoutRepository):
    """Durable, cross-pod repository backed by PostgreSQL via SQLAlchemy Core."""

    def __init__(self, database_url: str):
        from sqlalchemy import create_engine, text

        self._engine = create_engine(database_url, pool_pre_ping=True)
        self._text = text
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with self._engine.begin() as conn:
            conn.execute(
                self._text(
                    """
                    CREATE TABLE IF NOT EXISTS dashboard_layouts (
                        id VARCHAR PRIMARY KEY,
                        name VARCHAR NOT NULL,
                        owner VARCHAR NOT NULL,
                        widgets JSON NOT NULL,
                        is_public BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                    """
                )
            )

    def _row_to_layout(self, row) -> DashboardLayout:
        return DashboardLayout(
            id=row.id,
            name=row.name,
            owner=row.owner,
            widgets=json.loads(row.widgets) if isinstance(row.widgets, str) else row.widgets,
            is_public=row.is_public,
            created_at=row.created_at.isoformat() if row.created_at else "",
            updated_at=row.updated_at.isoformat() if row.updated_at else "",
        )

    def save(self, layout: DashboardLayout) -> DashboardLayout:
        from sqlalchemy import text

        now = datetime.now(timezone.utc)
        existing = self.get(layout.id)
        created = existing.created_at or now.isoformat()
        with self._engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO dashboard_layouts
                        (id, name, owner, widgets, is_public, created_at, updated_at)
                    VALUES (:id, :name, :owner, :widgets, :public, :created, :updated)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        owner = EXCLUDED.owner,
                        widgets = EXCLUDED.widgets,
                        is_public = EXCLUDED.is_public,
                        updated_at = EXCLUDED.updated_at
                    """
                ),
                {
                    "id": layout.id,
                    "name": layout.name,
                    "owner": layout.owner,
                    "widgets": json.dumps(layout.widgets),
                    "public": layout.is_public,
                    "created": existing.created_at or now,
                    "updated": now,
                },
            )
        layout.created_at = created
        layout.updated_at = now.isoformat()
        return layout

    def get(self, layout_id: str) -> Optional[DashboardLayout]:
        from sqlalchemy import text

        with self._engine.connect() as conn:
            row = conn.execute(
                text("SELECT * FROM dashboard_layouts WHERE id = :id"),
                {"id": layout_id},
            ).fetchone()
        return self._row_to_layout(row) if row else None

    def list_by_owner(self, owner: str) -> List[DashboardLayout]:
        from sqlalchemy import text

        with self._engine.connect() as conn:
            rows = conn.execute(
                text("SELECT * FROM dashboard_layouts WHERE owner = :owner"),
                {"owner": owner},
            ).fetchall()
        return [self._row_to_layout(r) for r in rows]

    def list_public(self) -> List[DashboardLayout]:
        from sqlalchemy import text

        with self._engine.connect() as conn:
            rows = conn.execute(
                text("SELECT * FROM dashboard_layouts WHERE is_public = TRUE")
            ).fetchall()
        return [self._row_to_layout(r) for r in rows]

    def delete(self, layout_id: str) -> bool:
        from sqlalchemy import text

        with self._engine.begin() as conn:
            res = conn.execute(
                text("DELETE FROM dashboard_layouts WHERE id = :id"),
                {"id": layout_id},
            )
            return res.rowcount > 0


_repo: Optional[LayoutRepository] = None


def get_layout_repository() -> LayoutRepository:
    """Return the active layout repository.

    Uses PostgreSQL when ``DATABASE_URL`` is configured and reachable, otherwise
    the in-memory store. This keeps the app runnable with zero infra while still
    persisting layouts in production.
    """
    global _repo
    if _repo is not None:
        return _repo
    from app.config import settings

    if settings.DATABASE_URL:
        try:
            _repo = PostgresLayoutRepository(settings.DATABASE_URL)
            return _repo
        except Exception:
            # Fall back to in-memory when Postgres is unreachable.
            pass
    _repo = InMemoryLayoutRepository()
    return _repo


def reset_layout_repository(instance: Optional[LayoutRepository] = None) -> None:
    """Replace the cached repository (used in tests)."""
    global _repo
    _repo = instance
