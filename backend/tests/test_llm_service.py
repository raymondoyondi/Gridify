"""Tests for the multi-provider LLM service with fallback."""

import pytest

from app.services import llm_service as llm_mod
from app.services.llm_service import LLMService


def _fake_response(text: str):
    return {"choices": [{"message": {"content": text}}]}


def test_primary_success(monkeypatch):
    monkeypatch.setattr(llm_mod.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(llm_mod.settings, "VLLM_BASE_URL", "http://vllm:8000/v1")

    calls = []

    def fake_completion(**kwargs):
        calls.append(kwargs["model"])
        return _fake_response("primary answer")

    svc = LLMService(completion_fn=fake_completion)
    result = svc.complete([{"role": "user", "content": "hi"}])
    assert result["content"] == "primary answer"
    assert result["model"] == "gemini-primary"
    assert len(calls) == 1  # fallback not used


def test_falls_back_on_primary_error(monkeypatch):
    monkeypatch.setattr(llm_mod.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(llm_mod.settings, "VLLM_BASE_URL", "http://vllm:8000/v1")

    def flaky_completion(**kwargs):
        if kwargs["model"].startswith("gemini/"):
            raise RuntimeError("429 rate limit")
        return _fake_response("fallback answer")

    svc = LLMService(completion_fn=flaky_completion)
    result = svc.complete([{"role": "user", "content": "hi"}])
    assert result["content"] == "fallback answer"
    assert result["model"] == "vllm-fallback"
    assert result["attempts"] == ["gemini-primary", "vllm-fallback"]


def test_all_providers_fail(monkeypatch):
    monkeypatch.setattr(llm_mod.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(llm_mod.settings, "VLLM_BASE_URL", "http://vllm:8000/v1")

    def always_fail(**kwargs):
        raise RuntimeError("down")

    svc = LLMService(completion_fn=always_fail)
    with pytest.raises(RuntimeError, match="All LLM providers failed"):
        svc.complete([{"role": "user", "content": "hi"}])


def test_not_available_without_config(monkeypatch):
    monkeypatch.setattr(llm_mod.settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(llm_mod.settings, "VLLM_BASE_URL", None)
    svc = LLMService(completion_fn=lambda **k: _fake_response("x"))
    assert svc.is_available() is False
    with pytest.raises(RuntimeError, match="No LLM provider configured"):
        svc.complete([{"role": "user", "content": "hi"}])
