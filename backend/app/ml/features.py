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
    "merchant_switching",     # 1 if merchant_known is false
    "category_matches_home",  # does category match user's typical category
    "category_switching",     # 1 if category_matches_home is false
    "tool_calls_in_session",  # agent behavioral signal (recent transaction count)
    "session_duration_s",     # agent behavioral signal (session age)
    "transaction_velocity_s", # time per tool call
    "retry_count",            # agent behavioral signal (recent failures)
    "hour_of_day",            # timing signal
    "quantity",               # raw quantity
]

TARGET_COLUMN = "is_violation"


def select_features(df: pd.DataFrame) -> pd.DataFrame:
    df_feat = df.copy()
    df_feat["transaction_velocity_s"] = df_feat["session_duration_s"] / df_feat["tool_calls_in_session"].clip(lower=1)
    df_feat["merchant_switching"] = 1 - df_feat["merchant_known"]
    df_feat["category_switching"] = 1 - df_feat["category_matches_home"]
    return df_feat[FEATURE_COLUMNS].copy()


def build_feature_row(event: dict) -> dict:
    """Build a single-row feature dict at inference time from a payment request
    + session context. Keys must match FEATURE_COLUMNS."""
    tool_calls = event.get("tool_calls_in_session", 1)
    session_duration = event.get("session_duration_s", 60)
    merchant_known = int(event.get("merchant_known", False))
    category_matches = int(event.get("category_matches_home", False))
    
    return {
        "amount_dev_ratio": event["amount"] / max(event.get("hist_avg_amount", 1) or 1, 1e-6),
        "merchant_known": merchant_known,
        "merchant_switching": 1 - merchant_known,
        "category_matches_home": category_matches,
        "category_switching": 1 - category_matches,
        "tool_calls_in_session": tool_calls,
        "session_duration_s": session_duration,
        "transaction_velocity_s": session_duration / max(1, tool_calls),
        "retry_count": event.get("retry_count", 0),
        "hour_of_day": event.get("hour_of_day", 12),
        "quantity": event.get("quantity", 1),
    }
