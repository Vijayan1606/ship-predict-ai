import React, { useEffect, useState } from 'react';
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Target,
  ArrowUpRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { fetchOverviewMetrics } from '../services/api';
import type { OverviewMetrics } from '../types';

interface OverviewPageProps {
  onNavigateToMonitoring: () => void;
  onSelectShipment: (id: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateToMonitoring }) => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOverviewMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading logistics analytics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-500/40 text-red-200 text-sm">
          {error || 'Unable to load metrics'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Logistics Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time monitoring of container fleet schedules, delay propagation, and ETA variance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button 
            onClick={onNavigateToMonitoring}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600 text-white hover:bg-cyan-500 transition shadow-sm shadow-cyan-500/20"
          >
            Monitor Fleet
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Shipments */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Active</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.total_shipments}</div>
          <div className="text-[11px] text-slate-400 mt-1">Global maritime voyages</div>
        </div>

        {/* On-Time Shipments */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">On-Time Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{metrics.on_time_percentage}%</div>
          <div className="text-[11px] text-slate-400 mt-1">{metrics.on_time_shipments} of {metrics.total_shipments} shipments</div>
        </div>

        {/* Delayed Shipments */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Delayed</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{metrics.delayed_shipments}</div>
          <div className="text-[11px] text-slate-400 mt-1">Experiencing schedule slip</div>
        </div>

        {/* Average Delay */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Delay</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {metrics.average_predicted_delay_hours}h
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Weighted voyage mean</div>
        </div>

        {/* Severe Delays (>24h) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Severe (&gt;24h)</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{metrics.severe_delay_count}</div>
          <div className="text-[11px] text-slate-400 mt-1">Urgent intervention required</div>
        </div>

        {/* Model Prediction Error (MAE) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Model MAE</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.average_prediction_mae_hours}h</div>
          <div className="text-[11px] text-emerald-400 mt-1">Validated test error</div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution Donut */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Delay Severity Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Thresholds: Minor (0-6h), Moderate (6-24h), Severe (&gt;24h)</p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.severity_distribution}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {metrics.severity_distribution.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-3">
            {metrics.severity_distribution.map((item) => (
              <div key={item.severity} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300">{item.severity}:</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Route Corridor Performance */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Top Shipping Corridors: Volume & Average Delay</h3>
            <p className="text-xs text-slate-400 mt-0.5">Average delay in hours per major bilateral maritime lane</p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.route_performance} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="corridor" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                  angle={-15} 
                  textAnchor="end" 
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any, name: any) => [
                    name === 'avg_delay_hours' ? `${val} hours` : val,
                    name === 'avg_delay_hours' ? 'Average Delay' : 'Voyages'
                  ]}
                />
                <Bar dataKey="avg_delay_hours" fill="#38bdf8" radius={[4, 4, 0, 0]} name="avg_delay_hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>Data calibrated with UNCTAD and World Bank CPPI indices</span>
            <span className="text-cyan-400 font-medium cursor-pointer" onClick={onNavigateToMonitoring}>View all corridors &rarr;</span>
          </div>
        </div>
      </div>

      {/* Stage Bottleneck Analysis Bar Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Current Journey Stage Distribution</h3>
            <p className="text-xs text-slate-400">Active shipment volume distributed across the 7 transport stages</p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700">
            Lifecycle Snapshot
          </span>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.stage_distribution} margin={{ top: 10, right: 10, left: -15, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: any) => [`${val} shipments`, 'Volume']}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
