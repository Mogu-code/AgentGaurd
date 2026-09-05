import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from backend.app.core.intent_extraction import extract_intent
import os
import json

from unittest.mock import patch

def test_extract_intent_rule_based_fallback(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "none")
    result = extract_intent("buy a laptop under 60k", "u1", "a1", "c1")
    assert result["extraction_method"] == "rule_based_v1"
    assert result["capability"]["max_amount"] == 60000.0

@patch("backend.app.core.intent_extraction.httpx.post")
def test_extract_intent_llm_fallback_on_failure(mock_post, monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # Simulate a timeout or failure
    import httpx
    mock_post.side_effect = httpx.ReadTimeout("Timeout")
    
    result = extract_intent("buy a laptop under 60k", "u1", "a1", "c1")
    
    assert result["fallback"] is True
    assert result["extraction_method"] == "rule_based_v1"
    assert result["capability"]["max_amount"] == 60000.0
