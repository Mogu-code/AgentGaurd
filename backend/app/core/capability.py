"""
Bounded agent capability — the narrowly-scoped authorization an agent is
granted for a session. This is intentionally a plain, server-side-stored
struct (NOT a signed/cryptographic token) for the MVP: the value of a
capability token comes from being enforced by trusted server code, not from
its encoding. Cryptographic signing (e.g. JWT) is a reasonable future
hardening step once the Guard is deployed outside a single trusted process,
but adding it now would not change what the MVP proves and would cost time
better spent on the ML/decision pipeline (see docs/ARCHITECTURE.md).
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class AgentCapability:
    capability_id: str
    user_id: str
    agent_id: str
    max_amount: float
    max_quantity: int
    allowed_categories: List[str]
    blocked_merchants: List[str] = field(default_factory=list)
    authorized_merchant: Optional[str] = None  # if the user named a specific merchant, only THIS merchant is authorized
    approval_threshold: Optional[float] = None  # amount above which STEP_UP is required even if under max_amount
    max_daily_spend: Optional[float] = None
    expires_at: Optional[datetime] = None
    version: int = 1

    def is_expired(self, now: datetime) -> bool:
        return self.expires_at is not None and now > self.expires_at
