import { useState } from 'react';
import { DecisionBadge } from '../components/DecisionBadge';
import { verifyAuditChain } from '../api/client';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

export function Audit({ transactions }) {
  const [verifyStatus, setVerifyStatus] = useState(null); // null | 'loading' | 'verified' | 'failed'

  const handleVerify = async () => {
    setVerifyStatus('loading');
    try {
      const data = await verifyAuditChain();
      setVerifyStatus(data.valid ? 'verified' : 'failed');
    } catch (e) {
      setVerifyStatus('failed');
    }
  };

  return (
    <div>
      <div className="header flex justify-between items-start">
        <div>
          <h1>Audit Log</h1>
          <p>Cryptographic chain-hashed integrity records.</p>
        </div>
        <div className="flex items-center gap-4">
          {verifyStatus === 'loading' && <span className="badge badge-gray flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> VERIFYING CHAIN</span>}
          {verifyStatus === 'verified' && <span className="badge badge-green flex items-center gap-2"><ShieldCheck size={12}/> CHAIN VERIFIED</span>}
          {verifyStatus === 'failed' && <span className="badge badge-red flex items-center gap-2"><ShieldAlert size={12}/> INTEGRITY FAILED</span>}
          <button className="button button-primary" onClick={handleVerify} disabled={verifyStatus === 'loading'}>
            VERIFY CHAIN
          </button>
        </div>
      </div>
      
      <div className="card" style={{padding: 0, overflow: 'hidden'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Transaction ID</th>
              <th>Decision</th>
              <th>Hash</th>
              <th>Prev Hash</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i}>
                <td className="text-sm">{new Date(tx.timestamp).toLocaleString()}</td>
                <td className="font-mono text-xs">{tx.request?.request_id || tx.session_id || 'N/A'}</td>
                <td><DecisionBadge decision={tx.decision?.outcome} /></td>
                <td className="font-mono text-secondary text-xs" title={tx.hash}>{tx.hash?.substring(0, 16)}...</td>
                <td className="font-mono text-secondary text-xs" title={tx.prev_hash}>{tx.prev_hash?.substring(0, 16) || 'GENESIS'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
