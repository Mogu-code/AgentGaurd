import { CheckCircle, XCircle, AlertTriangle, Lock } from 'lucide-react';

export function InvestigationTimeline({ result, scenario }) {
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
      <div className="header" style={{marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem'}}>
        <h2 style={{fontSize: '1.5rem', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)'}}>
          TRANSACTION #{req.request_id?.split('_')[1]?.toUpperCase() || 'ID'}
        </h2>
        {scenario === 'llm_manipulation' && <div className="text-red font-bold mt-2 flex items-center gap-2"><AlertTriangle size={18}/> ⚠ PROMPT INJECTION ATTEMPT DETECTED</div>}
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
              <span className={`badge ${ext.success ? 'badge-green' : 'badge-amber'}`}>{ext.success ? 'VALIDATED' : 'FALLBACK'}</span>
            </div>
            <div className="data-row"><span className="data-label">Provider / Model</span><span className="data-value">{ext.provider || 'ollama'} / {ext.model || 'qwen2.5:1.5b'}</span></div>
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
            {ext.capability?.authorized_merchant && (
              <div className="data-row"><span className="data-label">Authorized Merchant</span><span className="data-value text-green">{ext.capability.authorized_merchant}</span></div>
            )}
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
            <div className="data-row"><span className="data-label">Requested Amount</span><span className={`data-value ${req.amount > (ext.capability?.max_amount||70000) ? 'text-red font-bold' : ''}`}>₹{req.amount?.toLocaleString()}</span></div>
            <div className="data-row"><span className="data-label">Requested Quantity</span><span className={`data-value ${req.quantity > (ext.capability?.max_quantity||1) ? 'text-red font-bold' : ''}`}>{req.quantity}</span></div>
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
              <span>06 ML Risk Engine</span>
              <span className={mlResult.risk_score > 0.5 ? 'badge badge-red' : 'badge badge-green'}>
                {mlResult.risk_score > 0.5 ? 'HIGH RISK' : 'LOW RISK'}
              </span>
            </div>
            <div className="data-row">
              <span className="data-label">Risk Score</span>
              <span className={`data-value ${mlResult.risk_score > 0.5 ? 'text-red font-bold' : 'text-green'}`}>{mlResult.risk_score?.toFixed(2) || '0.00'}</span>
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
            <div className="flow-header" style={{color: 'inherit', justifyContent: 'center'}}>07 Final Decision Engine</div>
            <h2>{isBlock ? 'BLOCKED' : 'ALLOW'}</h2>
          </div>
          
          <div className={`explanation-panel ${isBlock ? 'block' : 'allow'}`}>
            <h3 className="font-bold mb-4">WHY WAS THIS {isBlock ? 'BLOCKED' : 'ALLOWED'}?</h3>
            <ul className="explanation-list">
              {violations.length > 0 ? (
                violations.map((v, i) => (
                  <li key={i}><XCircle size={16} className="text-red" style={{flexShrink: 0, marginTop: '2px'}}/> <span>{v.message}</span></li>
                ))
              ) : (
                <li><CheckCircle size={16} className="text-green" style={{flexShrink: 0, marginTop: '2px'}}/> <span>Intent validated and capability limits respected.</span></li>
              )}
              {mlResult.risk_score > 0.5 && (
                <li><AlertTriangle size={16} className="text-red" style={{flexShrink: 0, marginTop: '2px'}}/> <span>ML Risk Score ({mlResult.risk_score?.toFixed(2)}) exceeded acceptable threshold. Behavioral anomaly detected.</span></li>
              )}
              {isBlock && (
                <li><Lock size={16} className="text-muted" style={{flexShrink: 0, marginTop: '2px'}}/> <span>Payment execution halted. Razorpay API was NOT called.</span></li>
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
              <span className={`badge ${isBlock ? 'badge-gray' : 'badge-blue'}`}>{isBlock ? 'SKIPPED' : 'EXECUTED'}</span>
            </div>
            {isBlock ? (
              <div className="text-secondary" style={{fontSize: '0.875rem'}}>No API call was made because authorization failed at the Execution Gate.</div>
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
