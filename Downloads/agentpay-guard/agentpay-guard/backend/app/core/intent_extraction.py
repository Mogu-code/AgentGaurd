"""
Intent extraction layer.

Converts a one-time natural-language authorization ("Buy me a laptop for
college, don't spend more than 70k") into a structured AgentCapability. This
runs ONCE per session at authorization time — not per payment action — which
is the key architectural point: the LLM's influence is confined to a single,
human-reviewable structured output, stored immutably for the session. Every
subsequent payment ACTION is validated against that stored capability by pure
deterministic code (policy_engine.py), not by asking the LLM again.

This MVP ships a deterministic regex/rule-based extractor by default so the
whole pipeline runs with zero external API dependency. A real LLM call
(Claude, via the Anthropic API) can be swapped in behind the same
`extract_intent()` interface — see USE_LLM below — but the output MUST still
be validated against the JSON schema before being trusted, and a human should
be able to review the structured result before capability activation in a
production version.
"""
from __future__ import annotations
import re
from dataclasses import asdict
from typing import Optional

from backend.app.core.capability import AgentCapability

USE_LLM = False  # flip on + implement call_llm_extractor() to use a real LLM


def extract_intent_rule_based(nl_text: str, user_id: str, agent_id: str, capability_id: str) -> AgentCapability:
    """Deterministic, auditable fallback extractor. Intentionally simple:
    good enough for structured demo scenarios, not a claim of general NLU."""
    text = nl_text.lower()

    # amount: "70k", "70000", "₹70,000"
    max_amount = 50000.0
    amt_match = re.search(r"(\d[\d,]*)\s*k\b", text)
    if amt_match:
        max_amount = float(amt_match.group(1).replace(",", "")) * 1000
    else:
        amt_match = re.search(r"(?:₹|rs\.?|inr)\s*([\d,]+)", text)
        if amt_match:
            max_amount = float(amt_match.group(1).replace(",", ""))

    quantity = 1
    qty_match = re.search(r"\b(\d+)\s*(?:units|items|pieces|x)\b", text)
    if qty_match:
        quantity = int(qty_match.group(1))

    category_keywords = {
        "electronics": ["laptop", "phone", "electronics", "gadget", "headphone", "keyboard"],
        "books": ["book", "textbook"],
        "groceries": ["grocery", "groceries", "vegetable", "food"],
        "fashion": ["shirt", "clothes", "fashion", "shoes"],
        "subscriptions": ["subscription", "plan", "recharge"],
        "travel": ["flight", "hotel", "travel", "ticket"],
    }
    category = "electronics"
    for cat, kws in category_keywords.items():
        if any(kw in text for kw in kws):
            category = cat
            break

    approval_threshold = max_amount * 0.7  # anything above 70% of the max requires step-up by default

    return AgentCapability(
        capability_id=capability_id,
        user_id=user_id,
        agent_id=agent_id,
        max_amount=max_amount,
        max_quantity=max(quantity, 1),
        allowed_categories=[category],
        blocked_merchants=[],
        approval_threshold=approval_threshold,
        max_daily_spend=max_amount * 1.5,
        expires_at=None,
        version=1,
    )


def extract_intent(nl_text: str, user_id: str, agent_id: str, capability_id: str) -> dict:
    cap = extract_intent_rule_based(nl_text, user_id, agent_id, capability_id)
    return {
        "capability": asdict(cap),
        "source_text": nl_text,
        "extraction_method": "rule_based_v1",
    }
