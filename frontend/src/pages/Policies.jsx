export function Policies({ policies }) {
  return (
    <div>
      <div className="header">
        <h1>Active Policies</h1>
        <p>Deterministic boundary controls fetched from backend memory.</p>
      </div>
      
      {policies.length === 0 ? (
        <div className="card text-center py-8 text-secondary">No active policies found.</div>
      ) : (
        policies.map((policy, idx) => (
          <div key={idx} className="card mb-6">
            <div className="border-b border-subtle pb-3 mb-4">
              <h3 className="text-lg font-mono text-blue">{policy.capability_id}</h3>
              <div className="text-xs text-secondary mt-1">Agent: <span className="font-mono">{policy.agent_id}</span> | User: <span className="font-mono">{policy.user_id}</span></div>
            </div>
            
            <PolicyRow label="Maximum transaction amount" value={policy.max_amount !== undefined ? `₹${policy.max_amount.toLocaleString()}` : null} />
            <PolicyRow label="Maximum quantity" value={policy.max_quantity} />
            <PolicyRow label="Allowed categories" value={policy.allowed_categories ? policy.allowed_categories.join(', ') : null} />
            <PolicyRow label="Blocked merchants" value={policy.blocked_merchants ? (policy.blocked_merchants.length ? policy.blocked_merchants.join(', ') : 'None') : null} />
            <PolicyRow label="Authorized merchant" value={policy.authorized_merchant ? policy.authorized_merchant : 'None'} />
            <PolicyRow label="Velocity/Risk threshold" value={policy.approval_threshold ? `₹${policy.approval_threshold}` : null} />
            <PolicyRow label="Geofencing" value={null} />
          </div>
        ))
      )}
    </div>
  );
}

function PolicyRow({ label, value }) {
  const isImplemented = value !== null && value !== undefined;
  return (
    <div className="data-row">
      <span className="data-label">{label}</span>
      {isImplemented ? (
        <span className="data-value">{value}</span>
      ) : (
        <span className="badge badge-gray text-xs">NOT IMPLEMENTED</span>
      )}
    </div>
  );
}
