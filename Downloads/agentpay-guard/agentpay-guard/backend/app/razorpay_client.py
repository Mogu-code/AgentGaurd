"""
Razorpay test-mode client — clean abstraction layer.

If RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are present in the environment, this
calls the real Razorpay test-mode Orders API (https://api.razorpay.com/v1/orders,
Basic Auth with the test key pair — per Razorpay's public API docs). If no
keys are configured, it transparently falls back to a MockRazorpayClient that
mimics the same response shape, so the rest of the system (and the demo) is
fully runnable without a Razorpay account.

FAILURE HANDLING (brief section 22/23):
On a timeout or 5xx, we do NOT blindly retry. We return a PENDING status and
rely on:
  - the idempotency key already recorded by the policy engine (so a legitimate
    retry, if the caller chooses to retry, is safely deduplicated), and
  - a follow-up status check via `check_order_status`, which the caller should
    invoke before ever deciding to retry.
This mirrors real payment-system failure handling: on ambiguity, treat the
transaction as "unknown, verify before acting again," not "assume failure and
resubmit."
"""
from __future__ import annotations
import os
import time
import uuid
from dataclasses import dataclass
from typing import Optional

import httpx

RAZORPAY_BASE_URL = "https://api.razorpay.com/v1"
REQUEST_TIMEOUT_SECONDS = 5.0


@dataclass
class OrderResult:
    status: str  # "created" | "pending" | "failed"
    order_id: Optional[str]
    raw_response: dict
    used_mock: bool


class MockRazorpayClient:
    """Deterministic mock so the whole pipeline is runnable with zero
    external dependency. Simulates one configurable failure mode for the
    demo's 'timeout, no blind retry' scenario."""

    def __init__(self):
        self._orders = {}

    def create_order(self, amount_inr: float, receipt: str, simulate_timeout: bool = False) -> OrderResult:
        if simulate_timeout:
            return OrderResult(status="pending", order_id=None,
                                raw_response={"error": "simulated_timeout", "receipt": receipt}, used_mock=True)
        order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        raw = {
            "id": order_id,
            "entity": "order",
            "amount": int(amount_inr * 100),  # paise, matches real Razorpay convention
            "currency": "INR",
            "receipt": receipt,
            "status": "created",
        }
        self._orders[order_id] = raw
        return OrderResult(status="created", order_id=order_id, raw_response=raw, used_mock=True)

    def check_order_status(self, order_id: str) -> OrderResult:
        raw = self._orders.get(order_id)
        if raw is None:
            return OrderResult(status="failed", order_id=order_id, raw_response={"error": "not_found"}, used_mock=True)
        return OrderResult(status="created", order_id=order_id, raw_response=raw, used_mock=True)


class RealRazorpayClient:
    def __init__(self, key_id: str, key_secret: str):
        self.auth = (key_id, key_secret)

    def create_order(self, amount_inr: float, receipt: str, simulate_timeout: bool = False) -> OrderResult:
        payload = {"amount": int(amount_inr * 100), "currency": "INR", "receipt": receipt}
        try:
            resp = httpx.post(
                f"{RAZORPAY_BASE_URL}/orders", json=payload, auth=self.auth,
                timeout=0.001 if simulate_timeout else REQUEST_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            data = resp.json()
            return OrderResult(status="created", order_id=data.get("id"), raw_response=data, used_mock=False)
        except (httpx.TimeoutException, httpx.ConnectError):
            return OrderResult(status="pending", order_id=None, raw_response={"error": "timeout"}, used_mock=False)
        except httpx.HTTPStatusError as e:
            return OrderResult(status="failed", order_id=None,
                                raw_response={"error": str(e), "body": e.response.text}, used_mock=False)

    def check_order_status(self, order_id: str) -> OrderResult:
        try:
            resp = httpx.get(f"{RAZORPAY_BASE_URL}/orders/{order_id}", auth=self.auth, timeout=REQUEST_TIMEOUT_SECONDS)
            resp.raise_for_status()
            data = resp.json()
            return OrderResult(status="created", order_id=order_id, raw_response=data, used_mock=False)
        except Exception as e:
            return OrderResult(status="pending", order_id=order_id, raw_response={"error": str(e)}, used_mock=False)


def get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if key_id and key_secret:
        return RealRazorpayClient(key_id, key_secret)
    return MockRazorpayClient()
