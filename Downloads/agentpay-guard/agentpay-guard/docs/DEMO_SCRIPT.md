# Demo Script (target 3–5 minutes)

Run `python scripts/run_demo_scenarios.py` live, narrating each block as it prints.

1. **(0:00–0:20) Framing** — "Razorpay's own 2026 roadmap is agentic payments:
   Reserve Pay gives an agent a one-time spending-limit consent. We built the
   layer that comes after that consent — verifying every individual payment
   action the agent generates actually stays inside it, with ML-scored risk
   and a deterministic floor that an LLM can't override."
2. **(0:20–0:40) Architecture** — show the diagram in `docs/ARCHITECTURE.md`;
   land the one sentence: "the LLM's only output is a structured
   authorization, made once; every payment action after that is checked by
   ordinary deterministic code — a hallucination cannot move money."
3. **(0:40–1:20) Scenario 1 — legitimate purchase.** `ALLOW`, risk score
   printed, mock Razorpay order created, audit hash shown.
4. **(1:20–2:00) Scenario 2 — amount manipulation.** Agent requests ₹7,500
   against a ₹3,000 authorization → `BLOCK`, exact reason
   (`AMOUNT_EXCEEDS_AUTHORIZATION`) printed from the real decision object —
   note this is a *policy* block, not an ML guess.
5. **(2:00–2:45) Scenario 3 — quantity + velocity manipulation.** Show both
   sub-cases blocking for different, explicit reasons.
6. **(2:45–3:15) Scenario 4 — replay.** Same idempotency key submitted twice
   → second call blocked with `REPLAY_DETECTED`.
7. **(3:15–3:45) Scenario 5 — Razorpay timeout.** Show the `PENDING` status
   with `used_mock: true` — no blind retry, no duplicate charge risk.
8. **(3:45–4:15) Evaluation** — open `docs/EVALUATION.md`: Random Forest vs
   naive baseline vs Logistic Regression on the held-out test set; call out
   the false-positive-rate reduction as the concrete ML contribution.
9. **(4:15–4:45) Audit** — `GET /guard/audit/verify` → `valid: true`; briefly
   explain "tamper-evident, not tamper-proof" honestly.
10. **(4:45–5:00) Close** — "Smaller, complete system over a large half-working
    one — this is real ML, real held-out evaluation, a deterministic safety
    floor, and a full audit trail, all reproducible from a single script."
