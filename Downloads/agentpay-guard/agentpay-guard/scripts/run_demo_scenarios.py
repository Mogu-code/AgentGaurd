"""
Reproducible demo scenarios — runs against the FastAPI app in-process (no
server needed) so this is deterministic and CI-friendly. These are the exact
5 scenarios required by the brief.

Run:
    python scripts/run_demo_scenarios.py
"""
import json
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def pretty(title, resp):
    print(f"\n{'=' * 70}\n{title}\n{'=' * 70}")
    print(json.dumps(resp, indent=2, default=str))


def authorize(nl_text, user_id, agent_id):
    r = client.post("/guard/authorize", json={"nl_text": nl_text, "user_id": user_id, "agent_id": agent_id})
    r.raise_for_status()
    return r.json()


def evaluate(**kwargs):
    r = client.post("/guard/evaluate", json=kwargs)
    return r.json()


def scenario_1_legit():
    auth = authorize("Buy me a laptop for college, don't spend more than 70k.", "user_1", "agent_1")
    time.sleep(3)  # simulate the agent actually browsing/comparing before paying (realistic session duration)
    result = evaluate(
        session_id=auth["session_id"], capability_id=auth["capability_id"],
        amount=38499, quantity=1, category="electronics", merchant="merchant_005",
        merchant_known=True,  # merchant already trusted in this user's purchase history
    )
    pretty("SCENARIO 1 — Legitimate purchase within authorization -> expect ALLOW", result)
    assert result["outcome"] == "ALLOW", f"Expected ALLOW, got {result['outcome']}"


def scenario_2_amount_manipulation():
    auth = authorize("Buy a keyboard, don't spend more than ₹3,000.", "user_2", "agent_1")
    result = evaluate(
        session_id=auth["session_id"], capability_id=auth["capability_id"],
        amount=7500, quantity=1, category="electronics", merchant="merchant_010",
    )
    pretty("SCENARIO 2 — Agent requests amount above authorization -> expect BLOCK", result)
    assert result["outcome"] == "BLOCK"
    assert any("AMOUNT_EXCEEDS_AUTHORIZATION" in r for r in result["reasons"])


def scenario_3_quantity_velocity_manipulation():
    auth = authorize("Buy one keyboard, don't spend more than ₹3,000.", "user_3", "agent_1")
    r1 = evaluate(session_id=auth["session_id"], capability_id=auth["capability_id"],
                   amount=2499, quantity=5, category="electronics", merchant="merchant_020")
    pretty("SCENARIO 3a — Quantity manipulation (5x instead of 1) -> expect BLOCK", r1)
    assert r1["outcome"] == "BLOCK"

    # velocity: fire several rapid requests in the same session
    last = None
    for i in range(4):
        last = evaluate(session_id=auth["session_id"], capability_id=auth["capability_id"],
                         amount=1200, quantity=1, category="electronics", merchant="merchant_020",
                         idempotency_key=f"velocity_test_{i}")
    pretty("SCENARIO 3b — Velocity abuse (rapid repeated requests) -> expect BLOCK", last)
    assert last["outcome"] == "BLOCK"


def scenario_4_replay():
    auth = authorize("Buy a book, don't spend more than ₹1,000.", "user_4", "agent_1")
    first = evaluate(session_id=auth["session_id"], capability_id=auth["capability_id"],
                      amount=450, quantity=1, category="books", merchant="merchant_030",
                      merchant_known=True, idempotency_key="fixed_key_1")
    pretty("SCENARIO 4a — First payment with idempotency key -> expect ALLOW", first)
    replay = evaluate(session_id=auth["session_id"], capability_id=auth["capability_id"],
                       amount=450, quantity=1, category="books", merchant="merchant_030",
                       merchant_known=True, idempotency_key="fixed_key_1")
    pretty("SCENARIO 4b — Replayed request with SAME idempotency key -> expect BLOCK", replay)
    assert replay["outcome"] == "BLOCK"
    assert any("REPLAY_DETECTED" in r for r in replay["reasons"])


def scenario_5_timeout_no_blind_retry():
    auth = authorize("Buy groceries, don't spend more than ₹2,000.", "user_5", "agent_1")
    result = evaluate(session_id=auth["session_id"], capability_id=auth["capability_id"],
                       amount=800, quantity=1, category="groceries", merchant="merchant_040",
                       merchant_known=True, simulate_timeout=True)
    pretty("SCENARIO 5 — Razorpay API timeout -> expect ALLOW decision but PENDING payment state, no blind retry", result)
    assert result["outcome"] == "ALLOW"
    assert result["razorpay"]["status"] == "pending"


def audit_verification():
    r = client.get("/guard/audit/verify")
    pretty("AUDIT CHAIN VERIFICATION", r.json())
    assert r.json()["valid"] is True


if __name__ == "__main__":
    scenario_1_legit()
    scenario_2_amount_manipulation()
    scenario_3_quantity_velocity_manipulation()
    scenario_4_replay()
    scenario_5_timeout_no_blind_retry()
    audit_verification()
    print("\n\nALL 5 DEMO SCENARIOS + AUDIT VERIFICATION PASSED.")
