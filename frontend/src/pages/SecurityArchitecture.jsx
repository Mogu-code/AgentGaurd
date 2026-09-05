import { Lock, Shield, Brain, CreditCard, ArrowDown, Database } from 'lucide-react';

export function SecurityArchitecture() {
  return (
    <div>
      <div className="header text-center border-none mb-8">
        <h1>Security Architecture</h1>
        <p className="text-red font-bold tracking-widest uppercase mt-2 border border-red-500/30 bg-red-500/10 inline-block px-4 py-2 rounded">
          THE LLM NEVER HAS PAYMENT AUTHORITY
        </p>
      </div>
      
      <div className="flex flex-col items-center max-w-2xl mx-auto pb-12">
        
        {/* Untrusted */}
        <div className="arch-box w-full border-dashed border-muted">
          <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Untrusted Intent</div>
          <h3 className="flex items-center justify-center gap-2 text-lg"><Brain className="text-blue"/> Generative LLM</h3>
          <p className="text-secondary text-sm mt-2">Interprets natural language into structured capability requests.</p>
        </div>
        
        <ArrowDown className="arch-arrow" />
        
        {/* Validated Capability */}
        <div className="arch-box w-full border-blue-500/30 bg-blue-500/5">
          <div className="text-xs font-bold text-blue uppercase tracking-wider mb-2">Validated Request</div>
          <h3 className="text-lg">Structured Capability JSON</h3>
        </div>
        
        <ArrowDown className="arch-arrow" />
        
        {/* Policy */}
        <div className="arch-box w-full border-amber-500/30">
          <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Deterministic Trust Boundary</div>
          <h3 className="flex items-center justify-center gap-2 text-lg"><Shield className="text-amber-500"/> Policy Engine</h3>
          <p className="text-secondary text-sm mt-2">Enforces hard constraints (Amount, Qty, Merchant, Replay).</p>
        </div>
        
        <ArrowDown className="arch-arrow" />
        
        {/* ML */}
        <div className="arch-box w-full border-amber-500/30">
          <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Behavioral Trust Signal</div>
          <h3 className="flex items-center justify-center gap-2 text-lg"><ActivityIcon className="text-amber-500"/> ML Risk Engine</h3>
          <p className="text-secondary text-sm mt-2">Evaluates velocity and behavioral anomalies using Isolation Forests.</p>
        </div>
        
        <ArrowDown className="arch-arrow" />
        
        {/* Decision Gate */}
        <div className="arch-box w-full border-green-500/50 bg-green-500/10">
          <div className="text-xs font-bold text-green uppercase tracking-wider mb-2">Execution Gate</div>
          <h3 className="flex items-center justify-center gap-2 text-lg"><Lock className="text-green"/> Decision Engine</h3>
          <p className="text-secondary text-sm mt-2">Only ALLOWs if Deterministic Policy passes AND ML Risk is low.</p>
        </div>
        
        <ArrowDown className="arch-arrow" />
        
        {/* Payment */}
        <div className="arch-box w-full border-blue-500/30">
          <div className="text-xs font-bold text-blue uppercase tracking-wider mb-2">Payment Rail</div>
          <h3 className="flex items-center justify-center gap-2 text-lg"><CreditCard className="text-blue"/> Razorpay Test API</h3>
        </div>
        
        <ArrowDown className="arch-arrow" />
        
        {/* Audit */}
        <div className="arch-box w-full border-muted">
          <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Evidence</div>
          <h3 className="flex items-center justify-center gap-2 text-lg"><Database className="text-muted"/> Hash-Chained Audit</h3>
        </div>

      </div>
    </div>
  );
}

function ActivityIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );
}
