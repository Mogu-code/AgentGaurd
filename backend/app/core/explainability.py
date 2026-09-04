"""
Explainability builder.

Rule: this module NEVER calls an LLM and NEVER invents evidence. It only
formats fields that already exist on the Decision + PaymentRequest objects.
If you're tempted to add "an LLM writes a nicer explanation" — that step, if
ever added, must take this structured object as strict input and be
constrained to rephrase only, never to add new claims.
"""
from __future__ import annotations
from backend.app.core.decision_engine import Decision
from backend.app.core.policy_engine import PaymentRequest


def build_explanation(req: PaymentRequest, decision: Decision) -> dict:
    return {
        "request_id": req.request_id,
        "session_id": req.session_id,
        "outcome": decision.outcome,
        "risk_score": round(decision.risk_score, 4),
        "behavioral_anomaly": decision.behavioral_anomaly,
        "model_name": decision.model_name,
        "model_version": decision.model_version,
        "fallback_mode": decision.fallback_mode,
        "reasons": decision.reasons,
        "required_action": {
            "ALLOW": "NONE",
            "STEP_UP": "USER_APPROVAL_REQUIRED",
            "BLOCK": "PAYMENT_REJECTED",
        }[decision.outcome],
        "request_summary": {
            "amount": req.amount,
            "quantity": req.quantity,
            "category": req.category,
            "merchant": req.merchant,
        },
    }
