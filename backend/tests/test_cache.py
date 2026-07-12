"""Tests for the LLM response cache utility."""

import pytest

from app.utils.cache import LLMCache, make_cache_key, get_llm_cache


def _fresh_cache() -> LLMCache:
    """Build a cache that ignores Redis so tests are deterministic."""
    cache = LLMCache()
    # Force the in-memory fallback regardless of environment.
    cache._redis = None  # type: ignore[attr-defined]
    cache._fallback.clear()
    cache.enabled = True
    cache.hits = 0
    cache.misses = 0
    return cache


def test_make_cache_key_is_stable_and_order_independent():
    """Same logical payload yields the same key regardless of key order."""
    key_a = make_cache_key("cmd", {"query": "hi", "widgets": [1, 2]})
    key_b = make_cache_key("cmd", {"widgets": [1, 2], "query": "hi"})
    assert key_a == key_b


def test_make_cache_key_differs_for_different_payloads():
    key_a = make_cache_key("cmd", {"query": "add chart"})
    key_b = make_cache_key("cmd", {"query": "remove chart"})
    assert key_a != key_b


def test_cache_set_and_get_roundtrip():
    cache = _fresh_cache()
    key = make_cache_key("cmd", {"query": "summarize"})
    value = {"aiSummary": ["a", "b", "c"], "feedbackMessage": "done"}
    
    assert cache.get(key) is None  # miss
    cache.set(key, value)
    assert cache.get(key) == value  # hit
    
    stats = cache.stats()
    assert stats["hits"] == 1
    assert stats["misses"] == 1
    assert stats["backend"] == "memory"


def test_cache_respects_disabled_flag():
    cache = _fresh_cache()
    cache.enabled = False
    key = make_cache_key("cmd", {"query": "noop"})
    cache.set(key, {"x": 1})
    assert cache.get(key) is None


def test_cache_clear_removes_entries():
    cache = _fresh_cache()
    key = make_cache_key("cmd", {"query": "clear me"})
    cache.set(key, {"x": 1})
    assert cache.get(key) is not None
    cache.clear()
    assert cache.get(key) is None


def test_get_llm_cache_is_singleton():
    assert get_llm_cache() is get_llm_cache()
