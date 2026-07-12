"""LLM response caching layer.

Natural-language dashboard queries repeat frequently (e.g. "summarize the
telemetry", "add a temperature chart"). Re-running the model for identical
prompts wastes money and latency, so this module caches serialized LLM
responses keyed by a hash of the prompt.

Design goals
------------
* Reuse the existing Redis instance (``settings.REDIS_URL``).
* Degrade gracefully: if Redis is unavailable, fall back to a small in-process
  LRU-ish dictionary so the app keeps working (and tests run without Redis).
* Be safe to call from anywhere - all failures are swallowed and logged.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Dict, Optional

from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

try:  # redis is optional; caching silently degrades if it's missing.
    import redis  # type: ignore
  
    REDIS_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised only without redis installed
    REDIS_AVAILABLE = False


def make_cache_key(namespace: str, payload: Any) -> str:
    """Build a stable cache key from a namespace and an arbitrary payload.
    
    The payload is serialized deterministically (sorted keys) before hashing so
    that logically identical requests map to the same key.
    """
    serialized = json.dumps(payload, sort_keys=True, default=str)
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    return f"{settings.LLM_CACHE_PREFIX}{namespace}:{digest}"


class _InMemoryCache:
    """Tiny TTL cache used when Redis is not reachable."""
  
    def __init__(self, max_entries: int = 512):
        self._store: Dict[str, tuple[float, str]] = {}
        self._max_entries = max_entries
      
    def get(self, key: str) -> Optional[str]:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at < time.time():
            self._store.pop(key, None)
            return None
        return value
      
    def set(self, key: str, value: str, ttl: int) -> None:
        if len(self._store) >= self._max_entries:
            # Drop the oldest entry to bound memory usage.
            oldest = min(self._store, key=lambda k: self._store[k][0])
            self._store.pop(oldest, None)
        self._store[key] = (time.time() + ttl, value)
      
    def clear(self) -> None:
        self._store.clear()


class LLMCache:
    """Cache for LLM responses backed by Redis with in-memory fallback."""
  
    def __init__(self) -> None:
        self.enabled = settings.LLM_CACHE_ENABLED
        self.ttl = settings.LLM_CACHE_TTL
        self._redis = self._connect_redis()
        self._fallback = _InMemoryCache()
        self.hits = 0
        self.misses = 0
      
    def _connect_redis(self) -> Optional["redis.Redis"]:
        if not REDIS_AVAILABLE:
            logger.info("redis package not installed; using in-memory LLM cache")
            return None
        try:
            client = redis.Redis.from_url(
                settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1
            )
            client.ping()
            logger.info("LLM cache connected to Redis")
            return client
        except Exception as exc:  # pragma: no cover - depends on env
            logger.warning("Redis unavailable (%s); using in-memory LLM cache", exc)
            return None
          
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Return a cached response dict for ``key`` or ``None`` on a miss."""
        if not self.enabled:
            return None
        raw: Optional[str] = None
        try:
            raw = self._redis.get(key) if self._redis else self._fallback.get(key)
        except Exception as exc:  # pragma: no cover - depends on env
            logger.warning("LLM cache read failed: %s", exc)
            raw = self._fallback.get(key)
          
        if raw is None:
            self.misses += 1
            return None
          
        self.hits += 1
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
          
    def set(self, key: str, value: Dict[str, Any]) -> None:
        """Store ``value`` under ``key`` with the configured TTL."""
        if not self.enabled:
            return
        try:
            serialized = json.dumps(value, default=str)
        except (TypeError, ValueError) as exc:
            logger.warning("Skipping cache write, value not serializable: %s", exc)
            return
        try:
            if self._redis:
                self._redis.setex(key, self.ttl, serialized)
            else:
                self._fallback.set(key, serialized, self.ttl)
        except Exception as exc:  # pragma: no cover - depends on env
            logger.warning("LLM cache write failed: %s", exc)
            self._fallback.set(key, serialized, self.ttl)
          
    def clear(self) -> None:
        """Clear cached entries (in-memory always; Redis by prefix)."""
        self._fallback.clear()
        if not self._redis:
            return
        try:
            for key in self._redis.scan_iter(match=f"{settings.LLM_CACHE_PREFIX}*"):
                self._redis.delete(key)
        except Exception as exc:  # pragma: no cover - depends on env
            logger.warning("LLM cache clear failed: %s", exc)
          
    def stats(self) -> Dict[str, Any]:
        """Return basic hit/miss statistics for observability."""
        total = self.hits + self.misses
        hit_rate = (self.hits / total) if total else 0.0
        return {
            "backend": "redis" if self._redis else "memory",
            "enabled": self.enabled,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": round(hit_rate, 4),
        }

      
# Module-level singleton shared across the app.
_llm_cache: Optional[LLMCache] = None


def get_llm_cache() -> LLMCache:
    """Return the shared :class:`LLMCache` instance."""
    global _llm_cache
    if _llm_cache is None:
        _llm_cache = LLMCache()
    return _llm_cache
