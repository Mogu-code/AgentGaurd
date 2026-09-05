import { DecisionBadge } from '../components/DecisionBadge';

export function Transactions({ transactions, openInvestigation }) {
  return (
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
              <th>Request ID</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Decision</th>
              <th>Razorpay Test API</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan="6" className="text-center text-muted py-8">No transactions yet. Run the Simulator.</td></tr>
            ) : (
              transactions.map((tx, i) => (
                <tr key={i} className="clickable-row" onClick={() => openInvestigation(tx)}>
                  <td className="text-sm">{new Date(tx.timestamp).toLocaleTimeString()}</td>
                  <td className="font-mono text-secondary text-sm">{tx.request_id?.split('_')[1] || 'N/A'}</td>
                  <td className="font-medium">{tx.merchant || 'Unknown'}</td>
                  <td className="font-mono">₹{(tx.amount || 0).toLocaleString()}</td>
                  <td><DecisionBadge decision={tx.decision} /></td>
                  <td>
                    <span className={`text-xs ${tx.decision === 'ALLOW' ? 'text-blue' : 'text-muted'}`}>
                      {tx.decision === 'ALLOW' ? 'EXECUTED' : 'SKIPPED'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
