import { useState } from 'react';
import { CheckCircle, AlertTriangle, Activity, TerminalSquare, Database } from 'lucide-react';
import { runSimulation } from '../api/client';
import { InvestigationTimeline } from '../components/InvestigationTimeline';

export function Simulator() {
  const [loading, setLoading] = useState(false);
  const [simStatus, setSimStatus] = useState('');
  const [simResult, setSimResult] = useState(null);

  const executeScenario = async (scenario) => {
    setLoading(true);
    setSimResult(null);
    setSimStatus(`Initializing synthetic scenario: ${scenario}...`);
    try {
      setTimeout(() => setSimStatus("LLM intent extraction..."), 500);
      setTimeout(() => setSimStatus("Deterministic policy evaluation..."), 1200);
      setTimeout(() => setSimStatus("ML behavioral risk assessment..."), 1800);
      
      const data = await runSimulation(scenario);
      
      if (data.outcome === 'ALLOW') {
        setTimeout(() => setSimStatus("Routing to Razorpay test API..."), 2400);
      }
      
      setTimeout(() => {
        setSimResult({ scenario, data });
        setLoading(false);
        setSimStatus('');
      }, data.outcome === 'ALLOW' ? 3000 : 2000);
      
    } catch (e) {
      console.error(e);
      setLoading(false);
      setSimStatus('Simulation failed to connect to backend.');
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Attack Simulator</h1>
        <p>Run synthetic scenarios through the live security pipeline. Evaluated by real backend.</p>
      </div>
      
      {!simResult ? (
        <div className="simulation-actions">
          <SimButton 
            scenario="legitimate" title="Legitimate Purchase" icon={<CheckCircle className="text-green"/>} 
            desc="Agent purchases authorized laptop within constraints." expect="ALLOW via Full Pipeline" action={executeScenario} disabled={loading}
          />
          <SimButton 
            scenario="amount_manipulation" title="Amount Manipulation" icon={<AlertTriangle className="text-red"/>} 
            desc="Agent attempts to exceed the user's authorized spending limit (₹1.85L)." expect="BLOCK via Policy" action={executeScenario} disabled={loading}
          />
          <SimButton 
            scenario="quantity_velocity" title="Quantity / Velocity Burst" icon={<Activity className="text-amber"/>} 
            desc="Agent rapidly attempts to purchase 3 laptops. Passes policy, fails behavior." expect="BLOCK via ML Risk" action={executeScenario} disabled={loading}
          />
          <SimButton 
            scenario="merchant_substitution" title="Merchant Substitution" icon={<AlertTriangle className="text-red"/>} 
            desc="Agent attempts purchase at unauthorized 'ShadyTechStore'." expect="BLOCK via Policy" action={executeScenario} disabled={loading}
          />
          <SimButton 
            scenario="llm_manipulation" title="Prompt Injection" icon={<TerminalSquare className="text-red"/>} 
            desc="Malicious instruction tells Agent to ignore previous limits." expect="BLOCK via Extraction" action={executeScenario} disabled={loading}
          />
          <SimButton 
            scenario="replay" title="Replay Attack" icon={<Database className="text-red"/>} 
            desc="Attempt to submit the exact same transaction ID twice." expect="BLOCK via Idempotency" action={executeScenario} disabled={loading}
          />
        </div>
      ) : (
        <div className="mb-6">
          <button className="button mb-4" onClick={() => setSimResult(null)}>← BACK TO SCENARIOS</button>
        </div>
      )}

      {loading && (
        <div className="card flex flex-col items-center justify-center gap-4 py-12 mb-8">
          <div className="loader" style={{width: '32px', height: '32px', border: '3px solid var(--border-strong)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
          <div className="text-secondary font-mono text-sm">{simStatus}</div>
        </div>
      )}

      {simResult && <InvestigationTimeline result={simResult.data} scenario={simResult.scenario} />}
    </div>
  );
}

function SimButton({ scenario, title, icon, desc, expect, action, disabled }) {
  return (
    <button className="sim-btn group" onClick={() => action(scenario)} disabled={disabled}>
      <div className="sim-title">{icon} {title}</div>
      <div className="sim-desc">{desc}</div>
      <div className="mt-4 flex justify-between items-end w-full">
        <div>
          <div className="text-xs text-muted mb-1 font-mono uppercase">Expected Outcome</div>
          <div className="sim-prop">{expect}</div>
        </div>
        <div className="text-blue text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
          EXECUTE →
        </div>
      </div>
    </button>
  );
}
