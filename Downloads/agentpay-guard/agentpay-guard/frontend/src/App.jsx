import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  Database,
  BarChart2,
  Crosshair,
  CheckCircle,
  XCircle,
  Settings,
  TerminalSquare
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('simulation');
  const [metrics, setMetrics] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/metrics`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setMetrics(data);
      })
      .catch(err => console.error("Failed to fetch metrics", err));
  }, []);

  const runSimulation = async (scenario) => {
    setLoading(true);
    setSimResult(null);
    try {
      const res = await fetch(`${API_BASE}/simulation/${scenario}`, {
        method: 'POST'
      });
      const data = await res.json();
      setSimResult({ scenario, data });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo-container">
          <ShieldCheck className="logo-icon" size={32} />
          <span className="logo-text">AgentPay Guard</span>
        </div>
        
        <div className="nav-menu">
          <div 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={20} /> Overview
          </div>
          <div 
            className={`nav-item ${activeTab === 'simulation' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulation')}
          >
            <Crosshair size={20} /> Attack Simulation
          </div>
          <div 
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={20} /> ML Analytics
          </div>
          <div 
            className={`nav-item ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            <Settings size={20} /> Policies
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'overview' && (
          <div>
            <div className="header">
              <h1>Security Control Plane</h1>
              <p>Continuous per-action verification for AI agents.</p>
            </div>
            
            <div className="dashboard-grid">
              <div className="card stat-card">
                <h3>ML Precision (RF)</h3>
                <div className="value text-green">
                  {metrics?.results?.random_forest?.precision 
                    ? (metrics.results.random_forest.precision * 100).toFixed(1) + '%' 
                    : '--'}
                </div>
              </div>
              <div className="card stat-card">
                <h3>Protected Value</h3>
                <div className="value">
                  ₹{metrics?.results?.random_forest?.financial?.value_correctly_blocked_inr?.toLocaleString() || '--'}
                </div>
              </div>
              <div className="card stat-card">
                <h3>False Positive Cost</h3>
                <div className="value text-red">
                  ₹{metrics?.results?.random_forest?.financial?.value_incorrectly_blocked_inr_fp_cost?.toLocaleString() || '--'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'simulation' && (
          <div>
            <div className="header">
              <h1>Attack Simulation</h1>
              <p>Run scenarios through the live deterministic policy & ML pipeline.</p>
            </div>
            
            <div className="simulation-actions">
              <button className="card button sim-btn" onClick={() => runSimulation('legitimate')} disabled={loading}>
                <div className="flex items-center gap-2"><CheckCircle size={18} className="text-green"/> Legitimate Purchase</div>
                <span>Authorized ₹68,500 laptop</span>
              </button>
              <button className="card button sim-btn" onClick={() => runSimulation('amount_manipulation')} disabled={loading}>
                <div className="flex items-center gap-2"><AlertTriangle size={18} className="text-red"/> Amount Manipulation</div>
                <span>Attempts ₹1,85,000 (Limit ₹70k)</span>
              </button>
              <button className="card button sim-btn" onClick={() => runSimulation('quantity_velocity')} disabled={loading}>
                <div className="flex items-center gap-2"><Activity size={18} className="text-red"/> Quantity + Velocity</div>
                <span>Attempts 3 laptops rapidly</span>
              </button>
              <button className="card button sim-btn" onClick={() => runSimulation('replay')} disabled={loading}>
                <div className="flex items-center gap-2"><Database size={18} className="text-red"/> Replay Attack</div>
                <span>Duplicate idempotency key</span>
              </button>
              <button className="card button sim-btn" onClick={() => runSimulation('llm_manipulation')} disabled={loading}>
                <div className="flex items-center gap-2"><TerminalSquare size={18} className="text-red"/> Prompt Injection</div>
                <span>Malicious instruction to ignore limits</span>
              </button>
            </div>

            {loading && <div className="text-secondary">Running through AgentPay Guard pipeline...</div>}

            {simResult && <InvestigationView result={simResult.data} scenario={simResult.scenario} />}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="header">
              <h1>ML Analytics & Ablation</h1>
              <p>True held-out evaluation on 24k synthetic events.</p>
            </div>
            {metrics && (
              <div className="card">
                <div className="data-row">
                  <div className="data-label">Model</div>
                  <div className="data-label">F1 Score</div>
                  <div className="data-label">Precision</div>
                  <div className="data-label">Recall</div>
                </div>
                <div className="data-row">
                  <div className="data-value">Naive Baseline</div>
                  <div className="data-value">{(metrics.results.naive_threshold_baseline.f1 * 100).toFixed(1)}%</div>
                  <div className="data-value">{(metrics.results.naive_threshold_baseline.precision * 100).toFixed(1)}%</div>
                  <div className="data-value">{(metrics.results.naive_threshold_baseline.recall * 100).toFixed(1)}%</div>
                </div>
                <div className="data-row">
                  <div className="data-value">Full Model (Random Forest)</div>
                  <div className="data-value text-green">{(metrics.results.random_forest.f1 * 100).toFixed(1)}%</div>
                  <div className="data-value">{(metrics.results.random_forest.precision * 100).toFixed(1)}%</div>
                  <div className="data-value">{(metrics.results.random_forest.recall * 100).toFixed(1)}%</div>
                </div>
                <div className="data-row">
                  <div className="data-value">w/o Behavioral Features</div>
                  <div className="data-value text-red">{(metrics.results.ablation_no_behavioral.f1 * 100).toFixed(1)}%</div>
                  <div className="data-value">{(metrics.results.ablation_no_behavioral.precision * 100).toFixed(1)}%</div>
                  <div className="data-value">{(metrics.results.ablation_no_behavioral.recall * 100).toFixed(1)}%</div>
                </div>
                <div className="data-row">
                  <div className="data-value">w/o Merchant Features</div>
                  <div className="data-value text-red">{(metrics.results.ablation_no_merchant.f1 * 100).toFixed(1)}%</div>
                  <div className="data-value">{(metrics.results.ablation_no_merchant.precision * 100).toFixed(1)}%</div>
                  <div className="data-value">{(metrics.results.ablation_no_merchant.recall * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InvestigationView({ result, scenario }) {
  if (!result || !result.audit) return null;
  const decision = result.outcome;
  const isBlock = decision === 'BLOCK';
  
  const req = result.audit.request;
  const violations = result.audit.policy_violations;
  const mlResult = result.audit.ml_result;
  
  return (
    <div className="investigation-view">
      <div className="header" style={{marginBottom: '1rem'}}>
        <h2>TRANSACTION #{req.request_id.split('_')[1].toUpperCase()}</h2>
        {scenario === 'llm_manipulation' && <div className="text-red" style={{marginTop: '0.5rem'}}>⚠ LLM/PROMPT INJECTION DETECTED</div>}
      </div>

      <div className="flow-step">
        <div className="flow-indicator">
          <div className="step-dot active-blue"></div>
          <div className="step-line"></div>
        </div>
        <div className="flow-content">
          <div className="flow-card">
            <div className="flow-header">User Intent</div>
            <div className="code-block">"Buy a laptop under ₹70,000"</div>
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
            <div className="flow-header">Structured Capability (Extracted via Ollama qwen3:4b)</div>
            <div className="data-row"><span className="data-label">Max Amount</span><span className="data-value">₹70,000</span></div>
            <div className="data-row"><span className="data-label">Max Quantity</span><span className="data-value">1</span></div>
            <div className="data-row"><span className="data-label">Allowed Categories</span><span className="data-value">Electronics</span></div>
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
            <div className="flow-header">Agent Action Attempt</div>
            <div className="data-row"><span className="data-label">Requested Amount</span><span className={`data-value ${req.amount > 70000 ? 'text-red' : ''}`}>₹{req.amount.toLocaleString()}</span></div>
            <div className="data-row"><span className="data-label">Requested Quantity</span><span className={`data-value ${req.quantity > 1 ? 'text-red' : ''}`}>{req.quantity}</span></div>
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
              <span>Deterministic Policy</span>
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
              <span>ML Risk & Behavior</span>
              <span className={mlResult.risk_score > 0.5 ? 'badge badge-red' : 'badge badge-green'}>
                {mlResult.risk_score > 0.5 ? 'HIGH RISK' : 'LOW RISK'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Supervised Risk Score</span>
              <span className={`data-value ${mlResult.risk_score > 0.5 ? 'text-red' : 'text-green'}`}>{mlResult.risk_score.toFixed(2)}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Behavioral Anomaly</span>
              <span className={`data-value ${mlResult.anomaly_detected ? 'text-red' : 'text-green'}`}>
                {mlResult.anomaly_detected ? '⚠ ANOMALOUS' : '✓ NORMAL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flow-step" style={{marginTop: '1rem'}}>
        <div className="flow-content" style={{width: '100%', padding: 0}}>
          <div className={`decision-block ${isBlock ? 'block' : 'allow'}`}>
            <div className="flow-header" style={{color: 'inherit'}}>Final Decision</div>
            <h2>{isBlock ? 'BLOCKED' : 'ALLOW'}</h2>
            <div style={{marginTop: '1rem', opacity: 0.8}}>{result.reason}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
