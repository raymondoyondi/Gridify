"""Lightweight helper to call Ollama CLI for Llama 3 prompts.

This wrapper shells out to the `ollama` CLI. It does not implement the Ollama API — it
assumes you have Ollama installed locally and the desired Llama 3 model pulled.

Example:
    from llm.ollama_client import run_prompt
    out = run_prompt("Summarize this data: ...", model="llama3", temperature=0.2)
"""
from __future__ import annotations

import shutil
import subprocess
import json
from typing import Optional


class OllamaError(RuntimeError):
    pass


def _ollama_available() -> bool:
    return shutil.which("ollama") is not None


def run_prompt(prompt: str, model: str = "llama3", temperature: float = 0.0, max_tokens: int = 512, timeout: Optional[int] = 60) -> str:
    """Run a prompt through the local Ollama CLI and return the assistant text output.

    Note: command-line flags for Ollama may vary by version. This wrapper uses a conservative
    invocation compatible with common Ollama releases: `ollama run <model> --prompt <text>`.

    Raises OllamaError if the CLI is not found or the call fails.
    """
    if not _ollama_available():
        raise OllamaError("The `ollama` CLI was not found on PATH. Install Ollama and ensure it's available.")

    # Build the CLI command. Adjust flags if your local ollama requires different args.
    cmd = ["ollama", "run", model, "--prompt", prompt, "--temperature", str(temperature), "--max_tokens", str(max_tokens)]

    try:
        completed = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.SubprocessError as e:
        raise OllamaError(f"Failed to run ollama: {e}") from e

    if completed.returncode != 0:
        raise OllamaError(f"Ollama CLI returned non-zero exit code: {completed.returncode}\n{completed.stderr}")

    # Ollama typically prints the model output to stdout. Some versions also output JSON — try to handle both.
    out = completed.stdout.strip()
    # If output looks like JSON with a `content` or `text` field, try to parse it.
    try:
        parsed = json.loads(out)
        if isinstance(parsed, dict):
            # common keys: 'result', 'content', 'text'
            for key in ("result", "content", "text"):
                if key in parsed:
                    return parsed[key]
            # fallback to stringified JSON
            return json.dumps(parsed)
    except json.JSONDecodeError:
        pass

    return out


if __name__ == "__main__":
    # small demo when run directly
    try:
        example = run_prompt("Say hello from Ollama!", model="llama3", temperature=0.0)
        print(example)
    except OllamaError as e:
        print("Ollama not available or failed:", e)
