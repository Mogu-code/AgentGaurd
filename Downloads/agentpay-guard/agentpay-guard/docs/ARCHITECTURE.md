# Architecture

## 0. Positioning research (why this isn't redundant with Razorpay's own stack)

As of the current Razorpay 2026 public roadmap (FTX'26, Sprint'26 announcements):
- **Agent Studio**: B2B agent marketplace built on Anthropic's Claude Agent SDK — merchants deploy pre-built agents (dispute response, cart recovery, subscription retry, cashflow forecasting).
- **Agentic Experience Platform**: conversational, AI-native merchant operations layer.
- **UPI Reserve Pay**: consent-based, pre-authorized payments — a user grants an agent a spending limit *once*.
- Pilots with Zomato, Swiggy, PVR Inox, Vodafone Idea for in-app conversational checkout; a joint Razorpay/NPCI/OpenAI pilot for agentic UPI payments inside ChatGPT via BigBasket.

None of this is a per-action, ML-scored, behaviorally-aware enforcement layer sitting between an agent's individual payment calls and the payment API — it's authorization-at-consent-time infrastructure. AgentPay Guard's explicit job is to be the thing that runs *after* consent, on *every single payment action*, which is also the gap articulated publicly by AWS Bedrock AgentCore Payments ("spending limits must be enforced outside the model, at the infrastructure layer") and by independent projects like `sardis-guardrails` (circuit breakers/kill switches/behavioral monitoring for agent payments). This is an active, validated 2026 problem category — we are not claiming to have invented it, we are claiming to have built a Razorpay-specific, ML-substantive implementation of it.

## 1. Component diagram

```
┌────────────┐        ┌────────────────────────────────────────────────────────┐
│  AI Agent   │  NL    │  /guard/authorize  (ONE TIME per session)               │
│ (Claude SDK │ ─────► │   - rule-based (LLM-swappable) intent extraction        │
│  or similar)│        │   - produces AgentCapability, stored server-side        │
└────────────┘        └────────────────────────────────────────────────────────┘
       │                                    │
       │ per payment action                 ▼ capability_id (bounded authorization)
       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  /guard/evaluate  (EVERY payment action)                                      │
│                                                                                 │
│  1. Deterministic Policy Engine (policy_engine.py)  — NO ML, NO LLM            │
│       amount / quantity / category / merchant / daily-spend / replay / velocity│
│       -> any HARD violation short-circuits straight to BLOCK                   │
│                                                                                 │
│  2. ML Risk Model (risk_model.py)                                              │
│       supervised Random Forest -> risk_score in [0,1]                          │
│       unsupervised Isolation Forest -> behavioral_anomaly bool                 │
│                                                                                 │
│  3. Decision Engine (decision_engine.py)                                       │
│       fixed published thresholds combine policy + ML -> ALLOW/STEP_UP/BLOCK    │
│                                                                                 │
│  4. Explainability (explainability.py) — formats REAL signals only, no LLM     │
│                                                                                 │
│  5. On ALLOW: Razorpay test-mode client (razorpay_client.py)                   │
│       real API if keys present, else deterministic mock                        │
│                                                                                 │
│  6. Hash-chained Audit Log (hash_chain.py) — every decision appended           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Why the LLM cannot move money

The intent-extraction LLM call (or its rule-based stand-in in this MVP) runs
**exactly once per session**, at authorization time, and its only output is a
structured `AgentCapability` — a set of numeric/categorical bounds. That
capability is stored server-side and is what every subsequent payment action
is checked against. The code path that actually calls Razorpay
(`/guard/evaluate` → policy engine → decision engine → razorpay_client) contains
**no model inference that can directly emit "pay ₹X to Y"** — it only ever
reads pre-validated structured fields and runs deterministic comparisons. A
hallucinated or manipulated agent message can, at worst, cause a *request* to
be sent to `/guard/evaluate` with bad values — and that request is then
checked against the capability by ordinary code, not asked to justify itself
to another model.

## 3. Data model

See section F of the original blueprint (README references this). Implemented
subset in this MVP: `AgentCapability` (in-memory), `PaymentRequest` (in-memory,
per-call), audit_log (SQLite, persistent). Not yet implemented: Postgres-backed
`users`/`policies`/`sessions` tables — currently these are process-local dicts
in `main.py` (`CAPABILITIES`, `SESSION_STATS`), which is a known limitation
(see below), acceptable for a single-process hackathon demo.

## 4. Failure handling (production-mindset)

| Failure | Behavior |
|---|---|
| Razorpay API timeout | `RealRazorpayClient`/`MockRazorpayClient` return `status="pending"`, no automatic retry. Idempotency key is already recorded, so any legitimate client-side retry is deduplicated by the policy engine. |
| ML model artifact missing/unloadable | `RiskModel.available=False` → fixed conservative `risk_score=0.6`+`behavioral_anomaly=True` → decision engine forces at least `STEP_UP`, never silently `ALLOW`s. |
| Duplicate payment request | Idempotency key check in policy engine → `REPLAY_DETECTED` (hard violation) → `BLOCK`. |
| Conflicting signals (policy soft violation + low risk) | Soft violations always contribute to at least `STEP_UP`; never silently dropped. |
| Capability not found / expired | 404 / `CAPABILITY_EXPIRED` hard violation. |

## 5. Known limitations (honest list — read before demoing)

- **Cold-start merchant familiarity**: `merchant_known` is tracked per
  in-memory session, not per real user purchase history, so the *first*
  action in any session looks "unfamiliar" unless the caller explicitly
  passes `merchant_known=true`. In a production version this would be backed
  by a real historical merchant-affinity table per user. The demo scenarios
  pass this explicitly where relevant and document why.
- **Audit log is tamper-evident, not tamper-proof** — see the docstring in
  `hash_chain.py`. It detects retroactive edits on verification; it does not
  prevent a privileged operator from rewriting the whole chain, since there's
  no external anchor.
- **In-memory capability/session store**: fine for one FastAPI process; would
  need Postgres + Redis (as originally scoped) for multi-instance deployment.
- **Rule-based intent extraction**: deliberately simple (regex-based) so the
  whole system runs without any external LLM API dependency. A real LLM call
  can be substituted behind the same function signature in
  `intent_extraction.py`, but its structured output must still pass the same
  validation the rule-based version does — the interview-ready point is that
  swapping the extractor doesn't change any safety property of the system,
  because the extractor's blast radius is already limited to one structured
  object per session.
- **No frontend yet** — by design, per explicit build-order instruction to
  finish backend/ML/security first.
