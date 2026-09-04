"""
Deterministic Policy Engine.

This module contains ZERO machine learning and ZERO LLM calls. It is pure,
testable Python. This is the layer that makes the headline safety claim true:
an LLM hallucination cannot move money, because money only moves after these
checks pass, and these checks are ordinary code with no model in the loop.

Each check returns a PolicyViolation (or None). The caller (decision_engine)
aggregates violations from ALL checks — a single hard violation is always
sufficient to BLOCK, regardless of what the ML risk model says.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional

from backend.app.core.capability import AgentCapability


@dataclass
class PolicyViolation:
    code: str
    message: str
    severity: str  # "hard" (always BLOCK) | "soft" (contributes to STEP_UP)


@dataclass
class PaymentRequest:
    request_id: str
    session_id: str
    user_id: str
    agent_id: str
    amount: float
    quantity: int
    category: str
    merchant: str
    idempotency_key: str
    timestamp: datetime


class VelocityStore:
    """In-memory velocity + idempotency tracker.
    For the MVP this is process-local (sufficient for a single FastAPI
    process demo). Swap for Redis if the service needs to scale to multiple
    processes — the interface below is intentionally storage-agnostic.
    """

    def __init__(self):
        self._seen_idempotency_keys = {}          # idempotency_key -> request_id
        self._recent_requests_by_session = {}      # session_id -> list[datetime]
        self._daily_spend_by_user = {}              # (user_id, date) -> total

    def has_seen_idempotency_key(self, key: str) -> bool:
        return key in self._seen_idempotency_keys

    def record_idempotency_key(self, key: str, request_id: str):
        self._seen_idempotency_keys[key] = request_id

    def record_request(self, session_id: str, ts: datetime):
        self._recent_requests_by_session.setdefault(session_id, []).append(ts)

    def count_recent(self, session_id: str, ts: datetime, window_seconds: int) -> int:
        history = self._recent_requests_by_session.get(session_id, [])
        cutoff = ts - timedelta(seconds=window_seconds)
        return sum(1 for t in history if t >= cutoff)

    def add_daily_spend(self, user_id: str, ts: datetime, amount: float):
        key = (user_id, ts.date())
        self._daily_spend_by_user[key] = self._daily_spend_by_user.get(key, 0.0) + amount

    def get_daily_spend(self, user_id: str, ts: datetime) -> float:
        return self._daily_spend_by_user.get((user_id, ts.date()), 0.0)


VELOCITY_WINDOW_SECONDS = 60
VELOCITY_MAX_REQUESTS_PER_WINDOW = 3


def evaluate_policy(
    req: PaymentRequest, cap: AgentCapability, store: VelocityStore
) -> List[PolicyViolation]:
    violations: List[PolicyViolation] = []

    # 1. Capability expiry
    if cap.is_expired(req.timestamp):
        violations.append(PolicyViolation("CAPABILITY_EXPIRED", "Agent authorization has expired.", "hard"))

    # 2. Amount ceiling (hard authorization boundary)
    if req.amount > cap.max_amount:
        violations.append(PolicyViolation(
            "AMOUNT_EXCEEDS_AUTHORIZATION",
            f"Requested amount {req.amount:.2f} exceeds authorized max {cap.max_amount:.2f} "
            f"by {req.amount - cap.max_amount:.2f}.",
            "hard",
        ))

    # 3. Approval threshold (soft — allowed but requires step-up)
    elif cap.approval_threshold is not None and req.amount > cap.approval_threshold:
        violations.append(PolicyViolation(
            "AMOUNT_ABOVE_APPROVAL_THRESHOLD",
            f"Amount {req.amount:.2f} exceeds the approval threshold {cap.approval_threshold:.2f}.",
            "soft",
        ))

    # 4. Quantity ceiling
    if req.quantity > cap.max_quantity:
        violations.append(PolicyViolation(
            "QUANTITY_EXCEEDS_AUTHORIZATION",
            f"Requested quantity {req.quantity} exceeds authorized max {cap.max_quantity}.",
            "hard",
        ))

    # 4b. Merchant substitution: if the user named a specific merchant at authorization
    # time, the agent may ONLY pay that merchant — this is a hard violation, not a soft
    # ML signal, because paying an unnamed merchant is exactly the "agent pays a
    # different merchant than approved" threat this system exists to stop.
    if cap.authorized_merchant and req.merchant != cap.authorized_merchant:
        violations.append(PolicyViolation(
            "MERCHANT_SUBSTITUTION",
            f"Authorized merchant is '{cap.authorized_merchant}' but request targets '{req.merchant}'.",
            "hard",
        ))

    # 5. Category restriction
    if cap.allowed_categories and req.category not in cap.allowed_categories:
        violations.append(PolicyViolation(
            "CATEGORY_NOT_ALLOWED",
            f"Category '{req.category}' is not in the authorized set {cap.allowed_categories}.",
            "hard",
        ))

    # 6. Merchant block list
    if req.merchant in (cap.blocked_merchants or []):
        violations.append(PolicyViolation(
            "MERCHANT_BLOCKED", f"Merchant '{req.merchant}' is explicitly blocked.", "hard"
        ))

    # 7. Daily spend cap
    if cap.max_daily_spend is not None:
        projected = store.get_daily_spend(req.user_id, req.timestamp) + req.amount
        if projected > cap.max_daily_spend:
            violations.append(PolicyViolation(
                "DAILY_SPEND_EXCEEDED",
                f"Projected daily spend {projected:.2f} exceeds cap {cap.max_daily_spend:.2f}.",
                "hard",
            ))

    # 8. Idempotency / replay protection
    if store.has_seen_idempotency_key(req.idempotency_key):
        violations.append(PolicyViolation(
            "REPLAY_DETECTED",
            f"Idempotency key '{req.idempotency_key}' has already been processed.",
            "hard",
        ))

    # 9. Velocity limit
    recent_count = store.count_recent(req.session_id, req.timestamp, VELOCITY_WINDOW_SECONDS)
    if recent_count >= VELOCITY_MAX_REQUESTS_PER_WINDOW:
        violations.append(PolicyViolation(
            "VELOCITY_LIMIT_EXCEEDED",
            f"{recent_count} payment requests in the last {VELOCITY_WINDOW_SECONDS}s "
            f"(limit {VELOCITY_MAX_REQUESTS_PER_WINDOW}).",
            "hard",
        ))

    return violations


def has_hard_violation(violations: List[PolicyViolation]) -> bool:
    return any(v.severity == "hard" for v in violations)
