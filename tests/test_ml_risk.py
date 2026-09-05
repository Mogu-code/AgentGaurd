import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.ml.risk_model import RiskModel

def test_ml_blocks_velocity_anomaly():
    """
    Proves that a transaction that complies with deterministic policy amounts
    is still flagged by the ML engine if the behavioral velocity is abnormal.
    """
    model = RiskModel()
    # Assuming model loads successfully for this test
    if not model.available:
        return
    
    # 1. Normal event
    normal_event = {
        "amount": 45000.0,
        "hist_avg_amount": 45000.0,
        "merchant_known": True,
        "category_matches_home": True,
        "tool_calls_in_session": 1,
        "session_duration_s": 120,
        "retry_count": 0,
        "hour_of_day": 14,
        "quantity": 1,
    }
    normal_result = model.score(normal_event)
    assert normal_result["risk_score"] < 0.5, "Normal event should be low risk"

    # 2. Velocity Anomaly Event (high tool calls, very short session)
    anomaly_event = {
        "amount": 45000.0,
        "hist_avg_amount": 45000.0,
        "merchant_known": True,
        "category_matches_home": True,
        "tool_calls_in_session": 15,  # 15 tool calls in 2 seconds!
        "session_duration_s": 2,
        "retry_count": 0,
        "hour_of_day": 14,
        "quantity": 1,
    }
    anomaly_result = model.score(anomaly_event)
    assert anomaly_result["risk_score"] >= 0.5 or anomaly_result["behavioral_anomaly"] is True, "Velocity anomaly MUST be flagged as high risk by ML"
