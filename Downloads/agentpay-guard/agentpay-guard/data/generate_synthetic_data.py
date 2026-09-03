"""
Deterministic synthetic dataset generator for AgentPay Guard.

Generates agent-initiated payment-request "events". Each event belongs to a
session that has a declared authorization (capability): max_amount, category,
max_quantity, expiry, allowed merchants seen historically.

Design goals (important — read before changing):
  1. Distributions OVERLAP on purpose. Legitimate high-value purchases exist.
     Some violations are subtle (a few % over budget), not just wild outliers.
     This avoids a trivially-separable dataset that would make the ML model
     look artificially perfect.
  2. `is_violation` (ground truth) reflects *behavioral/statistical* risk, not
     hard policy breaches the deterministic policy engine already catches
     with 100% precision (e.g. amount > max_amount is ALWAYS caught by the
     policy engine, not the ML model). The ML model is trained on softer
     signals: deviation from personal history, merchant unfamiliarity,
     velocity, timing, agent tool-call burstiness — genuinely different
     information from the hard policy checks.
  3. Reproducible: fixed seed, no wall-clock randomness in outputs.

Run:
    python data/generate_synthetic_data.py --n 25000 --out data/synthetic_events.csv
"""
import argparse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

SEED = 42
CATEGORIES = ["electronics", "books", "groceries", "fashion", "subscriptions", "travel"]
MERCHANTS_POOL = [f"merchant_{i:03d}" for i in range(60)]


def build_users(n_users, rng):
    users = []
    for uid in range(n_users):
        home_category = rng.choice(CATEGORIES)
        hist_avg = rng.lognormal(mean=np.log(1500), sigma=0.7)
        hist_avg = float(np.clip(hist_avg, 200, 60000))
        trusted_merchants = rng.choice(MERCHANTS_POOL, size=rng.integers(2, 8), replace=False).tolist()
        max_amount = float(np.clip(hist_avg * rng.uniform(3, 10), 1000, 100000))
        users.append({
            "user_id": uid,
            "home_category": home_category,
            "hist_avg_amount": round(hist_avg, 2),
            "trusted_merchants": trusted_merchants,
            "max_amount": round(max_amount, 2),
            "max_quantity": int(rng.integers(1, 4)),
        })
    return users


def generate(n_events, n_users=400, seed=SEED):
    rng = np.random.default_rng(seed)
    users = build_users(n_users, rng)
    base_time = datetime(2026, 1, 1)

    rows = []
    session_counter = 0
    for u in users:
        n_sessions = max(1, int(n_events / n_users / 3))
        for _ in range(n_sessions):
            session_counter += 1
            session_id = f"sess_{session_counter:06d}"
            session_start = base_time + timedelta(minutes=int(rng.integers(0, 60 * 24 * 200)))
            n_actions_in_session = int(rng.integers(1, 6))

            # 12% of sessions are "attack" sessions with elevated violation propensity
            is_attack_session = rng.random() < 0.12

            for a in range(n_actions_in_session):
                ts = session_start + timedelta(seconds=int(rng.integers(1, 600)) * (a + 1))

                # ---- decide scenario type for this event ----
                r = rng.random()
                if is_attack_session:
                    if r < 0.30:
                        scenario = "amount_manipulation"
                    elif r < 0.50:
                        scenario = "quantity_manipulation"
                    elif r < 0.68:
                        scenario = "merchant_substitution"
                    elif r < 0.82:
                        scenario = "velocity_abuse"
                    elif r < 0.92:
                        scenario = "replay"
                    else:
                        scenario = "legit"  # even attack sessions have some normal actions
                else:
                    scenario = "legit" if rng.random() < 0.94 else rng.choice(
                        ["amount_manipulation", "merchant_substitution"], p=[0.6, 0.4]
                    )

                merchant_known = bool(rng.random() < 0.75)
                merchant = (
                    rng.choice(u["trusted_merchants"]) if merchant_known
                    else rng.choice(MERCHANTS_POOL)
                )
                category = u["home_category"] if rng.random() < 0.8 else rng.choice(CATEGORIES)
                quantity = 1
                amount = float(np.clip(rng.normal(u["hist_avg_amount"], u["hist_avg_amount"] * 0.35), 50, None))

                declared_max_amount = u["max_amount"]
                declared_max_qty = u["max_quantity"]

                is_violation = 0
                if scenario == "amount_manipulation":
                    # subtle-to-severe overshoot vs the user's own declared authorization
                    overshoot = rng.uniform(1.05, 2.2)
                    amount = declared_max_amount * overshoot
                    is_violation = 1
                elif scenario == "quantity_manipulation":
                    quantity = declared_max_qty + int(rng.integers(1, 5))
                    is_violation = 1
                elif scenario == "merchant_substitution":
                    merchant = rng.choice([m for m in MERCHANTS_POOL if m not in u["trusted_merchants"]])
                    merchant_known = False
                    is_violation = 1
                elif scenario == "velocity_abuse":
                    ts = session_start + timedelta(seconds=int(rng.integers(1, 20)) * (a + 1))  # bursty
                    is_violation = 1
                elif scenario == "replay":
                    is_violation = 1  # ground truth flag; idempotency key collision added below

                tool_calls_in_session = int(rng.integers(2, 6)) if scenario != "velocity_abuse" else int(rng.integers(8, 20))
                session_duration_s = int(rng.integers(20, 600)) if scenario != "velocity_abuse" else int(rng.integers(5, 60))
                retry_count = int(rng.integers(0, 2)) if scenario != "replay" else int(rng.integers(1, 4))
                hour_of_day = ts.hour

                idem_key = f"{session_id}_{a}" if scenario != "replay" else f"{session_id}_0"  # collide with first action

                rows.append({
                    "event_id": f"{session_id}_a{a}",
                    "session_id": session_id,
                    "user_id": u["user_id"],
                    "timestamp": ts.isoformat(),
                    "amount": round(amount, 2),
                    "quantity": quantity,
                    "category": category,
                    "merchant": merchant,
                    "merchant_known": int(merchant_known),
                    "declared_max_amount": declared_max_amount,
                    "declared_max_qty": declared_max_qty,
                    "hist_avg_amount": u["hist_avg_amount"],
                    "amount_dev_ratio": round(amount / max(u["hist_avg_amount"], 1e-6), 3),
                    "category_matches_home": int(category == u["home_category"]),
                    "tool_calls_in_session": tool_calls_in_session,
                    "session_duration_s": session_duration_s,
                    "retry_count": retry_count,
                    "hour_of_day": hour_of_day,
                    "idempotency_key": idem_key,
                    "scenario_label": scenario,   # kept for analysis / attack-sim, NOT a model feature
                    "is_violation": is_violation, # ground truth target
                })

    df = pd.DataFrame(rows)
    return df


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=25000)
    ap.add_argument("--out", type=str, default="data/synthetic_events.csv")
    args = ap.parse_args()

    df = generate(args.n)
    df.to_csv(args.out, index=False)
    print(f"Wrote {len(df)} events to {args.out}")
    print(df["scenario_label"].value_counts())
    print("Violation rate:", df["is_violation"].mean())
