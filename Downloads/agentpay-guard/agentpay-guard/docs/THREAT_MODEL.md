# Threat Model (defensive only)

No offensive tooling is included anywhere in this repository. Everything
below is modeled defensively and demonstrated only via synthetic simulated
attacks against our own system (`scripts/run_demo_scenarios.py`).

| # | Threat | Description | Mitigation | Where enforced |
|---|---|---|---|---|
| 1 | Amount manipulation | Agent requests a higher amount than authorized | Hard cap check | `policy_engine.py` → `AMOUNT_EXCEEDS_AUTHORIZATION` |
| 2 | Quantity manipulation | Agent requests more units than authorized | Hard cap check | `policy_engine.py` → `QUANTITY_EXCEEDS_AUTHORIZATION` |
| 3 | Merchant substitution | Agent pays a different/untrusted merchant | Category/merchant checks + ML merchant-familiarity feature | `policy_engine.py` (`MERCHANT_BLOCKED`) + `risk_model.py` |
| 4 | Category deviation | Agent buys outside the authorized category | Hard category check | `policy_engine.py` → `CATEGORY_NOT_ALLOWED` |
| 5 | Replay / duplicate payment | Same payment request resubmitted | Idempotency key store | `policy_engine.py` → `REPLAY_DETECTED` |
| 6 | Velocity abuse | Many payment requests in a short window | Sliding-window request counter | `policy_engine.py` → `VELOCITY_LIMIT_EXCEEDED` |
| 7 | Behavioral/session anomaly | Abnormal tool-call burstiness, session-duration/timing patterns | Isolation Forest over session features | `risk_model.py` (`behavioral_anomaly`) |
| 8 | LLM hallucination / prompt injection influencing payment values | A tool response or injected instruction tries to alter declared intent | LLM never has write access to money; its only output (capability) is fixed once per session and enforced by non-LLM code afterward | Architecture-level, see `docs/ARCHITECTURE.md` §2 |
| 9 | Capability expiry bypass | Agent tries to transact after authorization should have lapsed | Expiry check | `policy_engine.py` → `CAPABILITY_EXPIRED` |
| 10 | Daily aggregate overspend | Many individually-valid transactions exceed a daily cap | Running daily spend tracked per user | `policy_engine.py` → `DAILY_SPEND_EXCEEDED` |
| 11 | Risk model unavailable (DoS / crash / bad artifact) | ML component can't score | Fail-conservative fallback (never silently ALLOW) | `risk_model.py` → `FALLBACK_RISK_SCORE`, `decision_engine.py` fallback branch |
| 12 | Payment API timeout ambiguity | Uncertain whether a payment actually went through | No blind retry; mark PENDING, rely on idempotency + status check | `razorpay_client.py` |
| 13 | Audit log tampering | Attempt to retroactively alter a decision record | Hash chain recomputation detects any mismatch | `hash_chain.py` → `verify_chain()` (honestly scoped: tamper-evident, not tamper-proof — see limitation note) |

## Explicitly out of scope for this MVP

- Authentication/authorization of the merchant/operator calling the Guard API
  itself (no API-key auth on `/guard/*` endpoints yet — needed before any
  real deployment, flagged in "Known limitations").
- Cryptographically signed capability tokens (JWT/similar) — the current
  capability object is a trusted server-side struct; see `capability.py`
  docstring for the explicit reasoning on why this was deferred.
- Multi-tenant isolation, rate limiting at the HTTP layer, secret rotation.
