"""Tests for persistent dashboard-layout storage."""

import uuid

import pytest

from app.services.layout_repository import (
    DashboardLayout,
    InMemoryLayoutRepository,
    get_layout_repository,
    reset_layout_repository,
)


@pytest.fixture()
def repo():
    r = InMemoryLayoutRepository()
    reset_layout_repository(r)
    yield r
    reset_layout_repository(None)


def _layout(owner="u1", public=False, id=None):
    return DashboardLayout(
        id=id or f"L{uuid.uuid4().hex[:4]}",
        name="My Layout",
        owner=owner,
        widgets=[{"id": "w1", "title": "T"}],
        is_public=public,
    )


def test_save_and_get(repo):
    saved = repo.save(_layout())
    assert saved.id is not None
    assert saved.created_at and saved.updated_at
    got = repo.get(saved.id)
    assert got is not None
    assert got.name == "My Layout"
    assert got.widgets == [{"id": "w1", "title": "T"}]


def test_overwrite_updates_timestamp(repo):
    first = repo.save(_layout(id="L1"))
    later = repo.save(_layout(id="L1"))
    assert later.created_at == first.created_at  # preserved
    assert later.updated_at >= first.updated_at


def test_list_by_owner_and_public(repo):
    repo.save(_layout(owner="u1", public=False))
    repo.save(_layout(owner="u2", public=True))
    repo.save(_layout(owner="u2", public=False))
    assert len(repo.list_by_owner("u2")) == 2
    assert len(repo.list_public()) == 1


def test_delete(repo):
    saved = repo.save(_layout())
    assert repo.delete(saved.id) is True
    assert repo.get(saved.id) is None
    assert repo.delete(saved.id) is False


def test_factory_defaults_to_in_memory(monkeypatch):
    monkeypatch.setattr("app.config.settings.DATABASE_URL", "")
    reset_layout_repository(None)
    repo = get_layout_repository()
    try:
        assert isinstance(repo, InMemoryLayoutRepository)
    finally:
        reset_layout_repository(None)
