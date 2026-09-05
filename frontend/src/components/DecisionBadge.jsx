export function DecisionBadge({ decision }) {
  if (!decision) return <span className="badge badge-gray">-</span>;
  const isAllow = decision === 'ALLOW';
  return (
    <span className={`badge ${isAllow ? 'badge-green' : 'badge-red'}`}>
      {decision}
    </span>
  );
}
