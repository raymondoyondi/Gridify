"""Asynchronous prompt-injection guardrails in the network layer.

Previously the guardrail scan ran *synchronously* inside the Gemini request
handler, adding latency before the first token and blocking the event loop on the
(optional) NeMo pass. Guardrails now live in an ASGI middleware — the network
boundary — so they execute *off* the synchronous request path:

* The cheap heuristic scan runs via ``asyncio.to_thread`` (off the event loop),
  keeping time-to-first-token responsive.
* When ``GUARDRAILS_EDGE_URL`` is configured, the check is delegated to a
  lightweight edge microservice / API gateway, so the heavy safety logic never
  touches the FastAPI worker at all. If the edge is unreachable we degrade
  gracefully back to the in-process heuristic rather than failing the request.

Blocked prompts return HTTP 400 before the body ever reaches the handler.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Awaitable, Callable, Optional, Set

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.services.guardrails import get_guardrails_service

logger = logging.getLogger(__name__)


class AsyncGuardrailMiddleware(BaseHTTPMiddleware):
    """Runs prompt-injection guardrails at the async network boundary."""

    def __init__(
        self,
        app,
        protected_paths: Optional[Set[str]] = None,
    ) -> None:
        super().__init__(app)
        self.guardrails = (
            get_guardrails_service() if settings.GUARDRAILS_ENABLED else None
        )
        self.protected_paths = protected_paths or {"/api/gemini/command"}
        self.edge_url: Optional[str] = settings.GUARDRAILS_EDGE_URL

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if (
            request.method != "POST"
            or request.url.path not in self.protected_paths
            or self.guardrails is None
        ):
            return await call_next(request)

        # Reading the body here also caches it on the Starlette Request, so the
        # downstream handler's own body parsing reuses the same bytes.
        try:
            body = await request.body()
            payload = json.loads(body) if body else {}
            prompt = payload.get("query", "")
        except Exception:
            return await call_next(request)

        allowed = await self._check(prompt)
        if not allowed:
            logger.warning(
                "Guardrail (%s) blocked query at network layer",
                "edge" if self.edge_url else self.guardrails.backend,
            )
            return JSONResponse(
                status_code=400,
                content={"detail": "Query blocked by content guardrails."},
            )

        return await call_next(request)

    async def _check(self, prompt: str) -> bool:
        """Run the guardrail off the synchronous path.

        Prefers a remote edge service; otherwise the in-process heuristic scan
        runs in a worker thread so it never blocks the event loop / TTF token.
        """
        if self.edge_url:
            return await self._check_edge(prompt)
        result = await asyncio.to_thread(self.guardrails.check_input, prompt)
        return result.allowed

    async def _check_edge(self, prompt: str) -> bool:  # pragma: no cover - needs live edge svc
        try:
            import httpx

            async with httpx.AsyncClient(timeout=1.0) as client:
                resp = await client.post(self.edge_url, json={"prompt": prompt})
                if resp.status_code == 200:
                    data = resp.json()
                    return bool(data.get("allowed", True))
                # Non-200 from the edge => treat as blocked for safety.
                return False
        except Exception as exc:
            logger.warning(
                "Edge guardrail unreachable (%s); degrading to heuristic", exc
            )
            result = await asyncio.to_thread(self.guardrails.check_input, prompt)
            return result.allowed
