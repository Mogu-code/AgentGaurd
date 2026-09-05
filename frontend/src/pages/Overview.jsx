import { MetricCard } from '../components/MetricCard';
import { Shield, Brain, CreditCard } from 'lucide-react';

export function Overview({ health, metrics, transactions }) {
  const blockedTx = transactions.filter(t => t.decision === 'BLOCK').length;
  const allowedTx = transactions.filter(t => t.decision === 'ALLOW').length;
  
  return (
    <div>
      <div className="header flex justify-between items-start mb-6">
        <div>
          <h1 className="mb-2">AgentPay Guard</h1>
          <p className="text-secondary font-mono text-sm tracking-wide">AI PAYMENT SECURITY CONTROL PLANE</p>
        </div>
        <div className="flex gap-2">
          <span className={`badge ${health.backend ? 'badge-green' : 'badge-red'}`}>
            <Shield size={12} className="mr-1"/> API: {health.backend ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className={`badge ${health.ollama ? 'badge-blue' : 'badge-red'}`}>
            <Brain size={12} className="mr-1"/> OLLAMA: {health.ollama ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className={`badge ${health.razorpayMode === 'test' && health.razorpayReachable ? 'badge-blue' : 'badge-amber'}`}>
            <CreditCard size={12} className="mr-1"/> RZP: {health.razorpayMode.toUpperCase()}
          </span>
        </div>
      </div>
      
      <h3 className="mb-4 text-muted">SECURITY ACTIVITY SUMMARY</h3>
      <div className="dashboard-grid">
        <MetricCard title="Total Evaluated" value={transactions.length} />
        <MetricCard title="Attacks Blocked" value={blockedTx} colorClass="text-red" />
        <MetricCard title="Actions Allowed" value={allowedTx} colorClass="text-green" />
        <MetricCard title="Protected Value" value={`₹${metrics?.results?.random_forest?.financial?.value_correctly_blocked_inr?.toLocaleString() || '0'}`} />
      </div>

      <h3 className="mb-4 text-muted mt-6">INTEGRATION HEALTH</h3>
      <div className="card" style={{padding: 0, overflow: 'hidden'}}>
        <table className="data-table">
          <tbody>
            <tr>
              <td><span className="font-semibold">Ollama Local LLM</span></td>
              <td><span className="text-secondary">Model:</span> <span className="font-mono">{health.ollamaModel}</span></td>
              <td><span className={`badge ${health.ollama ? 'badge-green' : 'badge-red'}`}>{health.ollama ? 'ONLINE' : 'OFFLINE'}</span></td>
            </tr>
            <tr>
              <td><span className="font-semibold">Razorpay API</span></td>
              <td>
                <span className="text-secondary">Mode:</span> {health.razorpayMode.toUpperCase()}
                {health.razorpayMode === 'mock' && <span className="text-amber text-xs ml-2 border border-amber-500 px-1 rounded">NO API CALL</span>}
              </td>
              <td><span className={`badge ${health.razorpayReachable ? 'badge-green' : 'badge-amber'}`}>{health.razorpayReachable ? 'CONNECTED' : 'UNREACHABLE'}</span></td>
            </tr>
            <tr>
              <td><span className="font-semibold">ML Risk Engine</span></td>
              <td><span className="text-secondary">Models:</span> Logistic Regression, Isolation Forest</td>
              <td><span className="badge badge-green">LOADED</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
