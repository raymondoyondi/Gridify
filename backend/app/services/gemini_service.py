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
        try:
            system_prompt = self._build_prompt(
                query=query,
                current_widgets=current_widgets,
                telemetry=telemetry
            )
            
            response = self.client.generate_content(
                system_prompt,
                generation_config={
                    "response_mime_type": "application/json",
                }
            )
            
            # Parse response
            response_text = response.text
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            parsed_response = json.loads(response_text.strip())
            
            logger.info("Gemini command processed successfully")
            return {
                "aiSummary": parsed_response.get("aiSummary", []),
                "feedbackMessage": parsed_response.get("feedbackMessage", ""),
                "newWidgets": parsed_response.get("newWidgets", current_widgets),
                "status": "Nominal"
            }
            
        except Exception as e:
            logger.error(f"Error processing command with Gemini: {str(e)}")
            raise
    
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
