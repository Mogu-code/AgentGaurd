import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function Analytics({ metrics }) {
  if (!metrics) return <div className="p-8 text-center text-muted">Loading metrics...</div>;

  const results = metrics.results;
  
  // Format data for Recharts ablation study
  const ablationData = [
    {
      name: 'Full Model',
      F1: Number((results[metrics.selected_model].f1 * 100).toFixed(1)),
      Precision: Number((results[metrics.selected_model].precision * 100).toFixed(1)),
      Recall: Number((results[metrics.selected_model].recall * 100).toFixed(1))
    },
    {
      name: 'w/o Behavioral',
      F1: Number((results.ablation_no_behavioral.f1 * 100).toFixed(1)),
      Precision: Number((results.ablation_no_behavioral.precision * 100).toFixed(1)),
      Recall: Number((results.ablation_no_behavioral.recall * 100).toFixed(1))
    },
    {
      name: 'w/o Merchant',
      F1: Number((results.ablation_no_merchant.f1 * 100).toFixed(1)),
      Precision: Number((results.ablation_no_merchant.precision * 100).toFixed(1)),
      Recall: Number((results.ablation_no_merchant.recall * 100).toFixed(1))
    },
    {
      name: 'Naive Baseline',
      F1: Number((results.naive_threshold_baseline.f1 * 100).toFixed(1)),
      Precision: Number((results.naive_threshold_baseline.precision * 100).toFixed(1)),
      Recall: Number((results.naive_threshold_baseline.recall * 100).toFixed(1))
    }
  ];

  return (
    <div>
      <div className="header">
        <h1>ML Risk Analytics</h1>
        <p>Evaluation metrics on held-out dataset (24k synthetic events).</p>
      </div>

      <div className="card mb-8">
        <h3 className="mb-6 text-muted">PRIMARY ML RISK MODEL ({metrics.selected_model.toUpperCase().replace('_', ' ')})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-surface rounded border border-subtle">
            <div className="text-xs text-secondary uppercase mb-1">F1 Score</div>
            <div className="text-2xl font-bold text-blue">{(results[metrics.selected_model].f1 * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center p-4 bg-surface rounded border border-subtle">
            <div className="text-xs text-secondary uppercase mb-1">Precision</div>
            <div className="text-2xl font-bold text-green">{(results[metrics.selected_model].precision * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center p-4 bg-surface rounded border border-subtle">
            <div className="text-xs text-secondary uppercase mb-1">Recall</div>
            <div className="text-2xl font-bold">{(results[metrics.selected_model].recall * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center p-4 bg-surface rounded border border-subtle">
            <div className="text-xs text-secondary uppercase mb-1">ROC-AUC</div>
            <div className="text-2xl font-bold font-mono">
              {results[metrics.selected_model].roc_auc ? results[metrics.selected_model].roc_auc.toFixed(3) : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2 text-muted">ABLATION STUDY</h3>
        <p className="text-sm text-secondary mb-6">Behavioral features materially improve detection accuracy compared to naive limits.</p>
        
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <BarChart
              data={ablationData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
              <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="F1" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Precision" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Recall" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
