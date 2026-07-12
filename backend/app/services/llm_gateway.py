"""LLM gateway abstraction for Portkey / Langfuse.

Instead of managing fallback logic directly inside the core application code,
all LiteLLM calls can be routed through a standalone gateway. This cleanly
offloads tracking, automatic retries, budget tracking, and fallbacks away from
the central FastAPI code.

Supported providers:
- ``litellm`` (default): direct LiteLLM calls, no gateway overhead.
- ``portkey``: routes through Portkey's virtual keys and gateway.
- ``langfuse``: routes through Langfuse's proxy for observability.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

try:  # LiteLLM is optional at import time so tests run without it.
    import litellm  # type: ignore

    LITELLM_AVAILABLE = True
except Exception:  # pragma: no cover
    LITELLM_AVAILABLE = False


class LLMGateway:
    """Routes LLM completions through an optional gateway provider.

    When no gateway is configured, calls fall back to plain LiteLLM so the
    rest of the code path is unchanged.
    """

    def __init__(self) -> None:
        self.provider = settings.LLM_GATEWAY_PROVIDER.lower()
        self._completion: Callable[..., Any] = self._build_completion_fn()

    def _build_completion_fn(self) -> Callable[..., Any]:
        if not LITELLM_AVAILABLE:
            logger.warning("LiteLLM not installed; gateway unavailable")
            return lambda **kwargs: (_ for _ in ()).throw(
                RuntimeError("LiteLLM is not installed")
            )

        if self.provider == "portkey" and settings.LLM_GATEWAY_PORTKEY_API_KEY:
            logger.info("Routing LLM calls through Portkey gateway")
            try:
                import portkey_ai  # type: ignore

                portkey_ai.api_key = settings.LLM_GATEWAY_PORTKEY_API_KEY
                if settings.LLM_GATEWAY_BASE_URL:
                    portkey_ai.api_base = settings.LLM_GATEWAY_BASE_URL
                return portkey_ai.Completions.acompletions
            except Exception as exc:  # pragma: no cover - optional dep
                logger.warning("Portkey gateway unavailable (%s); using LiteLLM", exc)

        if self.provider == "langfuse" and (
            settings.LLM_GATEWAY_LANGFUSE_PUBLIC_KEY
            and settings.LLM_GATEWAY_LANGFUSE_SECRET_KEY
        ):
            logger.info("Routing LLM calls through Langfuse gateway")
            try:
                from langfuse.openai import OpenAI  # type: ignore

                client = OpenAI(
                    base_url=settings.LLM_GATEWAY_BASE_URL or settings.LLM_GATEWAY_LANGFUSE_HOST,
                    api_key=settings.LLM_GATEWAY_LANGFUSE_SECRET_KEY,
                )
                return lambda **kwargs: client.chat.completions.create(**kwargs).model_dump()
            except Exception as exc:  # pragma: no cover - optional dep
                logger.warning("Langfuse gateway unavailable (%s); using LiteLLM", exc)

        logger.debug("No LLM gateway configured; using direct LiteLLM")
        return litellm.completion

    def complete(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Run a completion through the configured gateway.

        Args:
            kwargs: Keyword arguments forwarded to the underlying client
                (model, messages, temperature, etc.).

        Returns:
            OpenAI-style response dict.
        """
        return self._completion(**kwargs)

    def is_available(self) -> bool:
        return LITELLM_AVAILABLE


_gateway: Optional[LLMGateway] = None


def get_llm_gateway() -> LLMGateway:
    """Return the shared :class:`LLMGateway` singleton."""
    global _gateway
    if _gateway is None:
        _gateway = LLMGateway()
    return _gateway
