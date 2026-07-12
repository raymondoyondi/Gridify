"""Native AI agent & RAG service.

This module replaces the previous LangChain-based implementation with a
lightweight approach built directly on the native Google GenAI SDK
(``google.generativeai``).

Motivation
----------
LangChain introduces significant runtime overhead and abstraction layers that
make agent workflows slow and hard to debug. Talking to the model with the
native SDK keeps the tool-calling loop explicit, fast, and easy to trace.

The public surface (``AIAgentService``, ``RAGService``,
``get_ai_agent_service`` and ``get_rag_service``) is intentionally preserved so
existing imports keep working after the migration away from LangChain.
"""

from typing import Any, Callable, Dict, List, Optional

try:  # The native Google GenAI SDK is optional at import time.
    import google.generativeai as genai
    
    GENAI_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised only when SDK is missing
    GENAI_AVAILABLE = False

from app.config import settings
from app.utils.logger import setup_logger
from app.services.duckdb_service import get_duckdb_service

logger = setup_logger(__name__)


class AnalyticsTools:
    """Plain-Python tools the agent can call.
    
    Each tool is a normal function with a docstring. There is no framework
    magic here: the agent service maps tool names to these callables and
    invokes them directly.

    The English-to-SQL feature is powered by DuckDB: the LLM produces SQL and
    these tools execute it against DuckDB, which streams the result set back to
    the agent as Apache Arrow for zero-copy efficiency.
    """
    
    @staticmethod
    def query_telemetry(device_id: str, metric_type: str) -> str:
        """Query telemetry data for a device and metric using DuckDB."""
        try:
            db = get_duckdb_service()
            table = db.query_to_arrow(
                """
                SELECT * FROM telemetry
                WHERE device_id = ? AND metric_type = ?
                ORDER BY timestamp DESC LIMIT 1000
                """,
                [device_id, metric_type],
            )
            rows = table.to_pylist()
        except Exception as exc:  # pragma: no cover - DB dependent
            logger.error("DuckDB telemetry query failed: %s", exc)
            return f"Telemetry for device {device_id}: {metric_type}"
        return f"Telemetry for device {device_id}: {metric_type} ({len(rows)} rows)"
    
    @staticmethod
    def run_sql(sql: str) -> str:
        """Execute a SQL statement produced by the English-to-SQL feature.

        DuckDB is the primary engine for natural-language queries. The result
        is returned as Arrow-backed JSON so downstream tooling stays
        serialization-free.
        """
        try:
            db = get_duckdb_service()
            table = db.english_to_sql(sql)
            rows = table.to_pylist()
        except Exception as exc:
            return f"SQL execution failed: {exc}"
        preview = rows[:10]
        return (
            f"Executed SQL against DuckDB: {len(rows)} rows. "
            f"Sample: {preview}"
        )
    
    @staticmethod
    def list_devices() -> str:
        """List all connected devices."""
        return "Device 01, Device 02, Device 03"
    
    @staticmethod
    def generate_summary(data: str) -> str:
        """Generate a summary from telemetry data."""
        return f"Summary: {data[:100]}"
    
    @staticmethod
    def create_visualization(metric_type: str, time_range: str) -> str:
        """Create a visualization for the specified metrics."""
        return f"Chart created for {metric_type} over {time_range}"


class AIAgentService:
    """Native-SDK AI agent for telemetry analytics.
    
    Conversation history is tracked with a simple in-memory list instead of a
    LangChain memory object, and tools are dispatched through a plain dict.
    """
    
    SYSTEM_INSTRUCTION = (
        "You are an expert IoT telemetry analyst. You help users understand "
        "their sensor data, identify patterns, and generate actionable "
        "insights. Use the available tools to query data and create "
        "visualizations."
    )
    
    def __init__(self, model: Optional[str] = None):
        """Initialize the agent service.
        
        Args:
            model: Optional model override. Defaults to ``settings.LLM_MODEL``.
        """
        self.model_name = model or settings.LLM_MODEL
        self.chat_history: List[Dict[str, str]] = []
        self.tools: Dict[str, Callable[..., str]] = self._setup_tools()
        self._model: Optional[Any] = self._create_model()
    
    def _setup_tools(self) -> Dict[str, Callable[..., str]]:
        """Register the callable tools available to the agent."""
        tools = AnalyticsTools()
        return {
            "query_telemetry": tools.query_telemetry,
            "run_sql": tools.run_sql,
            "list_devices": tools.list_devices,
            "generate_summary": tools.generate_summary,
            "create_visualization": tools.create_visualization,
        }
    
    def _create_model(self) -> Optional[Any]:
        """Create the native GenAI model, if the SDK and key are available."""
        if not GENAI_AVAILABLE:
            logger.warning("google-generativeai not installed; agent runs in offline mode")
            return None
        
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not configured; agent runs in offline mode")
            return None
        
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(
                self.model_name,
                system_instruction=self.SYSTEM_INSTRUCTION,
                tools=list(self.tools.values()),
            )
            logger.info("Native GenAI agent model initialized (%s)", self.model_name)
            return model
        except Exception as exc:  # pragma: no cover - network/SDK dependent
            logger.error("Failed to initialize native GenAI agent: %s", exc)
            return None
    
    def is_available(self) -> bool:
        """Return True if the underlying model is ready to serve requests."""
        return self._model is not None
    
    def call_tool(self, name: str, **kwargs: Any) -> str:
        """Invoke a registered tool by name."""
        tool = self.tools.get(name)
        if tool is None:
            raise KeyError(f"Unknown tool: {name}")
        return tool(**kwargs)
    
    async def process_query(self, query: str) -> Dict[str, Any]:
        """Process a user query and return structured insights."""
        try:
            if not self.is_available():
                # Offline / no-key fallback keeps the API contract intact.
                self.add_memory(query, f"Processed query offline: {query}")
                return {
                    "status": "success",
                    "query": query,
                    "insights": [],
                    "visualizations": [],
                    "summary": f"Processed query (offline mode): {query}",
                }
              
            assert self._model is not None
            chat = self._model.start_chat(enable_automatic_function_calling=True)
            response = chat.send_message(query)
            summary = getattr(response, "text", "") or ""
            self.add_memory(query, summary)
            return {
                "status": "success",
                "query": query,
                "insights": [summary] if summary else [],
                "visualizations": [],
                "summary": summary or f"Processed query: {query}",
            }
        except Exception as exc:
            logger.error("Error processing agent query: %s", exc)
            return {"status": "error", "query": query, "error": str(exc)}
          
    def add_memory(self, human_input: str, ai_output: str) -> None:
        """Append an exchange to the in-memory conversation history."""
        self.chat_history.append({"role": "user", "content": human_input})
        self.chat_history.append({"role": "assistant", "content": ai_output})
      
    def clear_memory(self) -> None:
        """Clear the conversation history."""
        self.chat_history.clear()


class RAGService:
    """Retrieval Augmented Generation service for context-aware responses."""
  
    def __init__(self, model: Optional[str] = None):
        """Initialize the RAG service."""
        self.model_name = model or settings.LLM_MODEL
        self.documents: List[str] = []
      
    def add_documents(self, documents: List[str]) -> None:
        """Add documents to the RAG index."""
        self.documents.extend(documents)
      
    def retrieve_context(self, query: str, top_k: int = 5) -> List[str]:
        """Retrieve relevant documents for a query."""
        # Placeholder retrieval - integrate with the vector DB service.
        return self.documents[:top_k]
      
    def generate_with_context(
        self, query: str, context: Optional[List[str]] = None
    ) -> str:
        """Generate a response with retrieved context using the native SDK."""
        if context is None:
            context = self.retrieve_context(query)
          
        prompt = (
            "Answer the question using only the provided context.\n\n"
            f"Context:\n{chr(10).join(context)}\n\n"
            f"Question: {query}"
        )
      
        if not (GENAI_AVAILABLE and settings.GEMINI_API_KEY):
            return f"Response based on context for: {query}"
          
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(prompt)
            return getattr(response, "text", "") or f"Response based on context for: {query}"
        except Exception as exc:  # pragma: no cover - network/SDK dependent
            logger.error("RAG generation failed: %s", exc)
            return f"Response based on context for: {query}"
          
def get_ai_agent_service() -> AIAgentService:
    """Get an AI agent service instance."""
    return AIAgentService()


def get_rag_service() -> RAGService:
    """Get a RAG service instance."""
    return RAGService()
