"""
AgentPay Guard — FastAPI application.

Endpoints:
  POST /guard/authorize      one-time NL authorization -> structured capability (stored)
  POST /guard/evaluate       per-action payment request -> policy+ML decision -> (Razorpay call on ALLOW)
  GET  /guard/audit          recent audit records
  GET  /guard/audit/verify   recompute hash chain, report tamper status
  GET  /health

Run:
  uvicorn backend.app.main:app --reload --port 8000
"""
from __future__ import annotations
import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.audit.hash_chain import AuditChain
from backend.app.core.capability import AgentCapability
from backend.app.core.decision_engine import decide
from backend.app.core.explainability import build_explanation
from backend.app.core.intent_extraction import extract_intent
from backend.app.core.policy_engine import PaymentRequest, VelocityStore, evaluate_policy
from backend.app.ml.risk_model import get_risk_model
from backend.app.razorpay_client import get_razorpay_client, get_razorpay_mode

app = FastAPI(title="AgentPay Guard", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---- process-local state (fine for hackathon MVP; see docs/ARCHITECTURE.md for
# how this maps onto Postgres/Redis in a multi-instance deployment) ----
CAPABILITIES: Dict[str, AgentCapability] = {}
SESSION_STATS: Dict[str, dict] = {}  # session_id -> {tool_calls, start_time, hist_avg_amount, ...}
VELOCITY_STORE = VelocityStore()
AUDIT = AuditChain()
RISK_MODEL = get_risk_model()
RAZORPAY = get_razorpay_client()


class AuthorizeRequest(BaseModel):
    nl_text: str
    user_id: str
    agent_id: str


class PaymentActionRequest(BaseModel):
    session_id: str
    capability_id: str
    amount: float
    quantity: int = 1
    category: str
    merchant: str
    merchant_known: Optional[bool] = None
    idempotency_key: Optional[str] = None
    simulate_timeout: bool = False


@app.get("/health")
def health():
    return {"status": "ok", "ml_model_available": RISK_MODEL.available, "model_name": RISK_MODEL.model_name}


@app.post("/guard/authorize")
def authorize(req: AuthorizeRequest):
    """One-time, per-session structured authorization from natural language.
    This is the ONLY place the (currently rule-based, LLM-swappable) intent
    extractor runs. Everything downstream is deterministic."""
    capability_id = f"cap_{uuid.uuid4().hex[:10]}"
    result = extract_intent(req.nl_text, req.user_id, req.agent_id, capability_id)
    cap_dict = result["capability"]
    cap = AgentCapability(**{**cap_dict, "expires_at": None})
    CAPABILITIES[capability_id] = cap

    session_id = f"sess_{uuid.uuid4().hex[:10]}"
    SESSION_STATS[session_id] = {
        "capability_id": capability_id,
        "tool_calls": 0,
        "start_time": time.time(),
        "hist_avg_amount": cap.max_amount * 0.5,  # cold-start assumption; would come from user history in prod
        "known_merchants": [],
    }

    AUDIT.append({
        "event": "AUTHORIZATION_CREATED",
        "session_id": session_id,
        "capability_id": capability_id,
        "user_id": req.user_id,
        "agent_id": req.agent_id,
        "source_text": req.nl_text,
        "extracted_capability": cap_dict,
    })

    return {"session_id": session_id, "capability_id": capability_id, "capability": cap_dict,
            "extraction": result}


@app.post("/guard/evaluate")
def evaluate(req: PaymentActionRequest):
    """Evaluate a single agent-generated payment request. Returns ALLOW/STEP_UP/BLOCK
    with a full explanation, and calls the Razorpay (test/mock) client on ALLOW."""
    cap = CAPABILITIES.get(req.capability_id)
    if cap is None:
        raise HTTPException(status_code=404, detail="Unknown capability_id — session not authorized.")

    stats = SESSION_STATS.setdefault(req.session_id, {
        "tool_calls": 0, "start_time": time.time(), "hist_avg_amount": cap.max_amount * 0.5, "known_merchants": [],
    })
    stats["tool_calls"] += 1
    session_duration_s = max(1, int(time.time() - stats["start_time"]))
    idempotency_key = req.idempotency_key or f"{req.session_id}_{stats['tool_calls']}"

    now = datetime.utcnow()
    payment_req = PaymentRequest(
        request_id=f"req_{uuid.uuid4().hex[:10]}",
        session_id=req.session_id,
        user_id=cap.user_id,
        agent_id=cap.agent_id,
        amount=req.amount,
        quantity=req.quantity,
        category=req.category,
        merchant=req.merchant,
        idempotency_key=idempotency_key,
        timestamp=now,
    )

    # 1. Deterministic policy engine
    violations = evaluate_policy(payment_req, cap, VELOCITY_STORE)

    # 2. ML risk + behavioral score (feature context pulled from session stats)
    merchant_known = req.merchant_known if req.merchant_known is not None else (req.merchant in stats["known_merchants"])
    ml_event = {
        "amount": req.amount,
        "hist_avg_amount": stats["hist_avg_amount"],
        "merchant_known": merchant_known,
        "category_matches_home": category_matches_home(cap, req.category),
        "tool_calls_in_session": stats["tool_calls"],
        "session_duration_s": session_duration_s,
        "retry_count": 0,
        "hour_of_day": now.hour,
        "quantity": req.quantity,
    }
    ml_result = RISK_MODEL.score(ml_event)

    # 3. Decision
    decision = decide(violations, ml_result)

    # 4. Bookkeeping (only for requests that get this far — recorded regardless of outcome)
    VELOCITY_STORE.record_request(req.session_id, now)
    if decision.outcome != "BLOCK":
        VELOCITY_STORE.record_idempotency_key(idempotency_key, payment_req.request_id)
    if merchant_known is False and req.merchant not in stats["known_merchants"] and decision.outcome == "ALLOW":
        stats["known_merchants"].append(req.merchant)

    razorpay_result = None
    if decision.outcome == "ALLOW":
        VELOCITY_STORE.add_daily_spend(cap.user_id, now, req.amount)
        order = RAZORPAY.create_order(
            amount_inr=req.amount, receipt=payment_req.request_id, simulate_timeout=req.simulate_timeout
        )
        razorpay_result = {
            "status": order.status, "order_id": order.order_id,
            "used_mock": order.used_mock, "raw_response": order.raw_response,
        }

    explanation = build_explanation(payment_req, decision)
    explanation["razorpay"] = razorpay_result
    explanation["razorpay_mode"] = get_razorpay_mode()

    payload = {
        "event": "PAYMENT_DECISION",
        "request": {
            "request_id": payment_req.request_id, "session_id": req.session_id,
            "amount": req.amount, "quantity": req.quantity, "category": req.category,
            "merchant": req.merchant, "idempotency_key": idempotency_key,
        },
        "policy_violations": [v.__dict__ for v in violations],
        "ml_result": {k: v for k, v in ml_result.items() if k != "features"},
        "decision": explanation,
    }
    audit_record = AUDIT.append(payload)
    
    audit_record["request"] = payload["request"]
    audit_record["policy_violations"] = payload["policy_violations"]
    audit_record["ml_result"] = payload["ml_result"]
    explanation["audit"] = audit_record

    return explanation


def category_matches_home(cap: AgentCapability, category: str) -> bool:
    return category in (cap.allowed_categories or [])


@app.get("/guard/audit")
def get_audit(limit: int = 50):
    return AUDIT.all_records(limit=limit)


@app.get("/guard/audit/verify")
def verify_audit():
    return AUDIT.verify_chain()


class TestExtractionRequest(BaseModel):
    nl_text: str

@app.post("/guard/test_extraction")
def test_extraction(req: TestExtractionRequest):
    capability_id = f"cap_test_{uuid.uuid4().hex[:6]}"
    result = extract_intent(req.nl_text, "test_user", "test_agent", capability_id)
    return result


import json
import os

@app.get("/metrics")
def get_metrics():
    metrics_path = os.path.join(os.path.dirname(__file__), "ml", "artifacts", "metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return {"error": "Metrics not found. Run ML training first."}


@app.get("/agents")
def get_agents():
    # Return mock agents for the demo
    return [
        {"id": "agent_042", "name": "Shopping Assistant", "status": "active"},
        {"id": "agent_117", "name": "Travel Booker", "status": "active"},
    ]


@app.get("/policies/{policy_id}")
def get_policy(policy_id: str):
    cap = CAPABILITIES.get(policy_id)
    if not cap:
        raise HTTPException(status_code=404, detail="Policy not found")
    # Using asdict is not available here directly without import, but cap is a dataclass
    from dataclasses import asdict
    return asdict(cap)

@app.get("/transactions")
def get_transactions(limit: int = 50):
    return AUDIT.all_records(limit=limit)

@app.post("/simulation/{scenario}")
def simulate_attack(scenario: str):
    """
    Simulates an attack by generating a PaymentActionRequest and running it 
    through the real evaluate pipeline.
    """
    # 1. Ensure we have a base capability for the demo user
    session_id = "sim_session"
    cap_id = "sim_cap"
    user_id = "demo_user"
    
    if cap_id not in CAPABILITIES:
        from backend.app.core.capability import AgentCapability
        cap = AgentCapability(
            capability_id=cap_id,
            user_id=user_id,
            agent_id="sim_agent",
            max_amount=70000.0,
            max_quantity=1,
            allowed_categories=["electronics", "office supplies"],
            blocked_merchants=[],
            approval_threshold=70000.0 * 0.7,
            max_daily_spend=150000.0,
            expires_at=None,
            version=1
        )
        CAPABILITIES[cap_id] = cap
        
        SESSION_STATS[session_id] = {
            "capability_id": cap_id,
            "tool_calls": 0,
            "start_time": time.time(),
            "hist_avg_amount": 45000.0,
            "known_merchants": ["Amazon", "Flipkart"],
        }
    
    # Generate the request based on scenario
    if scenario == "legitimate":
        req = PaymentActionRequest(
            session_id=session_id,
            capability_id=cap_id,
            amount=45000.0,
            quantity=1,
            category="electronics",
            merchant="Amazon",
            merchant_known=True,
            idempotency_key=f"idempotency_{uuid.uuid4().hex[:6]}"
        )
    elif scenario == "amount_manipulation":
        req = PaymentActionRequest(
            session_id=session_id,
            capability_id=cap_id,
            amount=185000.0,  # exceeds max_amount
            quantity=1,
            category="electronics",
            merchant="Amazon",
            merchant_known=True,
            idempotency_key=f"idempotency_{uuid.uuid4().hex[:6]}"
        )
    elif scenario == "quantity_velocity":
        req = PaymentActionRequest(
            session_id=session_id,
            capability_id=cap_id,
            amount=65000.0,
            quantity=3,  # exceeds max_quantity
            category="electronics",
            merchant="Amazon",
            merchant_known=True,
            idempotency_key=f"idempotency_{uuid.uuid4().hex[:6]}"
        )
        # artificially boost tool calls to trigger velocity anomaly
        SESSION_STATS[session_id]["tool_calls"] += 15
    elif scenario == "replay":
        idem_key = "fixed_replay_key_123"
        # First call to register the idempotency key (if not already there)
        # We will directly run the request to get the block result
        req = PaymentActionRequest(
            session_id=session_id,
            capability_id=cap_id,
            amount=50000.0,
            quantity=1,
            category="electronics",
            merchant="Amazon",
            merchant_known=True,
            idempotency_key=idem_key
        )
        # Pre-populate the idempotency cache for the replay attack
        VELOCITY_STORE.record_idempotency_key(idem_key, f"req_previous_{uuid.uuid4().hex[:6]}")
    elif scenario == "llm_manipulation":
        # Agent receives malicious instruction to ignore limit and buy 3 laptops for 190000
        req = PaymentActionRequest(
            session_id=session_id,
            capability_id=cap_id,
            amount=190000.0,
            quantity=3,
            category="electronics",
            merchant="UnknownMerchant",
            merchant_known=False,
            idempotency_key=f"idempotency_{uuid.uuid4().hex[:6]}"
        )
    elif scenario == "merchant_substitution":
        req = PaymentActionRequest(
            session_id=session_id,
            capability_id=cap_id,
            amount=45000.0,
            quantity=1,
            category="electronics",
            merchant="ShadyTechStore",
            merchant_known=False,
            idempotency_key=f"idempotency_{uuid.uuid4().hex[:6]}"
        )
    else:
        raise HTTPException(status_code=400, detail="Unknown scenario")
        
    # Run through the real pipeline
    result = evaluate(req)
    
    # Attach mock extraction details for the UI demo since we bypass /authorize here
    result["extraction"] = {
        "original_intent": "Buy a laptop from Amazon for no more than 70k.",
        "structured_intent": {
            "max_amount": 70000.0,
            "max_quantity": 1,
            "allowed_categories": ["electronics", "office supplies"],
            "blocked_merchants": []
        },
        "provider": "ollama",
        "model": "qwen3:4b",
        "method": "llm",
        "validation_status": "success",
        "fallback": False
    }
    
    return result
