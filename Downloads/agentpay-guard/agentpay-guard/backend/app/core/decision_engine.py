"""
Decision Engine — combines the deterministic policy engine, the supervised ML
risk score, and the unsupervised behavioral anomaly flag into one of
ALLOW / STEP_UP / BLOCK.

Hierarchy (matches brief section 11), most important rule first:
  1. Any HARD policy violation -> BLOCK. Full stop. ML is not consulted to
     override this; a policy breach is a policy breach regardless of how
     "normal" the transaction looks statistically.
  2. Otherwise, combine ML risk_score + behavioral_anomaly + any SOFT policy
     violations (e.g. above approval threshold) into STEP_UP or ALLOW using
     fixed, published thresholds (no black-box override).
  3. If the risk model is unavailable (fallback mode), never auto-ALLOW —
     downgrade to at least STEP_UP.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List

from backend.app.core.policy_engine import PolicyViolation, has_hard_violation

RISK_BLOCK_THRESHOLD = 0.85
RISK_STEP_UP_THRESHOLD = 0.45


@dataclass
class Decision:
    outcome: str  # ALLOW | STEP_UP | BLOCK
    reasons: List[str] = field(default_factory=list)
    policy_violations: List[PolicyViolation] = field(default_factory=list)
    risk_score: float = 0.0
    behavioral_anomaly: bool = False
    model_name: str = ""
    model_version: str = ""
    fallback_mode: bool = False


def decide(policy_violations: List[PolicyViolation], ml_result: dict) -> Decision:
    reasons: List[str] = []

    if has_hard_violation(policy_violations):
        for v in policy_violations:
            if v.severity == "hard":
                reasons.append(f"[POLICY] {v.code}: {v.message}")
        return Decision(
            outcome="BLOCK",
            reasons=reasons,
            policy_violations=policy_violations,
            risk_score=ml_result.get("risk_score", 0.0),
            behavioral_anomaly=ml_result.get("behavioral_anomaly", False),
            model_name=ml_result.get("model_name", ""),
            model_version=ml_result.get("model_version", ""),
            fallback_mode=ml_result.get("fallback", False),
        )

    soft_violations = [v for v in policy_violations if v.severity == "soft"]
    for v in soft_violations:
        reasons.append(f"[POLICY-SOFT] {v.code}: {v.message}")

    risk_score = ml_result.get("risk_score", 0.0)
    behavioral_anomaly = ml_result.get("behavioral_anomaly", False)
    fallback = ml_result.get("fallback", False)

    if fallback:
        reasons.append("[SYSTEM] ML risk model unavailable — falling back to conservative review.")
        outcome = "STEP_UP"
    elif risk_score >= RISK_BLOCK_THRESHOLD:
        reasons.append(f"[ML] Risk score {risk_score:.2f} at/above block threshold {RISK_BLOCK_THRESHOLD}.")
        outcome = "BLOCK"
    elif risk_score >= RISK_STEP_UP_THRESHOLD or behavioral_anomaly or soft_violations:
        if risk_score >= RISK_STEP_UP_THRESHOLD:
            reasons.append(f"[ML] Risk score {risk_score:.2f} at/above step-up threshold {RISK_STEP_UP_THRESHOLD}.")
        if behavioral_anomaly:
            reasons.append("[BEHAVIORAL] Session flagged as statistically anomalous by behavioral model.")
        outcome = "STEP_UP"
    else:
        reasons.append(f"[ML] Risk score {risk_score:.2f} below step-up threshold; no behavioral anomaly.")
        outcome = "ALLOW"

    return Decision(
        outcome=outcome,
        reasons=reasons,
        policy_violations=policy_violations,
        risk_score=risk_score,
        behavioral_anomaly=behavioral_anomaly,
        model_name=ml_result.get("model_name", ""),
        model_version=ml_result.get("model_version", ""),
        fallback_mode=fallback,
    )
