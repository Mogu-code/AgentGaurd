export function MetricCard({ title, value, colorClass = "" }) {
  return (
    <div className="card stat-card">
      <h3>{title}</h3>
      <div className={`value ${colorClass}`}>{value}</div>
    </div>
  );
}
