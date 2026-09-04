# Demo Script (target 3–5 minutes)

Run the backend API (`uvicorn backend.app.main:app --reload`) and the frontend UI (`npm run dev` in `frontend`).

1. **(0:00–0:20) Framing** — "Razorpay's own 2026 roadmap is agentic payments: Reserve Pay gives an agent a one-time spending-limit consent. We built the layer that comes after that consent — verifying every individual payment action the agent generates actually stays inside it, with ML-scored risk and a deterministic floor that an LLM can't override."
2. **(0:20–0:40) Architecture & Frontend** — Show the new React Control Plane. Explain: "the LLM (Ollama qwen3:4b) extracts the authorization intent once; every payment action after that is checked by ordinary deterministic code — a hallucination cannot move money."
3. **(0:40–1:30) Scenario 1 — Legitimate Purchase.** Click "Legitimate Purchase" in Attack Simulator. Show the `ALLOW` decision. Drill down into the Transaction Investigation view to show the exact policy pass, ML low risk score, and mock Razorpay order.
4. **(1:30–2:10) Scenario 2 — Amount Manipulation.** Click "Amount Manipulation". Agent requests ₹1,85,000 against a ₹70,000 authorization → `BLOCK`. Show the UI highlighting exactly why it failed (deterministic policy block).
5. **(2:10–2:40) Scenario 3 — LLM Security / Prompt Injection.** Click "Prompt Injection". Show the malicious prompt injected into the LLM attempting to bypass limits. The Guard's deterministic policy still catches the quantity/amount violations and `BLOCK`s the transaction. This proves the security property holds even if the LLM is compromised.
6. **(2:40–3:10) Scenario 4 — Quantity + Velocity.** Click "Quantity + Velocity". Show the explicit blocks for both high quantity and rapid consecutive tool calls triggering behavioral anomaly.
7. **(3:10–3:45) Scenario 5 — Replay.** Click "Replay Attack". The same idempotency key is submitted twice → second call blocked with `REPLAY_DETECTED`.
8. **(3:45–4:30) Evaluation & Analytics** — Open the "ML Analytics" tab. Show the actual held-out metrics from the pipeline. Explain the ablation study (Random Forest Full Model vs without behavioral/merchant features). Point out the F1 drop from ~0.72 to ~0.57 when behavioral features are removed, proving the ML model earns its place.
9. **(4:30–5:00) Close** — "AgentPay Guard does not ask whether an AI agent is allowed to pay once. It verifies whether every payment action is still consistent with what it was authorized to do."
