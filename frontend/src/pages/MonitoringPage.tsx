import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { fetchShipments } from '../services/api';
import type { Shipment } from '../types';

interface MonitoringPageProps {
  onSelectShipment: (shipmentId: string) => void;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({ onSelectShipment }) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('scheduled_departure');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const loadShipments = async () => {
    try {
      setLoading(true);
      const params: any = { 
        limit: 100,
        sort_by: sortBy,
        sort_dir: sortDir
      };
      if (search.trim()) params.search = search.trim();
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (stageFilter !== 'ALL') params.stage = stageFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const data = await fetchShipments(params);
      setShipments(data);
      setLastRefreshed(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC');
    } catch (err) {
      console.error('Failed to load shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [severityFilter, stageFilter, statusFilter, sortBy, sortDir]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadShipments();
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'On Time':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            On Time (&le;0h)
          </span>
        );
      case 'Minor Delay':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-3 h-3" />
            Minor (0-6h)
          </span>
        );
      case 'Moderate Delay':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Moderate (6-24h)
          </span>
        );
      case 'Severe Delay':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-3 h-3" />
            Severe (&gt;24h)
          </span>
        );
      default:
        return <span className="text-slate-400 text-xs">{severity}</span>;
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      }) + ' UTC';
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Data Freshness */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Shipment Monitoring</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-stage voyage telemetry, stage checkpoints, and Estimated Time of Arrival (ETA) predictions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Data Freshness: <strong className="text-slate-200">{lastRefreshed}</strong></span>
            </div>
          )}
          <button
            onClick={loadShipments}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, Port, City..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </form>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Severities</option>
              <option value="On Time">On Time (&le;0h)</option>
              <option value="Minor Delay">Minor Delay (0-6h)</option>
              <option value="Moderate Delay">Moderate Delay (6-24h)</option>
              <option value="Severe Delay">Severe Delay (&gt;24h)</option>
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Stages (1 - 7)</option>
              <option value="Origin Departure">1. Origin Departure</option>
              <option value="Vessel Departure">2. Vessel Departure</option>
              <option value="Intermediate Port Arrival">3. Intermediate Port Arrival</option>
              <option value="Port Processing">4. Port Processing</option>
              <option value="Customs Clearance">5. Customs Clearance</option>
              <option value="Destination Port Departure">6. Destination Port Departure</option>
              <option value="Final Delivery">7. Final Delivery</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shipments Table with Interactive Sorting */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('shipment_id')}>
                  <div className="flex items-center gap-1">
                    Shipment ID
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('route_distance_nm')}>
                  <div className="flex items-center gap-1">
                    Corridor & Distance
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Current Stage</th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('scheduled_eta')}>
                  <div className="flex items-center gap-1">
                    Scheduled ETA
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('predicted_eta')}>
                  <div className="flex items-center gap-1">
                    Predicted ETA
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('final_delay_hours')}>
                  <div className="flex items-center gap-1">
                    Total Delay
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Severity Tier</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-cyan-400" />
                    Fetching verified voyage records...
                  </td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No shipments match the selected criteria.
                  </td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr 
                    key={s.shipment_id}
                    onClick={() => onSelectShipment(s.shipment_id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-semibold text-cyan-400 whitespace-nowrap">
                      {s.shipment_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <span>{s.origin_port}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span>{s.destination_port}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {s.route_distance_nm} nm &bull; {s.vessel_type.split(' ')[0]}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span className="text-slate-200">{s.current_stage}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Stage {s.current_stage_order} of 7
                        {s.has_missing_intermediate_events && (
                          <span className="ml-1 text-amber-400 font-semibold">(telemetry gap)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {formatDateTime(s.scheduled_eta)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                      {formatDateTime(s.predicted_eta)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-bold ${
                        s.final_delay_hours > 24 
                          ? 'text-rose-400' 
                          : s.final_delay_hours > 6 
                          ? 'text-amber-400' 
                          : s.final_delay_hours > 0 
                          ? 'text-cyan-400' 
                          : 'text-emerald-400'
                      }`}>
                        {s.final_delay_hours > 0 ? `+${s.final_delay_hours}h` : `${s.final_delay_hours}h`}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getSeverityBadge(s.delay_severity)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectShipment(s.shipment_id);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
