# AgentPay Guard

Continuous per-action authorization and security layer for AI-agent commerce.

**"We don't trust the agent. We constrain it."**

## Problem
AI agents (like ChatGPT) are being given the ability to make payments on behalf of users. But an LLM is a probabilistic engine. How do we ensure that every financial action it takes remains consistent with the user's original intent, hard deterministic boundaries, and normal behavioral patterns?

## Solution
AgentPay Guard translates natural language intent into a bounded, deterministic "Capability" using an LLM. Once authorized, the LLM is cut off from payment execution. Every subsequent agent action is evaluated by a pure deterministic Policy Engine, scored by an ML Risk Engine for behavioral anomalies, and recorded immutably in a Hash-Chained Audit Log before reaching Razorpay.

## Architecture

1. **User Intent**: "Buy a laptop from Amazon for no more than 70k."
2. **AI Component (Ollama qwen3:4b)**: Extracts intent into a structured capability.
3. **Security Model (Deterministic Policy)**: Enforces hard limits (amount, quantity, merchant, replay, velocity).
4. **ML Component**: Logistic Regression trained on 24k synthetic events. Evaluates behavioral anomalies (velocity, merchant switching).
5. **Decision Engine**: ALLOW, STEP-UP, or BLOCK.
6. **Razorpay Integration**: Only executed if ALLOW. Timeouts become PENDING. Blocked transactions skip execution.
7. **Audit Log**: Immutable chained hashing of all events.

## Attack Scenarios Tested
- **Legitimate**: Normal authorized purchase.
- **Amount Manipulation**: Agent exceeds max authorized value.
- **Quantity & Velocity Burst**: Rapid sequential purchases triggering ML anomaly.
- **Merchant Substitution**: Purchase attempted at unauthorized vendor.
- **Replay Attack**: Same idempotency key submitted twice.
- **Prompt Injection**: Malicious "ignore previous instructions" intent bypassed.

## Evaluation
- True held-out test evaluation on a 4,800 event test set.
- Supervised Logistic Regression.
- F1 Score, Precision, and Recall are dynamically exposed on the `/metrics` endpoint.

## Setup & Running

### Environment Variables
Copy `.env.example` to `.env`:
```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b

RAZORPAY_MODE=test
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

### Running Ollama (Local LLM)
Make sure you have Ollama installed and the model downloaded:
```bash
ollama run qwen3:4b
```

### Running Backend (FastAPI)
```bash
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

### Running Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

### System Verification & Tests
Ensure the entire pipeline works end-to-end:
```bash
python scripts/verify_system.py
python -m pytest tests/ -v
```
