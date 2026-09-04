import { useState, useEffect } from 'react';
import { 
  Shield, Activity, Settings, Database, TerminalSquare, AlertTriangle, 
  CheckCircle, XCircle, ChevronRight, Server, Brain, CreditCard, Lock, List
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [health, setHealth] = useState({ backend: false, ollama: false, ollamaModel: '', razorpayMode: 'MOCK', razorpayReachable: false });
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simStatus, setSimStatus] = useState('');

  useEffect(() => {
    fetchData();
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const [hRes, llmRes, rzpRes] = await Promise.all([
        fetch(`${API_BASE}/health`).catch(() => null),
        fetch(`${API_BASE}/health/llm`).catch(() => null),
        fetch(`${API_BASE}/health/razorpay`).catch(() => null)
      ]);
      
      const backend = hRes?.status === 200;
      const llmData = llmRes?.status === 200 ? await llmRes.json() : {};
      const rzpData = rzpRes?.status === 200 ? await rzpRes.json() : {};
      
      setHealth({
        backend,
        ollama: llmData.available || false,
        ollamaModel: llmData.model || 'qwen3:4b',
        razorpayMode: rzpData.mode || 'mock',
        razorpayReachable: rzpData.reachable || false
      });
    } catch (e) {
      console.error("Health check failed", e);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`);
      const data = await res.json();
      setMetrics(data);
      
      const txRes = await fetch(`${API_BASE}/transactions`);
      if (txRes.status === 200) {
        setTransactions(await txRes.json());
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  const runSimulation = async (scenario) => {
    setLoading(true);
    setSimResult(null);
    setSimStatus(`Initializing ${scenario}...`);
    try {
      setTimeout(() => setSimStatus("Analyzing intent (Ollama)..."), 500);
      setTimeout(() => setSimStatus("Evaluating deterministic policy..."), 1200);
      setTimeout(() => setSimStatus("Assessing behavioral risk (ML)..."), 1800);
      
      const res = await fetch(`${API_BASE}/simulation/${scenario}`, { method: 'POST' });
      const data = await res.json();
      
      if (data.outcome === 'ALLOW') {
        setTimeout(() => setSimStatus("Creating Razorpay test order..."), 2400);
      }
      
      setTimeout(() => {
        setSimResult({ scenario, data });
        setLoading(false);
        setSimStatus('');
        fetchData(); // refresh tx list
      }, data.outcome === 'ALLOW' ? 3000 : 2000);
      
    } catch (e) {
      console.error(e);
      setLoading(false);
      setSimStatus('Simulation failed to connect to backend.');
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo-container">
          <div className="logo-main">
            <Shield size={28} />
            <span className="logo-text">AgentPay Guard</span>
          </div>
          <span className="logo-sub">AI Agent Payment Security</span>
        </div>

        <div className="nav-menu">
          <NavItem icon={<Activity />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<List />} label="Transaction Monitor" active={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')} />
          <NavItem icon={<TerminalSquare />} label="Attack Simulator" active={activeTab === 'simulation'} onClick={() => setActiveTab('simulation')} />
          <NavItem icon={<Lock />} label="Security Pipeline" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} />
          <NavItem icon={<Brain />} label="ML Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <NavItem icon={<Settings />} label="Policies" active={activeTab === 'policies'} onClick={() => setActiveTab('policies')} />
          <NavItem icon={<Database />} label="Audit Log" active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
        </div>

        <div className="system-status">
          <div className="system-status-title">SYSTEM STATUS</div>
          <StatusRow label="Backend" status={health.backend ? 'ONLINE' : 'OFFLINE'} type={health.backend ? 'online' : 'offline'} />
          <StatusRow label="Policy Engine" status={health.backend ? 'ONLINE' : 'OFFLINE'} type={health.backend ? 'online' : 'offline'} />
          <StatusRow label="ML Engine" status={health.backend ? 'ONLINE' : 'OFFLINE'} type={health.backend ? 'online' : 'offline'} />
          <StatusRow label="Ollama" status={health.ollama ? 'ONLINE' : 'OFFLINE'} type={health.ollama ? 'online' : 'offline'} />
          <StatusRow label="Razorpay" status={health.razorpayMode.toUpperCase()} type={health.razorpayMode === 'test' ? 'online' : 'pending'} />
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'overview' && (
          <div>
            <div className="header">
              <h1>Security Dashboard</h1>
              <p>Continuous authorization for AI-agent commerce. <span className="badge badge-blue">DEMO SESSION</span></p>
            </div>
            
            <div className="dashboard-grid">
              <div className="card stat-card">
                <h3>Total Evaluated</h3>
                <div className="value">{transactions.length}</div>
              </div>
              <div className="card stat-card">
                <h3>Attacks Blocked</h3>
                <div className="value text-red">{transactions.filter(t => t.decision === 'BLOCK').length}</div>
              </div>
              <div className="card stat-card">
                <h3>Protected Value</h3>
                <div className="value">₹{metrics?.results?.random_forest?.financial?.value_correctly_blocked_inr?.toLocaleString() || '0'}</div>
              </div>
            </div>

            <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>ML MODEL PERFORMANCE (RANDOM FOREST)</h3>
            <div className="dashboard-grid">
              <div className="card stat-card">
                <h3>Precision</h3>
                <div className="value text-green">{metrics?.results?.random_forest?.precision ? (metrics.results.random_forest.precision * 100).toFixed(1) + '%' : '--'}</div>
              </div>
              <div className="card stat-card">
                <h3>Recall</h3>
                <div className="value">{metrics?.results?.random_forest?.recall ? (metrics.results.random_forest.recall * 100).toFixed(1) + '%' : '--'}</div>
              </div>
              <div className="card stat-card">
                <h3>F1 Score</h3>
                <div className="value text-blue">{metrics?.results?.random_forest?.f1 ? (metrics.results.random_forest.f1 * 100).toFixed(1) + '%' : '--'}</div>
              </div>
            </div>

            <h3 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>INTEGRATIONS</h3>
            <table className="data-table card">
              <tbody>
                <tr>
                  <td><Server size={18} className="text-secondary"/> Backend</td>
                  <td><span className={`badge ${health.backend ? 'badge-green' : 'badge-red'}`}>{health.backend ? 'ONLINE' : 'OFFLINE'}</span></td>
                </tr>
                <tr>
                  <td><Brain size={18} className="text-secondary"/> Ollama LLM</td>
                  <td>
                    <span className={`badge ${health.ollama ? 'badge-green' : 'badge-red'}`}>{health.ollama ? 'CONNECTED' : 'OFFLINE'}</span>
                    <span style={{marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)'}}>Model: {health.ollamaModel}</span>
                  </td>
                </tr>
                <tr>
                  <td><CreditCard size={18} className="text-secondary"/> Razorpay</td>
                  <td>
                    <span className={`badge ${health.razorpayMode === 'test' ? 'badge-blue' : 'badge-red'}`}>
                      {health.razorpayMode.toUpperCase()} MODE
                    </span>
                    <span style={{marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                      {health.razorpayReachable ? 'API Connected' : (health.razorpayMode === 'mock' ? 'Local Simulation' : 'API Unavailable')}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'monitor' && (
          <div>
            <div className="header">
              <h1>Transaction Monitor</h1>
              <p>Live view of all agent-initiated payment requests.</p>
            </div>
            <div className="card" style={{padding: 0, overflow: 'hidden'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>ID</th>
                    <th>Merchant</th>
                    <th>Amount</th>
                    <th>Decision</th>
                    <th>Razorpay</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No transactions yet. Run the Simulator.</td></tr>
                  ) : (
                    transactions.map((tx, i) => (
                      <tr key={i} onClick={() => { setActiveTab('simulation'); /* In a real app we'd load the specific tx */ }}>
                        <td>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                        <td className="font-mono">{tx.request_id?.split('_')[1] || 'N/A'}</td>
                        <td>{tx.merchant || 'Unknown'}</td>
                        <td>₹{(tx.amount || 0).toLocaleString()}</td>
                        <td><span className={`badge ${tx.decision === 'ALLOW' ? 'badge-green' : 'badge-red'}`}>{tx.decision}</span></td>
                        <td>{tx.decision === 'ALLOW' ? 'TEST API' : 'SKIPPED'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div>
            <div className="header">
              <h1>Attack Simulator</h1>
              <p>Run scenarios through the live deterministic policy & ML pipeline.</p>
            </div>
            
            <div className="simulation-actions">
              <button className="sim-btn" onClick={() => runSimulation('legitimate')} disabled={loading}>
                <div className="sim-title"><CheckCircle className="text-green"/> Legitimate Purchase</div>
                <div className="sim-desc">Agent purchases authorized laptop within constraints.</div>
                <div className="sim-prop">Full Pipeline Success</div>
              </button>
              
              <button className="sim-btn" onClick={() => runSimulation('amount_manipulation')} disabled={loading}>
                <div className="sim-title"><AlertTriangle className="text-red"/> Amount Manipulation</div>
                <div className="sim-desc">Agent attempts to exceed the user's authorized spending limit (₹1.85L).</div>
                <div className="sim-prop">Deterministic Policy</div>
              </button>
              
              <button className="sim-btn" onClick={() => runSimulation('quantity_velocity')} disabled={loading}>
                <div className="sim-title"><Activity className="text-red"/> Quantity & Velocity Burst</div>
                <div className="sim-desc">Agent rapidly attempts to purchase 3 laptops. Triggers ML anomaly detection.</div>
                <div className="sim-prop">ML Risk Engine</div>
              </button>
              
              <button className="sim-btn" onClick={() => runSimulation('merchant_substitution')} disabled={loading}>
                <div className="sim-title"><AlertTriangle className="text-yellow"/> Merchant Substitution</div>
                <div className="sim-desc">Agent attempts purchase at unauthorized 'ShadyTechStore'.</div>
                <div className="sim-prop">Deterministic Policy</div>
              </button>
              
              <button className="sim-btn" onClick={() => runSimulation('llm_manipulation')} disabled={loading}>
                <div className="sim-title"><TerminalSquare className="text-red"/> Prompt Injection</div>
                <div className="sim-desc">Malicious instruction tells Agent to ignore previous limits.</div>
                <div className="sim-prop">Capability Boundary</div>
              </button>
              
              <button className="sim-btn" onClick={() => runSimulation('replay')} disabled={loading}>
                <div className="sim-title"><Database className="text-red"/> Replay Attack</div>
                <div className="sim-desc">Attempt to submit the exact same transaction ID twice.</div>
                <div className="sim-prop">Idempotency Policy</div>
              </button>
            </div>

            {loading && (
              <div className="card flex items-center justify-center" style={{padding: '3rem', marginBottom: '2rem'}}>
                <div className="flex-col items-center gap-4">
                  <div className="loader" style={{width: '30px', height: '30px', border: '3px solid var(--border-glass)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                  <div className="text-secondary font-mono">{simStatus}</div>
                </div>
              </div>
            )}

            {simResult && <InvestigationView result={simResult.data} scenario={simResult.scenario} />}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div>
            <div className="header">
              <h1>Security Pipeline</h1>
              <p>THE LLM NEVER HAS DIRECT PAYMENT AUTHORITY.</p>
            </div>
            
            <div className="arch-box" style={{maxWidth: '600px', margin: '0 auto', textAlign: 'left'}}>
              <h3>1. USER INTENT</h3>
              <p className="text-secondary text-sm">Natural language request from user.</p>
            </div>
            <div className="arch-arrow">↓</div>
            
            <div className="arch-box" style={{maxWidth: '600px', margin: '0 auto', textAlign: 'left'}}>
              <h3>2. LLM / FALLBACK (INTERPRETS)</h3>
              <p className="text-secondary text-sm">Translates intent into a strict JSON schema. If offline, rule-based fallback applies.</p>
            </div>
            <div className="arch-arrow">↓</div>

            <div className="arch-box" style={{maxWidth: '600px', margin: '0 auto', textAlign: 'left', borderColor: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.05)'}}>
              <h3>3. CAPABILITY CHECK (AUTHORIZES)</h3>
              <p className="text-secondary text-sm">Deterministic Policy Engine enforces hard financial boundaries (Amount, Qty, Merchant, Replay).</p>
            </div>
            <div className="arch-arrow">↓</div>

            <div className="arch-box" style={{maxWidth: '600px', margin: '0 auto', textAlign: 'left'}}>
              <h3>4. RISK ENGINE (ASSESSES RISK)</h3>
              <p className="text-secondary text-sm">ML evaluates behavioral patterns (Velocity, Category Switching) for anomalies.</p>
            </div>
            <div className="arch-arrow">↓</div>

            <div className="arch-box" style={{maxWidth: '600px', margin: '0 auto', textAlign: 'left', borderColor: 'var(--accent-green)'}}>
              <h3>5. DECISION GATE (CONTROLS)</h3>
              <p className="text-secondary text-sm">Only ALLOWs if Policy PASSES and Risk is LOW.</p>
            </div>
            <div className="arch-arrow">↓</div>

            <div className="arch-box" style={{maxWidth: '600px', margin: '0 auto', textAlign: 'left'}}>
              <h3>6. RAZORPAY & AUDIT (EXECUTES)</h3>
              <p className="text-secondary text-sm">Test API executed. Chain-hashed audit log recorded.</p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="header">
              <h1>ML Analytics</h1>
              <p>True held-out evaluation on 24k synthetic events. metrics.json source.</p>
            </div>
            {metrics ? (
              <table className="data-table card">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>F1 Score</th>
                    <th>Precision</th>
                    <th>Recall</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Naive Baseline</td>
                    <td>{(metrics.results.naive_threshold_baseline.f1 * 100).toFixed(1)}%</td>
                    <td>{(metrics.results.naive_threshold_baseline.precision * 100).toFixed(1)}%</td>
                    <td>{(metrics.results.naive_threshold_baseline.recall * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="text-green">Full Model (Logistic Regression)</td>
                    <td className="text-green font-bold">{(metrics.results.random_forest.f1 * 100).toFixed(1)}%</td>
                    <td>{(metrics.results.random_forest.precision * 100).toFixed(1)}%</td>
                    <td>{(metrics.results.random_forest.recall * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>w/o Behavioral Features</td>
                    <td className="text-red">{(metrics.results.ablation_no_behavioral.f1 * 100).toFixed(1)}%</td>
                    <td>{(metrics.results.ablation_no_behavioral.precision * 100).toFixed(1)}%</td>
                    <td>{(metrics.results.ablation_no_behavioral.recall * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>w/o Merchant Features</td>
                    <td className="text-red">{(metrics.results.ablation_no_merchant.f1 * 100).toFixed(1)}%</td>
                    <td>{(metrics.results.ablation_no_merchant.precision * 100).toFixed(1)}%</td>
                    <td>{(metrics.results.ablation_no_merchant.recall * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            ) : <p>Loading metrics...</p>}
          </div>
        )}

        {activeTab === 'policies' && (
          <div>
            <div className="header">
              <h1>Policies</h1>
              <p>Implemented deterministic boundary controls.</p>
            </div>
            <div className="card">
              <div className="data-row"><span className="data-label text-green">Maximum transaction amount</span><span className="data-value">IMPLEMENTED</span></div>
              <div className="data-row"><span className="data-label text-green">Maximum quantity</span><span className="data-value">IMPLEMENTED</span></div>
              <div className="data-row"><span className="data-label text-green">Allowed categories</span><span className="data-value">IMPLEMENTED</span></div>
              <div className="data-row"><span className="data-label text-green">Blocked merchants</span><span className="data-value">IMPLEMENTED</span></div>
              <div className="data-row"><span className="data-label text-green">Replay protection</span><span className="data-value">IMPLEMENTED</span></div>
              <div className="data-row"><span className="data-label text-secondary">Geofencing</span><span className="data-value text-secondary">NOT CONFIGURED</span></div>
            </div>
          </div>
        )}
        
        {activeTab === 'audit' && (
          <div>
            <div className="header">
              <h1>Audit Log</h1>
              <p>Chain-hashed integrity records.</p>
            </div>
            <div className="card" style={{padding: 0, overflow: 'hidden'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>ID</th>
                    <th>Decision</th>
                    <th>Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={i}>
                      <td>{new Date(tx.timestamp).toLocaleString()}</td>
                      <td className="font-mono">{tx.request_id?.split('_')[1] || 'N/A'}</td>
                      <td><span className={`badge ${tx.decision === 'ALLOW' ? 'badge-green' : 'badge-red'}`}>{tx.decision}</span></td>
                      <td className="font-mono text-secondary" style={{fontSize: '0.75rem'}}>{tx.hash?.substring(0, 16)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon} <span>{label}</span>
    </div>
  );
}

function StatusRow({ label, status, type }) {
  return (
    <div className="status-row">
      <span className="text-secondary">{label}</span>
      <div className="status-indicator">
        <div className={`status-dot ${type}`}></div>
        <span className={type === 'online' ? 'text-green' : type === 'offline' ? 'text-red' : 'text-secondary'}>{status}</span>
      </div>
    </div>
  );
}

function InvestigationView({ result, scenario }) {
  if (!result || !result.audit) return null;
  const decision = result.outcome;
  const isBlock = decision === 'BLOCK';
  
  const req = result.audit.request;
  const violations = result.audit.policy_violations || [];
  const mlResult = result.audit.ml_result || {};
  const ext = result.extraction || {};
  const razorpay = result.razorpay;
  const rzpMode = result.razorpay_mode || "mock";
  
  return (
    <div className="investigation-view">
      <div className="header" style={{marginBottom: '1rem', borderBottom: 'none', paddingBottom: 0}}>
        <h2 style={{fontSize: '1.5rem'}}>TRANSACTION #{req.request_id?.split('_')[1]?.toUpperCase() || 'ID'}</h2>
        {scenario === 'llm_manipulation' && <div className="text-red" style={{marginTop: '0.5rem', fontWeight: 600}}>⚠ PROMPT INJECTION ATTEMPT DETECTED</div>}
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className="step-dot active-blue"></div>
          <div className="step-line"></div>
        </div>
        <div className="flow-content">
          <div className="flow-card">
            <div className="flow-header">01 User Intent</div>
            <div className="code-block">"{ext.source_text || 'Buy a laptop under ₹70,000'}"</div>
          </div>
        </div>
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className="step-dot active-blue"></div>
          <div className="step-line"></div>
        </div>
        <div className="flow-content">
          <div className="flow-card highlight">
            <div className="flow-header flex justify-between">
              <span>02 LLM Extraction</span>
              <span className={`badge ${ext.success ? 'badge-green' : 'badge-red'}`}>{ext.success ? 'VALIDATED' : 'FALLBACK'}</span>
            </div>
            <div className="data-row"><span className="data-label">Provider / Model</span><span className="data-value">{ext.provider || 'ollama'} / {ext.model || 'qwen3:4b'}</span></div>
            <div className="data-row"><span className="data-label">Extraction Method</span><span className="data-value">{ext.extraction_method === 'llm' ? 'Generative AI' : 'Rule-Based Fallback'}</span></div>
          </div>
        </div>
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className="step-dot active-blue"></div>
          <div className="step-line"></div>
        </div>
        <div className="flow-content">
          <div className="flow-card">
            <div className="flow-header">03 Agent Capability</div>
            <div className="data-row"><span className="data-label">Authorized Amount</span><span className="data-value">₹{ext.capability?.max_amount?.toLocaleString() || '70,000'}</span></div>
            <div className="data-row"><span className="data-label">Authorized Quantity</span><span className="data-value">{ext.capability?.max_quantity || '1'}</span></div>
          </div>
        </div>
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className="step-dot active-gray"></div>
          <div className="step-line"></div>
        </div>
        <div className="flow-content">
          <div className="flow-card" style={{background: 'transparent'}}>
            <div className="flow-header">04 Agent Action</div>
            <div className="data-row"><span className="data-label">Requested Amount</span><span className={`data-value ${req.amount > (ext.capability?.max_amount||70000) ? 'text-red' : ''}`}>₹{req.amount?.toLocaleString()}</span></div>
            <div className="data-row"><span className="data-label">Requested Quantity</span><span className={`data-value ${req.quantity > (ext.capability?.max_quantity||1) ? 'text-red' : ''}`}>{req.quantity}</span></div>
            <div className="data-row"><span className="data-label">Merchant</span><span className="data-value">{req.merchant}</span></div>
          </div>
        </div>
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className={`step-dot ${violations.length > 0 ? 'active-red' : 'active-green'}`}></div>
          <div className="step-line"></div>
        </div>
        <div className="flow-content">
          <div className="flow-card">
            <div className="flow-header flex justify-between">
              <span>05 Deterministic Policy</span>
              <span className={violations.length > 0 ? 'badge badge-red' : 'badge badge-green'}>
                {violations.length > 0 ? 'FAIL' : 'PASS'}
              </span>
            </div>
            {violations.length === 0 ? (
              <div className="check-item pass"><CheckCircle size={16} /> All policy checks passed</div>
            ) : (
              violations.map((v, i) => (
                <div key={i} className="check-item fail"><XCircle size={16} /> {v.message}</div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className={`step-dot ${mlResult.risk_score > 0.5 ? 'active-red' : 'active-green'}`}></div>
          <div className="step-line"></div>
        </div>
        <div className="flow-content">
          <div className="flow-card">
            <div className="flow-header flex justify-between">
              <span>06 ML Risk & Behavior</span>
              <span className={mlResult.risk_score > 0.5 ? 'badge badge-red' : 'badge badge-green'}>
                {mlResult.risk_score > 0.5 ? 'HIGH RISK' : 'LOW RISK'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Risk Score</span>
              <span className={`data-value ${mlResult.risk_score > 0.5 ? 'text-red' : 'text-green'}`}>{mlResult.risk_score?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Behavioral Assessment</span>
              <span className={`data-value ${mlResult.anomaly_detected ? 'text-red' : 'text-green'}`}>
                {mlResult.anomaly_detected ? '⚠ ANOMALOUS' : '✓ NORMAL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className={`step-dot ${isBlock ? 'active-red' : 'active-green'}`}></div>
          <div className="step-line"></div>
        </div>
        <div className="flow-content" style={{width: '100%'}}>
          <div className={`decision-block ${isBlock ? 'block' : 'allow'}`}>
            <div className="flow-header" style={{color: 'inherit', justifyContent: 'center'}}>07 Final Decision</div>
            <h2>{isBlock ? 'BLOCKED' : 'ALLOW'}</h2>
          </div>
          
          <div className={`explanation-panel ${isBlock ? 'block' : 'allow'}`}>
            <h3>WHY WAS THIS {isBlock ? 'BLOCKED' : 'ALLOWED'}?</h3>
            <ul className="explanation-list">
              {violations.length > 0 ? (
                violations.map((v, i) => (
                  <li key={i}><XCircle size={16} className="text-red" style={{flexShrink: 0}}/> {v.message}</li>
                ))
              ) : (
                <li><CheckCircle size={16} className="text-green" style={{flexShrink: 0}}/> Intent validated and limits respected.</li>
              )}
              {mlResult.risk_score > 0.5 && (
                <li><AlertTriangle size={16} className="text-red" style={{flexShrink: 0}}/> ML Risk Score ({mlResult.risk_score?.toFixed(2)}) exceeded acceptable threshold. Behavioral anomaly detected.</li>
              )}
              {isBlock && (
                <li><Lock size={16} className="text-secondary" style={{flexShrink: 0}}/> Payment blocked. Razorpay API was NOT called.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className={`step-dot ${isBlock ? 'active-gray' : 'active-blue'}`}></div>
          <div className="step-line" style={{display: 'none'}}></div>
        </div>
        <div className="flow-content">
          <div className="flow-card">
            <div className="flow-header flex justify-between">
              <span>08 Razorpay ({rzpMode.toUpperCase()} MODE)</span>
              <span className="badge badge-gray">{isBlock ? 'NOT CALLED' : 'CALLED'}</span>
            </div>
            {isBlock ? (
              <div className="text-secondary" style={{fontSize: '0.9rem'}}>No API call was made because authorization failed upstream.</div>
            ) : (
              <div>
                <div className="data-row"><span className="data-label">Order ID</span><span className="data-value">{razorpay?.order_id || 'PENDING'}</span></div>
                <div className="data-row"><span className="data-label">Status</span><span className="data-value">{razorpay?.status || 'N/A'}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
