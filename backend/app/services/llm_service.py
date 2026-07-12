"""Unified LLM completion with automatic fallback (LiteLLM).

Primary traffic goes to the hosted model (Gemini). When it fails — most often
because of rate limits (HTTP 429) or a transient outage — we transparently fall
back to a self-hosted open model (Mistral served via vLLM's OpenAI-compatible
endpoint). LiteLLM gives us a single ``completion`` interface across all of
these providers.

Why a manual fallback loop instead of LiteLLM's ``Router``?
----------------------------------------------------------
The explicit loop here is version-agnostic, trivially unit-testable (the
``completion_fn`` is injectable), and lets us log exactly which provider served
each request for observability. LiteLLM's Router remains a drop-in upgrade if
we later need weighted load-balancing.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from app.config import settings
from app.services.llm_gateway import get_llm_gateway
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

try:  # LiteLLM is optional at import time so tests run without it.
    import litellm  # type: ignore

    LITELLM_AVAILABLE = True
except Exception:  # pragma: no cover - exercised only when litellm missing
    LITELLM_AVAILABLE = False


CompletionFn = Callable[..., Any]


class LLMResult(Dict[str, Any]):
    """Lightweight dict subclass documenting the returned shape."""


class LLMService:
    """Multi-provider completion with ordered fallbacks."""

    def __init__(self, completion_fn: Optional[CompletionFn] = None):
        # Allow tests / callers to inject a fake completion function.
        if completion_fn is not None:
            self._completion = completion_fn
        elif LITELLM_AVAILABLE:
            self._completion = litellm.completion
        else:
            self._completion = None
        self.models: List[Dict[str, Any]] = self._build_model_chain()

    def _build_model_chain(self) -> List[Dict[str, Any]]:
        """Build the ordered [primary, *fallbacks] provider list."""
        chain: List[Dict[str, Any]] = []

        # Primary: hosted Gemini via LiteLLM's `gemini/` provider prefix.
        if settings.GEMINI_API_KEY:
            chain.append(
                {
                    "model": f"gemini/{settings.LLM_MODEL}",
                    "api_key": settings.GEMINI_API_KEY,
                    "label": "gemini-primary",
                }
            )

        # Fallback: local Mistral served by vLLM (OpenAI-compatible API).
        if settings.VLLM_BASE_URL:
            chain.append(
                {
                    "model": f"openai/{settings.VLLM_MODEL}",
                    "api_base": settings.VLLM_BASE_URL,
                    "api_key": settings.VLLM_API_KEY or "not-needed",
                    "label": "vllm-fallback",
                }
            )

        return chain

    def is_available(self) -> bool:
        """True when a completion backend and at least one model are configured."""
        return self._completion is not None and bool(self.models)

    def complete(
        self,
        messages: List[Dict[str, str]],
        *,
        response_format: Optional[Dict[str, Any]] = None,
        temperature: float = 0.2,
        max_retries: Optional[int] = None,
    ) -> LLMResult:
        """Run a chat completion, falling back through the model chain.

        Returns a dict with ``content``, ``model`` (the label that served the
        request) and ``attempts``. Raises ``RuntimeError`` if every provider
        fails or none are configured.
        """
        if not self.is_available():
            raise RuntimeError("No LLM provider configured (missing keys/endpoints)")

        retries = settings.LLM_MAX_RETRIES if max_retries is None else max_retries
        attempts: List[str] = []
        last_error: Optional[Exception] = None

        for entry in self.models:
            label = entry["label"]
            kwargs: Dict[str, Any] = {
                "model": entry["model"],
                "messages": messages,
                "temperature": temperature,
                "num_retries": retries,
            }
            if "api_key" in entry:
                kwargs["api_key"] = entry["api_key"]
            if "api_base" in entry:
                kwargs["api_base"] = entry["api_base"]
            if response_format is not None:
                kwargs["response_format"] = response_format

            try:
                attempts.append(label)
                gateway = get_llm_gateway()
                response = gateway.complete(kwargs)
                content = _extract_content(response)
                logger.info("LLM served by %s via %s", label, settings.LLM_GATEWAY_PROVIDER)
                return LLMResult(content=content, model=label, attempts=attempts)
            except Exception as exc:  # noqa: BLE001 - we intentionally try next provider
                last_error = exc
                logger.warning("LLM provider '%s' failed (%s); trying fallback", label, exc)
                continue

        raise RuntimeError(
            f"All LLM providers failed after attempts {attempts}: {last_error}"
        )


def _extract_content(response: Any) -> str:
    """Pull the text content out of a LiteLLM/OpenAI-style response object."""
    # LiteLLM returns an OpenAI-style object; support both objects and dicts.
    try:
        return response["choices"][0]["message"]["content"]  # dict-like
    except (TypeError, KeyError, IndexError):
        pass
    try:
        return response.choices[0].message.content  # attribute-like
    except (AttributeError, IndexError):
        return ""


_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Return the shared :class:`LLMService` singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
