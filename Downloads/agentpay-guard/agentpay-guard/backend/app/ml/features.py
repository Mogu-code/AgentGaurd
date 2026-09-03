"""
Shared feature engineering for the supervised risk model.

IMPORTANT: These features deliberately EXCLUDE anything the deterministic
policy engine already enforces with certainty (e.g. "amount > declared_max_amount"
as a boolean). Instead we give the model *ratios and behavioral context* so it
learns statistical risk patterns, not a re-implementation of policy rules.
This keeps the ML signal genuinely complementary to the policy engine.
"""
from __future__ import annotations
import pandas as pd

FEATURE_COLUMNS = [
    "amount_dev_ratio",       # amount / user's historical average
    "merchant_known",         # has this merchant been used before by this user
    "category_matches_home",  # does category match user's typical category
    "tool_calls_in_session",  # agent behavioral signal
    "session_duration_s",     # agent behavioral signal
    "retry_count",            # agent behavioral signal
    "hour_of_day",            # timing signal
    "quantity",               # raw quantity (ratio-to-declared handled by policy engine separately)
]

TARGET_COLUMN = "is_violation"


def select_features(df: pd.DataFrame) -> pd.DataFrame:
    return df[FEATURE_COLUMNS].copy()


def build_feature_row(event: dict) -> dict:
    """Build a single-row feature dict at inference time from a payment request
    + session context. Keys must match FEATURE_COLUMNS."""
    return {
        "amount_dev_ratio": event["amount"] / max(event.get("hist_avg_amount", 1) or 1, 1e-6),
        "merchant_known": int(event.get("merchant_known", False)),
        "category_matches_home": int(event.get("category_matches_home", False)),
        "tool_calls_in_session": event.get("tool_calls_in_session", 1),
        "session_duration_s": event.get("session_duration_s", 60),
        "retry_count": event.get("retry_count", 0),
        "hour_of_day": event.get("hour_of_day", 12),
        "quantity": event.get("quantity", 1),
    }
