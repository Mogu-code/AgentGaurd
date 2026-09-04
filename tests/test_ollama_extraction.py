import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest
from backend.app.core.intent_extraction import extract_intent
import os
import json

def test_extract_intent_rule_based_fallback(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "none")
    result = extract_intent("buy a laptop under 60k", "u1", "a1", "c1")
    assert result["extraction_method"] == "rule_based_v1"
    assert result["capability"]["max_amount"] == 60000.0

def test_extract_intent_llm_fallback_on_failure(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # We don't have a real ollama server running in tests by default, 
    # so it should fail to connect and fallback to rule-based.
    result = extract_intent("buy a laptop under 60k", "u1", "a1", "c1")
    
    # Since Ollama is likely not running during CI/test run, it should fallback
    assert result["fallback"] is True
    assert result["extraction_method"] == "rule_based_v1"
    assert result["capability"]["max_amount"] == 60000.0
