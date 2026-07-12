"""Tests for the native (non-LangChain) AI agent service."""

import pytest

from app.services.agent_service import (
    AIAgentService,
    AnalyticsTools,
    RAGService,
    get_ai_agent_service,
    get_rag_service,
)


def test_agent_service_has_native_tools():
    """The agent registers plain callable tools (no LangChain objects)."""
    agent = AIAgentService()
    assert set(agent.tools) == {
        "query_telemetry",
        "run_sql",
        "list_devices",
        "generate_summary",
        "create_visualization",
    }


def test_call_tool_dispatches_to_callable():
    agent = AIAgentService()
    result = agent.call_tool("list_devices")
    assert "Device 01" in result


def test_call_unknown_tool_raises():
    agent = AIAgentService()
    with pytest.raises(KeyError):
        agent.call_tool("does_not_exist")


def test_memory_add_and_clear():
    agent = AIAgentService()
    agent.add_memory("hello", "world")
    assert len(agent.chat_history) == 2
    agent.clear_memory()
    assert agent.chat_history == []


@pytest.mark.asyncio
async def test_process_query_offline_fallback():
    """Without an API key the agent returns a graceful offline response."""
    agent = AIAgentService()
    agent._model = None  # force offline mode
    result = await agent.process_query("summarize telemetry")
    assert result["status"] == "success"
    assert "summarize telemetry" in result["summary"]


def test_rag_service_context_generation_offline():
    rag = RAGService()
    rag.add_documents(["doc one", "doc two"])
    assert rag.retrieve_context("q", top_k=1) == ["doc one"]
    # Offline (no key) returns a deterministic placeholder response.
    out = rag.generate_with_context("what is up?")
    assert "what is up?" in out

  
def test_factory_functions():
    assert isinstance(get_ai_agent_service(), AIAgentService)
    assert isinstance(get_rag_service(), RAGService)
    assert isinstance(AnalyticsTools.query_telemetry("d1", "temp"), str)
