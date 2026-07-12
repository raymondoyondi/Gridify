"""Prompt-injection & content guardrails for the LLM entrypoints.

Two layers of protection:

1. **Heuristic scanner** (always on, zero external deps): fast regex/keyword
   detection of the most common prompt-injection and jailbreak patterns. This
   keeps the app protected even when the heavier stack is not installed.
2. **NVIDIA NeMo Guardrails** (optional): if ``nemoguardrails`` is installed and
   a config directory is present (``backend/guardrails``), it is used as the
   authoritative rail. See ``backend/guardrails/README.md`` for the Colang
   config that ships with the repo.

The public :class:`GuardrailsService` degrades gracefully: a failure in the
NeMo layer falls back to the heuristic layer rather than failing the request.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List, Optional

from app.utils.logger import setup_logger

logger = setup_logger(__name__)

try:  # NeMo Guardrails is optional and heavy; import defensively.
    from nemoguardrails import LLMRails, RailsConfig  # type: ignore

    NEMO_AVAILABLE = True
except Exception:  # pragma: no cover - exercised only when NeMo missing
    NEMO_AVAILABLE = False


# Common prompt-injection / jailbreak signatures. Kept deliberately narrow to
# avoid false positives on legitimate analytics questions.
_INJECTION_PATTERNS: List[re.Pattern] = [
    re.compile(r"ignore\s+(all\s+|the\s+)?(previous|prior|above)\s+instructions", re.I),
    re.compile(r"disregard\s+(all\s+|the\s+)?(previous|prior|above)", re.I),
    re.compile(r"forget\s+(everything|all)\s+(you|previous)", re.I),
    re.compile(r"you\s+are\s+now\s+(a|an|in)\b", re.I),
    re.compile(r"\bdeveloper\s+mode\b", re.I),
    re.compile(r"\bDAN\b"),
    re.compile(r"\bjailbreak\b", re.I),
    re.compile(r"reveal\s+(your\s+)?(system\s+prompt|instructions|prompt)", re.I),
    re.compile(r"print\s+(your\s+)?(system\s+prompt|instructions)", re.I),
    re.compile(r"(bypass|override|disable)\s+(the\s+)?(safety|guardrail|filter)", re.I),
    re.compile(r"act\s+as\s+(if\s+you\s+are\s+)?(an?\s+)?unrestricted", re.I),
]

# Secrets / exfiltration attempts we never want the model to be asked about.
_SENSITIVE_PATTERNS: List[re.Pattern] = [
    re.compile(r"\b(api[_-]?key|secret|password|token|credential)s?\b", re.I),
    re.compile(r"\.env\b", re.I),
]

MAX_INPUT_CHARS = 4000


@dataclass
class GuardrailResult:
    """Outcome of a guardrail check."""

    allowed: bool
    reason: str = ""
    matched_rules: List[str] = field(default_factory=list)
    sanitized_text: Optional[str] = None


class GuardrailsService:
    """Validates inbound prompts (and optionally outbound responses)."""

    def __init__(self, config_path: Optional[str] = None, use_nemo: bool = True):
        self.config_path = config_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "guardrails"
        )
        self._rails: Optional["LLMRails"] = None
        if use_nemo and NEMO_AVAILABLE and os.path.isdir(self.config_path):
            self._rails = self._init_nemo()

    def _init_nemo(self) -> Optional["LLMRails"]:
        try:
            config = RailsConfig.from_path(self.config_path)
            rails = LLMRails(config)
            logger.info("NeMo Guardrails initialised from %s", self.config_path)
            return rails
        except Exception as exc:  # pragma: no cover - depends on optional dep
            logger.warning("Falling back to heuristic guardrails (NeMo init failed: %s)", exc)
            return None

    @property
    def backend(self) -> str:
        return "nemo" if self._rails is not None else "heuristic"

    def check_input(self, text: str) -> GuardrailResult:
        """Validate a user prompt before it reaches the LLM."""
        if text is None:
            return GuardrailResult(allowed=False, reason="empty input")

        stripped = text.strip()
        if not stripped:
            return GuardrailResult(allowed=False, reason="empty input")

        if len(stripped) > MAX_INPUT_CHARS:
            return GuardrailResult(
                allowed=False,
                reason=f"input exceeds {MAX_INPUT_CHARS} characters",
                matched_rules=["length_limit"],
            )

        heuristic = self._heuristic_check(stripped)
        if not heuristic.allowed:
            return heuristic

        # NeMo runs only after cheap heuristics pass, to save latency/cost.
        if self._rails is not None:
            try:
                nemo_result = self._nemo_check(stripped)
                if not nemo_result.allowed:
                    return nemo_result
            except Exception as exc:  # pragma: no cover - depends on optional dep
                logger.warning("NeMo check errored, using heuristic result: %s", exc)

        return GuardrailResult(allowed=True, sanitized_text=stripped)

    def _heuristic_check(self, text: str) -> GuardrailResult:
        matched: List[str] = []
        for pattern in _INJECTION_PATTERNS:
            if pattern.search(text):
                matched.append(f"injection:{pattern.pattern[:40]}")
        for pattern in _SENSITIVE_PATTERNS:
            if pattern.search(text):
                matched.append(f"sensitive:{pattern.pattern[:40]}")

        if matched:
            logger.warning("Guardrail blocked input (%s)", matched)
            return GuardrailResult(
                allowed=False,
                reason="Prompt blocked: possible prompt-injection or sensitive-data request.",
                matched_rules=matched,
            )
        return GuardrailResult(allowed=True, sanitized_text=text)

    def _nemo_check(self, text: str) -> GuardrailResult:  # pragma: no cover - optional dep
        response = self._rails.generate(  # type: ignore[union-attr]
            messages=[{"role": "user", "content": text}]
        )
        content = (response or {}).get("content", "") if isinstance(response, dict) else ""
        # NeMo returns a refusal message when a rail trips.
        refusal_markers = ("i can't", "i cannot", "i'm not able", "i am not able")
        if content and any(marker in content.lower() for marker in refusal_markers):
            return GuardrailResult(
                allowed=False,
                reason=content,
                matched_rules=["nemo_rail"],
            )
        return GuardrailResult(allowed=True, sanitized_text=text)


_guardrails: Optional[GuardrailsService] = None


def get_guardrails_service() -> GuardrailsService:
    """Return the shared :class:`GuardrailsService` singleton."""
    global _guardrails
    if _guardrails is None:
        _guardrails = GuardrailsService()
    return _guardrails
