import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.policy_engine import PolicyViolation
from backend.app.core.decision_engine import decide


def test_hard_violation_always_blocks_regardless_of_low_risk():
    violations = [PolicyViolation("AMOUNT_EXCEEDS_AUTHORIZATION", "over limit", "hard")]
    ml_result = {"risk_score": 0.01, "behavioral_anomaly": False, "model_name": "rf", "model_version": "v1"}
    d = decide(violations, ml_result)
    assert d.outcome == "BLOCK"


def test_high_risk_blocks_even_with_no_policy_violation():
    ml_result = {"risk_score": 0.95, "behavioral_anomaly": True, "model_name": "rf", "model_version": "v1"}
    d = decide([], ml_result)
    assert d.outcome == "BLOCK"


def test_moderate_risk_triggers_step_up():
    ml_result = {"risk_score": 0.5, "behavioral_anomaly": False, "model_name": "rf", "model_version": "v1"}
    d = decide([], ml_result)
    assert d.outcome == "STEP_UP"


def test_low_risk_allows():
    ml_result = {"risk_score": 0.1, "behavioral_anomaly": False, "model_name": "rf", "model_version": "v1"}
    d = decide([], ml_result)
    assert d.outcome == "ALLOW"


def test_fallback_mode_never_auto_allows():
    ml_result = {"risk_score": 0.1, "behavioral_anomaly": False, "model_name": "unavailable",
                 "model_version": "unavailable", "fallback": True}
    d = decide([], ml_result)
    assert d.outcome == "STEP_UP"


def test_soft_violation_alone_triggers_step_up():
    violations = [PolicyViolation("AMOUNT_ABOVE_APPROVAL_THRESHOLD", "over threshold", "soft")]
    ml_result = {"risk_score": 0.1, "behavioral_anomaly": False, "model_name": "rf", "model_version": "v1"}
    d = decide(violations, ml_result)
    assert d.outcome == "STEP_UP"
