# AgentPay Guard

**Continuous per-action authorization and behavioral security for agentic payments.**

Built for the Razorpay AI Buildathon 2026 — Track 01 (AI Growth & Agentic Commerce).

> Razorpay's Reserve Pay / Agent Studio solve **one-time consent**: a user
> authorizes an agent to spend up to a limit. AgentPay Guard solves the next
> problem — **verifying every individual payment action the agent later
> generates still matches that authorization**, using a deterministic policy
> engine (so an LLM hallucination literally cannot move money), a supervised
> ML risk model, and an unsupervised behavioral-anomaly detector, with a full
> explainable, tamper-evident audit trail.

## Why this exists (competitive positioning)

Researched before building — see `docs/ARCHITECTURE.md` §0 for citations.
Razorpay already ships UPI Reserve Pay (consent-based, pre-authorized spend
limits) and an Agent Studio built on Anthropic's Claude Agent SDK. AgentPay
Guard is designed to sit **downstream** of that stack, as the per-action
control plane — extending Razorpay's own architecture rather than competing
with it.

## Architecture (one line)

```
Agent -> POST /guard/evaluate -> [Policy Engine (deterministic)]
                                -> [ML Risk Model + Behavioral Anomaly Detector]
                                -> [Decision Engine: ALLOW / STEP_UP / BLOCK]
                                -> [Explainability + Hash-chained Audit Log]
                                -> (on ALLOW) Razorpay test-mode Orders API
```

Full details: `docs/ARCHITECTURE.md`. Threats modeled: `docs/THREAT_MODEL.md`.
Real (not fabricated) ML evaluation results: `docs/EVALUATION.md`.

## Quickstart

```bash
cd agentpay-guard
pip install -r requirements.txt          # or: pip install --break-system-packages -r requirements.txt
cp .env.example .env                     # optional — works without Razorpay keys via mock client

# 1. Generate the synthetic dataset (deterministic, seeded)
python data/generate_synthetic_data.py --n 25000 --out data/synthetic_events.csv

# 2. Train + evaluate the ML risk model (writes real metrics, no fabrication)
python -m backend.app.ml.train --data data/synthetic_events.csv --out backend/app/ml/artifacts

# 3. Run unit tests
python -m pytest tests/ -q

# 4. Start the API server
uvicorn backend.app.main:app --reload --port 8000
# then see interactive docs at http://localhost:8000/docs

# 5. Start the Frontend UI
cd frontend
npm install
npm run dev
```

## What's implemented right now

- Deterministic policy engine (amount/quantity/category/merchant/daily-spend/replay/velocity/expiry)
- Supervised ML risk model (Random Forest, selected over Logistic Regression by validation F1)
  + unsupervised Isolation Forest behavioral-anomaly channel, trained on a
  reproducible 24k-event synthetic dataset with real held-out test metrics and ablation studies.
- Decision engine combining both, with a published, fixed threshold hierarchy
- **Ollama LLM (qwen3:4b)** intent extraction (NL authorization -> structured `AgentCapability`), with a deterministic regex/rule-based fallback.
- Hash-chained, tamper-evident audit log with a `/guard/audit/verify` endpoint
- Razorpay test-mode client with automatic fallback to a mock client, and
  explicit timeout handling (PENDING, no blind retry) matching real
  payment-system failure semantics
- **Frontend Dashboard** built with React + Vite, including a live Attack Simulator and ML Analytics UI.
- 5 reproducible end-to-end scenarios (legit ALLOW, amount manipulation BLOCK,
  quantity+velocity manipulation BLOCK, replay BLOCK, prompt injection BLOCK)
- Passing unit tests

## What's NOT implemented yet

- Postgres persistence for capabilities/sessions (currently in-memory + SQLite audit log only)
- Multi-process/Redis-backed velocity store (current store is process-local, fine for a single-instance demo)

See `docs/ARCHITECTURE.md` §"Known limitations" for the full, honest list.

## Repository structure

```
agentpay-guard/
  backend/app/
    core/            policy_engine, decision_engine, explainability, capability, intent_extraction
    ml/               features, train, risk_model, artifacts/ (trained model + metrics.json)
    audit/           hash_chain
    main.py          FastAPI app
    razorpay_client.py
  data/               synthetic data generator + generated CSV
  scripts/            run_demo_scenarios.py
  tests/              pytest unit tests
  docs/               ARCHITECTURE.md, THREAT_MODEL.md, EVALUATION.md, API.md, DEMO_SCRIPT.md
  frontend/           Vite + React UI Control Plane
```
