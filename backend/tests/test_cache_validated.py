"""Tests for the Pydantic-validated LLM cache layer."""

import pytest
from pydantic import BaseModel

from app.utils.cache import LLMCache, make_cache_key, get_llm_cache


class _Widget(BaseModel):
    id: str
    title: str


class _Command(BaseModel):
    summary: str
    widgets: list[_Widget]


@pytest.fixture()
def cache() -> LLMCache:
    c = LLMCache()
    c._redis = None  # type: ignore[attr-defined]
    c._fallback.clear()
    c.enabled = True
    c.hits = 0
    c.misses = 0
    return c


def test_set_and_get_validated_roundtrip(cache: LLMCache):
    key = make_cache_key("cmd", {"query": "summarize"})
    model = _Command(summary="ok", widgets=[_Widget(id="w1", title="T")])

    assert cache.get_validated(key, _Command) is None  # miss
    cache.set_validated(key, model)
    restored = cache.get_validated(key, _Command)

    assert isinstance(restored, _Command)
    assert restored.summary == "ok"
    assert restored.widgets[0].id == "w1"
    assert cache.hits == 1
    assert cache.misses == 1


def test_validated_respects_disabled_flag(cache: LLMCache):
    cache.enabled = False
    key = make_cache_key("cmd", {"query": "nope"})
    cache.set_validated(key, _Command(summary="x", widgets=[]))
    assert cache.get_validated(key, _Command) is None


def test_validated_drops_corrupt_entry(cache: LLMCache):
    """A non-conforming cached payload must not resurrect as a valid model."""
    key = make_cache_key("cmd", {"query": "bad"})
    # Write a payload the schema would reject (missing required field shape).
    cache._fallback.set(key, '{"widgets": []}', cache.ttl)
    assert cache.get_validated(key, _Command) is None


def test_get_llm_cache_singleton_still_works():
    assert get_llm_cache() is get_llm_cache()
