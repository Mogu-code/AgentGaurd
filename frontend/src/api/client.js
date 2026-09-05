const API_BASE = 'http://localhost:8000';

export const fetchHealth = async () => {
  try {
    const [hRes, llmRes, rzpRes] = await Promise.all([
      fetch(`${API_BASE}/health`).catch(() => null),
      fetch(`${API_BASE}/health/llm`).catch(() => null),
      fetch(`${API_BASE}/health/razorpay`).catch(() => null)
    ]);
    
    const backend = hRes?.status === 200;
    const llmData = llmRes?.status === 200 ? await llmRes.json() : {};
    const rzpData = rzpRes?.status === 200 ? await rzpRes.json() : {};
    
    return {
      backend,
      ollama: llmData.available || false,
      ollamaModel: llmData.model || 'qwen3:4b',
      razorpayMode: rzpData.mode || 'mock',
      razorpayReachable: rzpData.reachable || false
    };
  } catch (e) {
    console.error("Health check failed", e);
    return { backend: false, ollama: false, ollamaModel: '', razorpayMode: 'MOCK', razorpayReachable: false };
  }
};

export const fetchMetrics = async () => {
  const res = await fetch(`${API_BASE}/metrics`);
  return await res.json();
};

export const fetchTransactions = async () => {
  const res = await fetch(`${API_BASE}/transactions`);
  return await res.json();
};

export const fetchPolicies = async () => {
  const res = await fetch(`${API_BASE}/policies`);
  return await res.json();
};

export const verifyAuditChain = async () => {
  const res = await fetch(`${API_BASE}/guard/audit/verify`);
  return await res.json();
};

export const runSimulation = async (scenario) => {
  const res = await fetch(`${API_BASE}/simulation/${scenario}`, { method: 'POST' });
  return await res.json();
};
