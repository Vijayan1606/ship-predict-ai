import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Ship, 
  Anchor, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Flame,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { fetchShipmentById, fetchShipmentTimeline, fetchShipmentExplanation } from '../services/api';
import type { Shipment, StageEvent } from '../types';

interface ShipmentDetailPageProps {
  shipmentId: string;
  onBack: () => void;
}

export const ShipmentDetailPage: React.FC<ShipmentDetailPageProps> = ({ shipmentId, onBack }) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [timeline, setTimeline] = useState<StageEvent[]>([]);
  const [explanation, setExplanation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setLoading(true);
        const [shipData, timeData, expData] = await Promise.all([
          fetchShipmentById(shipmentId),
          fetchShipmentTimeline(shipmentId),
          fetchShipmentExplanation(shipmentId),
        ]);
        setShipment(shipData);
        setTimeline(timeData.timeline);
        setExplanation(expData.explanation);
      } catch (err) {
        console.error('Failed to load shipment details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [shipmentId]);

  if (loading || !shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Clock className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Reconstructing shipment journey & delay propagation...</p>
      </div>
    );
  }

  // Use the verified cumulative_delay_hours directly from each stage event
  const progressionData = timeline.map((event) => ({
    stage: `S${event.stage_order}`,
    full_name: event.stage_name,
    incremental: event.incremental_delay_hours,
    recovered: event.recovered_delay_hours,
    cumulative: event.cumulative_delay_hours,
    status: event.event_status
  }));

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
      {/* Back button and title */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Monitoring
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            ID: <span className="font-semibold text-cyan-400">{shipment.shipment_id}</span>
          </span>
          <span className={`text-xs px-2.5 py-1 rounded font-medium border ${
            shipment.status === 'DELIVERED' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
          }`}>
            {shipment.status}
          </span>
        </div>
      </div>

      {/* Shipment Header Summary Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Origin & Destination */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Voyage Corridor</span>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span>{shipment.origin_port}</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span>{shipment.destination_port}</span>
            </div>
            <div className="text-xs text-slate-400">
              {shipment.origin_port_name} &rarr; {shipment.destination_port_name}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {shipment.route_distance_nm} Nautical Miles &bull; {shipment.transport_mode}
            </div>
          </div>

          {/* Timestamps - Verified Scheduled vs Predicted */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Schedule & Arrival</span>
            <div className="text-xs text-slate-300">
              <span className="text-slate-500">Departure:</span> {formatDateTime(shipment.scheduled_departure)}
            </div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-500">Contract ETA:</span> {formatDateTime(shipment.scheduled_eta)}
            </div>
            <div className="text-xs font-semibold text-white pt-1">
              <span className="text-cyan-400">Predicted ETA:</span> {formatDateTime(shipment.predicted_eta)}
            </div>
          </div>

          {/* Current Delay Breakdown */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Delay Accumulation</span>
            <div className="text-2xl font-bold text-amber-400">
              +{shipment.final_delay_hours} hrs
            </div>
            <div className="text-xs text-slate-400">
              Initial: {shipment.initial_delay_hours > 0 ? `+${shipment.initial_delay_hours}h` : `${shipment.initial_delay_hours}h`} &bull; Recovered: -{shipment.total_recovered_hours}h
            </div>
            <div className="text-[11px] text-slate-500">
              Tier: <span className="font-semibold text-slate-300">{shipment.delay_severity}</span>
            </div>
          </div>

          {/* Vessel and Environmental Status */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Asset & Port Index</span>
            <div className="text-xs text-slate-300 font-medium">{shipment.vessel_type}</div>
            <div className="text-xs text-slate-400">{shipment.cargo_category}</div>
            <div className="text-xs text-slate-400 pt-1 flex items-center gap-3">
              <span>Port Congestion: <strong className="text-slate-200">{shipment.port_congestion_index}x</strong></span>
              <span>Weather Severity: <strong className="text-slate-200">{shipment.weather_severity_index}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Delay Propagation Progression Curve */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Non-Double-Counting Delay Propagation Curve
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Net cumulative delay tracked across journey stages. The curve matches the summary cards and stage duration deltas.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 self-start">
            Total Accumulated Delay: +{shipment.final_delay_hours}h
          </span>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progressionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="delayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="full_name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: any, name: any) => [
                  `${val} hours`,
                  name === 'cumulative' ? 'Cumulative Delay' : name
                ]}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#delayGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7-Stage Detailed Journey Timeline */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-indigo-400" />
          Multi-Stage Transportation Journey Log
        </h3>

        <div className="space-y-3">
          {timeline.map((event) => {
            const isCompleted = event.event_status === 'COMPLETED';
            const isCurrent = event.event_status === 'IN_PROGRESS';
            const isMissing = event.is_missing;

            return (
              <div 
                key={event.event_id}
                className={`p-4 rounded-lg border transition ${
                  isCurrent 
                    ? 'bg-slate-800/80 border-cyan-500/50 shadow-sm shadow-cyan-500/10' 
                    : isCompleted 
                    ? 'bg-slate-950/60 border-slate-800' 
                    : 'bg-slate-950/30 border-slate-850 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg text-xs font-bold ${
                      isCurrent 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' 
                        : isCompleted 
                        ? 'bg-slate-800 text-slate-300' 
                        : 'bg-slate-900 text-slate-500'
                    }`}>
                      Stage {event.stage_order}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{event.stage_name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                            IN PROGRESS
                          </span>
                        )}
                        {isMissing && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            TELEMETRY GAP (IMPUTED)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Location: <span className="text-slate-300">{event.location}</span> &bull; Source: <span className="text-slate-500">{event.data_source}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage Metrics with Cumulative Delay */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-slate-900/60 px-3 py-2 rounded border border-slate-800/60">
                    <div>
                      <span className="text-slate-500 block">Sched Duration</span>
                      <span className="font-medium text-slate-200">{event.scheduled_duration_hours}h</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Actual Duration</span>
                      <span className="font-medium text-white">{event.actual_duration_hours !== null ? `${event.actual_duration_hours}h` : 'In progress'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Incremental Disruption</span>
                      <span className={`font-semibold ${event.incremental_delay_hours > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {event.incremental_delay_hours > 0 ? `+${event.incremental_delay_hours}h` : '0.0h'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Buffer Recovery</span>
                      <span className={`font-semibold ${event.recovered_delay_hours > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {event.recovered_delay_hours > 0 ? `-${event.recovered_delay_hours}h` : '0.0h'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Cumulative Delay</span>
                      <span className="font-bold text-cyan-400">
                        {event.cumulative_delay_hours > 0 ? `+${event.cumulative_delay_hours}h` : `${event.cumulative_delay_hours}h`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explainable AI (SHAP) Insights Section */}
      {explanation && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Explainable AI (XAI) Attribution & Contributing Factors
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quantified additive feature attributions for this shipment's schedule variance.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20 self-start">
              Model Attribution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            {/* Positive Delay Contributors */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Primary Delay Drivers (Positive Hours)
              </h4>
              <div className="space-y-2">
                {explanation.top_positive_factors?.length > 0 ? (
                  explanation.top_positive_factors.map((factor: any, i: number) => (
                    <div key={i} className="p-2.5 bg-slate-900/60 rounded border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200">{factor.factor_name}</span>
                        <span className="font-bold text-rose-400">+{factor.impact_hours} hrs</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{factor.interpretation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No significant positive delay contributors observed.</p>
                )}
              </div>
            </div>

            {/* Recovery Factors */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Schedule Absorption & Recovery (Mitigating Hours)
              </h4>
              <div className="space-y-2">
                {explanation.top_recovery_factors?.length > 0 ? (
                  explanation.top_recovery_factors.map((factor: any, i: number) => (
                    <div key={i} className="p-2.5 bg-slate-900/60 rounded border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200">{factor.factor_name}</span>
                        <span className="font-bold text-emerald-400">{factor.impact_hours} hrs</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{factor.interpretation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No significant speed acceleration or buffer recovery recorded.</p>
                )}
              </div>
            </div>
          </div>

          {/* Academic / Engineering Methodology Disclaimer */}
          <div className="p-3 bg-slate-950/80 rounded border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>{explanation.methodology_disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
};
