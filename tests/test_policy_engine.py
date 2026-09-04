import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime
from backend.app.core.capability import AgentCapability
from backend.app.core.policy_engine import (
    PaymentRequest, VelocityStore, evaluate_policy, has_hard_violation
)


def make_cap(**overrides):
    base = dict(
        capability_id="cap1", user_id="u1", agent_id="a1",
        max_amount=1000.0, max_quantity=1, allowed_categories=["electronics"],
        blocked_merchants=[], approval_threshold=700.0, max_daily_spend=1500.0,
    )
    base.update(overrides)
    return AgentCapability(**base)


def make_req(**overrides):
    base = dict(
        request_id="r1", session_id="s1", user_id="u1", agent_id="a1",
        amount=500.0, quantity=1, category="electronics", merchant="m1",
        idempotency_key="k1", timestamp=datetime(2026, 1, 1, 12, 0, 0),
    )
    base.update(overrides)
    return PaymentRequest(**base)


def test_within_policy_no_violations():
    cap = make_cap()
    req = make_req(amount=400)
    v = evaluate_policy(req, cap, VelocityStore())
    assert not has_hard_violation(v)


def test_amount_over_cap_is_hard_violation():
    cap = make_cap()
    req = make_req(amount=1500)
    v = evaluate_policy(req, cap, VelocityStore())
    assert has_hard_violation(v)
    assert any(x.code == "AMOUNT_EXCEEDS_AUTHORIZATION" for x in v)


def test_amount_above_threshold_is_soft_only():
    cap = make_cap()
    req = make_req(amount=800)  # over approval_threshold(700) but under max_amount(1000)
    v = evaluate_policy(req, cap, VelocityStore())
    assert not has_hard_violation(v)
    assert any(x.code == "AMOUNT_ABOVE_APPROVAL_THRESHOLD" and x.severity == "soft" for x in v)


def test_quantity_violation():
    cap = make_cap(max_quantity=1)
    req = make_req(quantity=3)
    v = evaluate_policy(req, cap, VelocityStore())
    assert any(x.code == "QUANTITY_EXCEEDS_AUTHORIZATION" for x in v)


def test_category_violation():
    cap = make_cap(allowed_categories=["books"])
    req = make_req(category="electronics")
    v = evaluate_policy(req, cap, VelocityStore())
    assert any(x.code == "CATEGORY_NOT_ALLOWED" for x in v)


def test_merchant_blocklist():
    cap = make_cap(blocked_merchants=["bad_merchant"])
    req = make_req(merchant="bad_merchant")
    v = evaluate_policy(req, cap, VelocityStore())
    assert any(x.code == "MERCHANT_BLOCKED" for x in v)


def test_replay_detected():
    cap = make_cap()
    store = VelocityStore()
    store.record_idempotency_key("k1", "r0")
    req = make_req(idempotency_key="k1")
    v = evaluate_policy(req, cap, store)
    assert any(x.code == "REPLAY_DETECTED" for x in v)


def test_velocity_limit():
    cap = make_cap()
    store = VelocityStore()
    ts = datetime(2026, 1, 1, 12, 0, 0)
    for _ in range(3):
        store.record_request("s1", ts)
    req = make_req(timestamp=ts)
    v = evaluate_policy(req, cap, store)
    assert any(x.code == "VELOCITY_LIMIT_EXCEEDED" for x in v)


def test_daily_spend_cap():
    cap = make_cap(max_daily_spend=1000.0)
    store = VelocityStore()
    ts = datetime(2026, 1, 1, 12, 0, 0)
    store.add_daily_spend("u1", ts, 700.0)
    req = make_req(amount=400, timestamp=ts)
    v = evaluate_policy(req, cap, store)
    assert any(x.code == "DAILY_SPEND_EXCEEDED" for x in v)


def test_expired_capability():
    cap = make_cap(expires_at=datetime(2025, 1, 1))
    req = make_req(timestamp=datetime(2026, 1, 1))
    v = evaluate_policy(req, cap, VelocityStore())
    assert any(x.code == "CAPABILITY_EXPIRED" for x in v)
