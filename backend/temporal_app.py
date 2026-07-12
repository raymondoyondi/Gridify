"""Temporal application for durable execution (optional).

Migrating long-running dashboard generations, vector sync tasks, and database
queries from Celery to Temporal offers durable execution, allowing workflows to
natively pause, resume, and track deep historical states securely.

Temporal runs alongside Celery — existing Celery tasks keep working while new
workflows are authored as Temporal workflows.
"""

from __future__ import annotations

from typing import Any

from app.config import settings
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

try:  # temporalio is optional; import defensively.
    from temporalio import workflow, activity  # type: ignore

    TEMPORAL_AVAILABLE = True
except Exception:  # pragma: no cover - optional dep
    TEMPORAL_AVAILABLE = False


if TEMPORAL_AVAILABLE:

    @workflow.defn  # type: ignore[misc]
    class DashboardGenerationWorkflow:
        """Durable workflow for generating a dashboard layout.

        Replaces the Celery task ``generate_ai_insights`` with a workflow that
        can survive worker restarts, retries individual steps, and tracks full
        execution history in the Temporal server.
        """

        @workflow.run  # type: ignore[misc]
        async def run(self, query: str, context: dict[str, Any]) -> dict[str, Any]:
            logger.info("Temporal DashboardGenerationWorkflow started for: %s", query)
            # Step 1: validate query
            validated = await workflow.execute_activity(
                _validate_query_activity,
                query,
                start_to_close_timeout=60,
            )
            # Step 2: generate insights (long-running, retryable)
            insights = await workflow.execute_activity(
                _generate_insights_activity,
                validated,
                context,
                start_to_close_timeout=300,
                heartbeat_timeout=30,
                retry_policy=workflow.RetryPolicy(
                    maximum_attempts=3,
                    initial_interval=5,
                    maximum_interval=60,
                ),
            )
            logger.info("Temporal DashboardGenerationWorkflow completed")
            return {"status": "success", "insights": insights}

    @workflow.defn  # type: ignore[misc]
    class TelemetrySyncWorkflow:
        """Durable workflow for syncing telemetry data.

        Replaces ad-hoc Celery data processing with a workflow that can be
        queried for its current state, retried on failure, and resumed after
        deployments.
        """

        @workflow.run  # type: ignore[misc]
        async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
            logger.info("Temporal TelemetrySyncWorkflow started")
            processed = await workflow.execute_activity(
                _sync_telemetry_activity,
                payload,
                start_to_close_timeout=600,
                heartbeat_timeout=60,
            )
            logger.info("Temporal TelemetrySyncWorkflow completed")
            return {"status": "success", "processed": processed}

    # Activity stubs — real implementations would call the existing services.
    @activity.defn  # type: ignore[misc]
    async def _validate_query_activity(query: str) -> str:
        return query.strip()

    @activity.defn  # type: ignore[misc]
    async def _generate_insights_activity(query: str, context: dict[str, Any]) -> list[str]:
        return [f"Temporal insight for: {query}"]

    @activity.defn  # type: ignore[misc]
    async def _sync_telemetry_activity(payload: dict[str, Any]) -> int:
        return len(payload.get("devices", []))

else:  # pragma: no cover - Temporal not installed

    class DashboardGenerationWorkflow:  # type: ignore[no-redef]
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise RuntimeError("temporalio is not installed")

    class TelemetrySyncWorkflow:  # type: ignore[no-redef]
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            raise RuntimeError("temporalio is not installed")


def get_temporal_workflows() -> dict[str, Any]:
    """Return the Temporal workflow classes available in this environment."""
    return {
        "dashboard_generation": DashboardGenerationWorkflow,
        "telemetry_sync": TelemetrySyncWorkflow,
    }
