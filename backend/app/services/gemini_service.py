"""Service for interacting with Google Gemini API."""

import json
import logging
from typing import Dict, Any, List, Optional

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    
from app.utils.logger import setup_logger
from app.utils.cache import get_llm_cache, make_cache_key
from app.schemas.dashboard import (
    DashboardCommandResult,
    build_gemini_response_schema,
)
from pydantic import ValidationError

logger = setup_logger(__name__)


class GeminiService:
    """Service for Gemini API interactions."""
    
    def __init__(self, api_key: str = ""):
        """Initialize Gemini service.
        
        Args:
            api_key: Google Gemini API key.
        """
        self.api_key = api_key
        self.client: Optional[Any] = None
        self.cache = get_llm_cache()
        self._initialize_client()
    
    def _initialize_client(self) -> None:
        """Initialize Gemini client if API key is available."""
        if not GENAI_AVAILABLE:
            logger.warning("google-generativeai not installed")
            return
        
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            logger.warning("Gemini API key not configured")
            return
        
        try:
            genai.configure(api_key=self.api_key)
            self.client = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("Gemini client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Gemini service is available.
        
        Returns:
            True if Gemini client is initialized and available.
        """
        return self.client is not None
    
    async def process_command(
        self,
        query: str,
        current_widgets: List[Dict[str, Any]],
        telemetry: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process natural language command using Gemini API.
        
        Args:
            query: Natural language query from user.
            current_widgets: Current dashboard widgets.
            telemetry: Telemetry data for context.
            
        Returns:
            Dictionary with AI summary, feedback, and updated widgets.
        """
        if not self.is_available():
            raise ValueError("Gemini service not available")
        
        assert self.client is not None
        
        # Check the LLM response cache first. Identical dashboard queries
        # (same query + widgets + telemetry snapshot) are very common, so a
        # cache hit returns sub-100ms without an API round trip.
        cache_key = make_cache_key(
            "gemini:command",
            {
                "model": "gemini-1.5-flash",
                "query": query,
                "widgets": current_widgets,
                "telemetry": telemetry,
            },
        )
        cached = self.cache.get_validated(cache_key, DashboardCommandResult)
        if cached is not None:
            logger.info("Gemini command served from validated cache")
            return cached.model_dump()
            
        try:
            system_prompt = self._build_prompt(
                query=query,
                current_widgets=current_widgets,
                telemetry=telemetry
            )
            
            response = self._generate_content(system_prompt)
            
            # Parse response
            response_text = response.text
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            parsed_response = json.loads(response_text.strip())

            # Enforce the strict Pydantic V2 contract. If the model drifts from
            # the schema we raise, and the caller falls back to a safe response
            # rather than shipping a broken layout to React Flow / Framer Motion.
            validated = self._validate_response(parsed_response, current_widgets)

            logger.info("Gemini command processed and validated successfully")
            # Cache the *verified* schema directly so repetitive queries skip
            # the Pydantic re-validation cost on the next cache hit.
            self.cache.set_validated(cache_key, validated)
            return validated.model_dump()
            
        except Exception as e:
            logger.error(f"Error processing command with Gemini: {str(e)}")
            raise
    
    def _generate_content(self, system_prompt: str) -> Any:
        """Call Gemini, constraining output to our schema when supported.

        Different ``google-generativeai`` versions accept ``response_schema`` in
        slightly different forms. We attempt native structured output first and
        transparently fall back to plain JSON mode (still validated downstream
        by Pydantic) if the installed SDK rejects the schema.
        """
        assert self.client is not None
        try:
            return self.client.generate_content(
                system_prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    # Constrain generation to our strict UI schema so the model
                    # cannot emit widget shapes that would break the frontend.
                    "response_schema": build_gemini_response_schema(),
                },
            )
        except (TypeError, ValueError) as exc:
            logger.warning(
                "SDK rejected response_schema (%s); retrying with JSON mode only", exc
            )
            return self.client.generate_content(
                system_prompt,
                generation_config={"response_mime_type": "application/json"},
            )

    def _validate_response(
        self,
        parsed_response: Dict[str, Any],
        current_widgets: List[Dict[str, Any]],
    ) -> DashboardCommandResult:
        """Validate raw model output against the strict Pydantic contract.

        On validation failure we keep the safe parts (summary/feedback) and
        preserve the *existing* widgets rather than applying a malformed layout.
        """
        try:
            return DashboardCommandResult.model_validate(parsed_response)
        except ValidationError as exc:
            logger.warning("LLM output failed schema validation: %s", exc)
            # Degrade gracefully: keep textual insight, drop invalid widgets.
            summary = parsed_response.get("aiSummary", []) if isinstance(parsed_response, dict) else []
            safe = {
                "aiSummary": summary,
                "feedbackMessage": (
                    "Response received but the proposed layout was invalid, so "
                    "the current dashboard was preserved."
                ),
                "newWidgets": current_widgets,
                "status": "Nominal (Schema Guard)",
            }
            try:
                return DashboardCommandResult.model_validate(safe)
            except ValidationError:
                # Even the existing widgets are non-conforming: return no widgets.
                safe["newWidgets"] = []
                return DashboardCommandResult.model_validate(safe)
    
    def _build_prompt(self, query: str, current_widgets: List[Dict[str, Any]], telemetry: Dict[str, Any]) -> str:
        """Build system prompt for Gemini.
        
        Args:
            query: User query.
            current_widgets: Current widgets.
            telemetry: Telemetry data.
            
        Returns:
            Formatted system prompt.
        """
        return f"""You are the backend AI layout and analytics engine for "Gridify", a highly polished drag-and-drop telemetry dashboard.
The user provides a natural language query: "{query}".
        
Here is the current list of dashboard widgets:
{json.dumps(current_widgets, indent=2)}

Here is the raw telemetry data:
{json.dumps(telemetry, indent=2)}

Your job is to respond in JSON format, containing:
1. 'aiSummary': An array of 3-5 strings presenting concise, polished analytical bullet points or insights about the telemetry data relative to the query.
2. 'feedbackMessage': A clean, professional 1-sentence confirmation of what action you performed.
3. 'newWidgets': If the user asked to ADD a chart, CREATE a view, REMOVE a chart, or TOGGLE things, return the updated or newly designed array of widgets. Otherwise, return the currentWidgets.

Keep the tone helpful, professional, and objective.

Respond ONLY with valid JSON, no markdown formatting."""
