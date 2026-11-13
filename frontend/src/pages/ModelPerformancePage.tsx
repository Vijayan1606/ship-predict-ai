import React, { useEffect, useState } from 'react';
import { 
  Cpu, 
  BarChart2, 
  CheckCircle2, 
  Target, 
  Layers, 
  Info, 
  Calendar,
  RefreshCw,
  GitCompare,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { fetchModelMetrics, fetchFeatureImportance } from '../services/api';
import type { ModelMetricsSummary, FeatureImportance } from '../types';

export const ModelPerformancePage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetricsSummary | null>(null);
  const [importances, setImportances] = useState<FeatureImportance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [m, imp] = await Promise.all([
          fetchModelMetrics(),
          fetchFeatureImportance()
        ]);
        setMetrics(m);
        setImportances(imp.slice(0, 10)); // Top 10 features
      } catch (err) {
        console.error('Failed to load model metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading ML evaluation benchmarks & feature importances...</p>
      </div>
    );
  }

  const modelComparison = Object.entries(metrics.regression_metrics).map(([name, vals]) => ({
    name,
    mae: vals.mae,
    rmse: vals.rmse,
    r2: vals.r2,
    medae: vals.median_absolute_error,
    isBest: name === metrics.best_model_name
  }));

  const perClass = metrics.classification_metrics.per_class_metrics;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            Machine Learning Performance & Model Benchmarks
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Empirical evaluation, multi-model regression comparison, classification confusion matrix, and feature importances.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          <span>Model Version: <strong className="text-cyan-400">{metrics.model_version}</strong></span>
          <span className="text-slate-600">&bull;</span>
          <span>Split: <strong className="text-slate-200">Chronological (80/20)</strong></span>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-cyan-400" />
              Candidate Regressor Evaluation on Out-of-Time Test Set
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Trained on {metrics.train_samples} shipments (Jan-Sep 2024), evaluated on {metrics.test_samples} unseen chronologically held-out shipments (Oct-Nov 2024).
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-medium">
            Production Best: {metrics.best_model_name}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Model Architecture</th>
                <th className="py-3 px-4">MAE (Hours) &darr;</th>
                <th className="py-3 px-4">RMSE (Hours) &darr;</th>
                <th className="py-3 px-4">R&sup2; Score &uarr;</th>
                <th className="py-3 px-4">Median AE (Hours)</th>
                <th className="py-3 px-4 text-right">Selection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {modelComparison.map((m) => (
                <tr 
                  key={m.name} 
                  className={m.isBest ? 'bg-cyan-950/20 border-l-2 border-cyan-400' : 'hover:bg-slate-800/30'}
                >
                  <td className="py-3 px-4 font-medium text-slate-200 flex items-center gap-2">
                    {m.name}
                    {m.isBest && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Selected
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{m.mae.toFixed(3)}h</td>
                  <td className="py-3 px-4 text-slate-300">{m.rmse.toFixed(3)}h</td>
                  <td className="py-3 px-4 text-slate-300">{m.r2.toFixed(4)}</td>
                  <td className="py-3 px-4 text-slate-300">{m.medae.toFixed(3)}h</td>
                  <td className="py-3 px-4 text-right">
                    {m.isBest ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Production Serving
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Benchmarked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Feature Importance Bar Chart & Delay Classification Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Global Normalized Feature Importances (Top 10)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Relative sensitivity weights computed from selected Random Forest Regressor</p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={importances}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 95, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis 
                  type="category" 
                  dataKey="feature" 
                  tick={{ fill: '#94a3b8', fontSize: 10 }} 
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, 'Weight']}
                />
                <Bar dataKey="importance" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            Port congestion, weather severity, and stage delay interactions dominate prediction sensitivity.
          </div>
        </div>

        {/* Classification Performance & Confusion Matrix */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Delay Severity Classification Metrics
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Acc: <strong className="text-emerald-400">{(metrics.classification_metrics.accuracy * 100).toFixed(1)}%</strong></span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400">Macro F1: <strong className="text-cyan-400">{(metrics.classification_metrics.macro_f1 * 100).toFixed(1)}%</strong></span>
                {metrics.classification_metrics.weighted_f1 && (
                  <>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-slate-400">Weighted F1: <strong className="text-indigo-400">{(metrics.classification_metrics.weighted_f1 * 100).toFixed(1)}%</strong></span>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Calibrated Random Forest Classifier evaluating 4 operational severity tiers</p>
          </div>

          {/* Per-Class Evaluation Breakdown Table */}
          {perClass && (
            <div className="overflow-x-auto">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Per-Class Performance Metrics
              </span>
              <table className="w-full text-left text-xs border border-slate-800">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-2 border border-slate-800">Severity Tier</th>
                    <th className="p-2 border border-slate-800 text-right">Precision</th>
                    <th className="p-2 border border-slate-800 text-right">Recall</th>
                    <th className="p-2 border border-slate-800 text-right">F1-Score</th>
                    <th className="p-2 border border-slate-800 text-right">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {Object.entries(perClass).map(([label, vals]) => (
                    <tr key={label} className="hover:bg-slate-800/30">
                      <td className="p-2 font-medium text-slate-200 border-r border-slate-800">
                        {label}
                      </td>
                      <td className="p-2 text-right text-slate-300 font-mono">
                        {(vals.precision * 100).toFixed(1)}%
                      </td>
                      <td className="p-2 text-right text-slate-300 font-mono">
                        {(vals.recall * 100).toFixed(1)}%
                      </td>
                      <td className="p-2 text-right font-bold text-cyan-400 font-mono">
                        {(vals.f1_score * 100).toFixed(1)}%
                      </td>
                      <td className="p-2 text-right text-slate-400 font-mono">
                        {vals.support}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Confusion Matrix Table */}
          <div className="overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Confusion Matrix (Actual Rows &times; Predicted Columns)
            </span>
            <table className="w-full text-center text-xs border border-slate-800">
              <thead className="bg-slate-950 text-slate-400 text-[10px]">
                <tr>
                  <th className="p-1.5 border border-slate-800 text-left">Actual \ Pred</th>
                  {metrics.classification_metrics.labels.map((l) => (
                    <th key={l} className="p-1.5 border border-slate-800">{l.replace(' Delay', '')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.classification_metrics.labels.map((actualLabel, rowIdx) => (
                  <tr key={actualLabel} className="border-b border-slate-800">
                    <td className="p-1.5 font-medium text-slate-300 text-left bg-slate-950/40 border-r border-slate-800 text-[11px]">
                      {actualLabel}
                    </td>
                    {metrics.classification_metrics.confusion_matrix[rowIdx]?.map((val, colIdx) => {
                      const isDiagonal = rowIdx === colIdx;
                      return (
                        <td 
                          key={colIdx} 
                          className={`p-1.5 border border-slate-800 font-semibold font-mono text-xs ${
                            isDiagonal ? 'bg-emerald-950/30 text-emerald-400' : (val > 0 ? 'bg-amber-950/20 text-slate-300' : 'text-slate-600')
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>Thresholds: On Time (&le;0h), Minor (0-6h), Moderate (6-24h), Severe (&gt;24h)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
