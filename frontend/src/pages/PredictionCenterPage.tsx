import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Send, 
  Clock, 
  MapPin, 
  Anchor, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Info,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  Radio,
  Sparkles
} from 'lucide-react';
import { predictShipment, fetchPorts, fetchShipments } from '../services/api';
import type { Port, PredictionResult, Shipment } from '../types';

export const PredictionCenterPage: React.FC = () => {
  const [ports, setPorts] = useState<Port[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  // Operational Mode Toggle: Hypothetical Simulation vs Live Telemetry Observation
  const [mode, setMode] = useState<'hypothetical' | 'live'>('hypothetical');
  const [liveShipments, setLiveShipments] = useState<Shipment[]>([]);
  const [loadingLiveShipments, setLoadingLiveShipments] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');

  // Form inputs
  const [originPort, setOriginPort] = useState('CNSHA');
  const [destPort, setDestPort] = useState('USLAX');
  const [transportMode, setTransportMode] = useState('Ocean Freight');
  const [vesselType, setVesselType] = useState('Neo-Panamax (10000-14999 TEU)');
  const [cargoCategory, setCargoCategory] = useState('Consumer Goods & Retail');
  const [currentStage, setCurrentStage] = useState('Intermediate Port Arrival');
  const [cumulativeDelay, setCumulativeDelay] = useState<number>(6.0);
  const [congestionIndex, setCongestionIndex] = useState<number>(1.25);
  const [hasMissingEvents, setHasMissingEvents] = useState<boolean>(false);

  useEffect(() => {
    const loadPorts = async () => {
      try {
        setLoadingPorts(true);
        const data = await fetchPorts();
        setPorts(data);
      } catch (err) {
        console.error('Failed to load ports:', err);
      } finally {
        setLoadingPorts(false);
      }
    };
    loadPorts();
  }, []);

  const handleModeChange = async (newMode: 'hypothetical' | 'live') => {
    setMode(newMode);
    if (newMode === 'live' && liveShipments.length === 0) {
      try {
        setLoadingLiveShipments(true);
        const res = await fetchShipments({ page: 1, page_size: 50 });
        setLiveShipments(res.items);
        if (res.items.length > 0) {
          applyShipmentToForm(res.items[0]);
        }
      } catch (err) {
        console.error('Failed to load live shipments:', err);
      } finally {
        setLoadingLiveShipments(false);
      }
    }
  };

  const applyShipmentToForm = (shp: Shipment) => {
    setSelectedShipmentId(shp.shipment_id);
    setOriginPort(shp.origin_port);
    setDestPort(shp.destination_port);
    setTransportMode(shp.transport_mode);
    setVesselType(shp.vessel_type);
    setCargoCategory(shp.cargo_category);
    setCurrentStage(shp.current_stage);
    setCumulativeDelay(Math.max(0, Number(shp.final_delay_hours.toFixed(1))));
    setCongestionIndex(shp.dest_port_congestion_index || 1.15);
    setHasMissingEvents(shp.has_missing_intermediate_events || false);
  };

  const handleSelectShipment = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const shpId = e.target.value;
    setSelectedShipmentId(shpId);
    const found = liveShipments.find(s => s.shipment_id === shpId);
    if (found) {
      applyShipmentToForm(found);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const isLive = mode === 'live' && Boolean(selectedShipmentId);
      const payload = {
        shipment_id: isLive ? selectedShipmentId : ('SIM-' + Math.floor(1000 + Math.random() * 9000)),
        origin_port: originPort,
        destination_port: destPort,
        transport_mode: transportMode,
        vessel_type: vesselType,
        cargo_category: cargoCategory,
        current_stage: currentStage,
        cumulative_delay_hours: cumulativeDelay,
        port_congestion_index: congestionIndex,
        has_missing_intermediate_events: hasMissingEvents,
      };

      const res = await predictShipment(payload);
      setResult(res);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-cyan-400" />
          Interactive ETA Prediction Center
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Predict arrival timestamps, remaining stage delays, and delay propagation for live telemetric checkpoints or hypothetical scenario simulations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Prediction Form Panel */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          {/* Mode Switcher */}
          <div className="space-y-2 pb-3 border-b border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Inference Mode Selection
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => handleModeChange('hypothetical')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition ${
                  mode === 'hypothetical'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                What-If Simulation
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('live')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium transition ${
                  mode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                Live Checkpoint
              </button>
            </div>
          </div>

          {/* If Live Checkpoint Mode: Select Active Shipment */}
          {mode === 'live' && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  Select Monitored Shipment
                </span>
                {loadingLiveShipments && <Clock className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>
              <select
                value={selectedShipmentId}
                onChange={handleSelectShipment}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {liveShipments.map((s) => (
                  <option key={s.shipment_id} value={s.shipment_id}>
                    {s.shipment_id} ({s.origin_port} &rarr; {s.destination_port}) - {s.current_stage}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block">
                Parameters below auto-populated from genuine shipment telemetry record.
              </span>
            </div>
          )}

          <h2 className="text-xs font-semibold text-white flex items-center gap-2 pt-1">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Checkpoint & Journey Variables
          </h2>

          <form onSubmit={handlePredict} className="space-y-4 text-xs">
            {/* Origin & Destination Ports */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Origin Port</label>
                <select
                  value={originPort}
                  onChange={(e) => setOriginPort(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {ports.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name.replace('Port of ', '')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Destination Port</label>
                <select
                  value={destPort}
                  onChange={(e) => setDestPort(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {ports.filter((p) => p.code !== originPort).map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name.replace('Port of ', '')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vessel Class & Cargo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Vessel Class</label>
                <select
                  value={vesselType}
                  onChange={(e) => setVesselType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ULCV (18000+ TEU)">ULCV (18,000+ TEU)</option>
                  <option value="Neo-Panamax (10000-14999 TEU)">Neo-Panamax (10,000-14,999 TEU)</option>
                  <option value="Post-Panamax (5000-9999 TEU)">Post-Panamax (5,000-9,999 TEU)</option>
                  <option value="Feeder (<3000 TEU)">Feeder (&lt;3,000 TEU)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Cargo Category</label>
                <select
                  value={cargoCategory}
                  onChange={(e) => setCargoCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Consumer Goods & Retail">Consumer Goods & Retail</option>
                  <option value="Electronics & High-Tech">Electronics & High-Tech</option>
                  <option value="Automotive Parts & Machinery">Automotive Parts & Machinery</option>
                  <option value="Chemicals & Dangerous Goods">Chemicals & Dangerous Goods</option>
                  <option value="Refrigerated Perishables (Reefer)">Reefer Perishables</option>
                </select>
              </div>
            </div>

            {/* Current Checkpoint Stage */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">Current Journey Stage</label>
              <select
                value={currentStage}
                onChange={(e) => setCurrentStage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Origin Departure">Stage 1 - Origin Departure</option>
                <option value="Vessel Departure">Stage 2 - Vessel Departure</option>
                <option value="Intermediate Port Arrival">Stage 3 - Intermediate Port Arrival</option>
                <option value="Port Processing">Stage 4 - Port Processing</option>
                <option value="Customs Clearance">Stage 5 - Customs Clearance</option>
                <option value="Destination Port Departure">Stage 6 - Destination Port Departure</option>
              </select>
            </div>

            {/* Cumulative Delay Observed So Far */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">Cumulative Delay at Checkpoint (Hours)</label>
                <span className="font-semibold text-cyan-400">{cumulativeDelay} hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                step="0.5"
                value={cumulativeDelay}
                onChange={(e) => setCumulativeDelay(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Destination Port Congestion Index */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">Port Congestion Factor (Baseline Dwell Multiplier)</label>
                <span className="font-semibold text-cyan-400">{congestionIndex.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.80"
                max="2.00"
                step="0.05"
                value={congestionIndex}
                onChange={(e) => setCongestionIndex(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Missing Events Simulation Toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="checkbox"
                id="missingEvents"
                checked={hasMissingEvents}
                onChange={(e) => setHasMissingEvents(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0"
              />
              <label htmlFor="missingEvents" className="text-slate-300 font-medium cursor-pointer">
                Simulate Missing Intermediate Event (Telemetry Failure)
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center justify-center gap-2 transition shadow-sm shadow-cyan-500/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Predicting ETA & Downstream Impact...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {mode === 'live' ? 'Predict ETA for Monitored Shipment' : 'Run Scenario Prediction'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Prediction Results Panel */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="space-y-4">
              {/* Mode Banner Distinction */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                result.prediction_mode === 'live_telemetry_observation'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    result.prediction_mode === 'live_telemetry_observation' ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'
                  }`} />
                  <div>
                    <span className="font-semibold uppercase tracking-wider text-[11px] block">
                      {result.prediction_mode === 'live_telemetry_observation'
                        ? 'Live Telemetry Observation'
                        : 'Hypothetical What-If Simulation'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {result.prediction_mode === 'live_telemetry_observation'
                        ? `Predictions based on empirical sensor checkpoints & verified historical events for ${result.shipment_id}`
                        : `Synthetic parameter inputs for contingency testing and schedule buffer evaluation`}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700 bg-slate-900 text-slate-300 shrink-0">
                  {result.shipment_id}
                </span>
              </div>

              {/* Primary Prediction Output Cards */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Estimated Arrival Time</span>
                    <h3 className="text-xl font-bold text-white mt-0.5">{formatDateTime(result.predicted_eta)}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Contract ETA: {formatDateTime(result.scheduled_eta)}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded font-semibold border ${
                      result.delay_severity === 'On Time'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : result.delay_severity === 'Minor Delay'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : result.delay_severity === 'Moderate Delay'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {result.delay_severity}
                    </span>
                  </div>
                </div>

                {/* Delay & Uncertainty Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Remaining Delay</span>
                    <span className="text-base font-bold text-cyan-400">+{result.predicted_remaining_delay_hours} hrs</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">from current stage</span>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Total Final Delay</span>
                    <span className="text-base font-bold text-amber-400">+{result.total_predicted_final_delay_hours} hrs</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">including {result.current_cumulative_delay_hours}h upstream</span>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Delay Probability</span>
                    <span className="text-base font-bold text-rose-400">
                      {Math.round(result.delay_probability * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">calibrated classifier</span>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Confidence Interval</span>
                    <span className="text-base font-bold text-emerald-400">
                      &plusmn;{result.uncertainty_interval_hours.margin_hours}h
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {Math.round(result.confidence_score * 100)}% score
                    </span>
                  </div>
                </div>

                {/* Uncertainty Warnings */}
                {result.uncertainty_reasons.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Prediction Uncertainty Considerations:
                    </span>
                    <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                      {result.uncertainty_reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Downstream Stage Timings */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Projected Downstream Stage Schedule
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {result.downstream_stage_schedule.map((st) => (
                    <div key={st.stage_order} className="p-2.5 bg-slate-950/60 rounded border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-200">Stage {st.stage_order}: {st.stage_name}</span>
                        <div className="text-[10px] text-slate-400">{formatDateTime(st.expected_timestamp)}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        st.status === 'COMPLETED' ? 'bg-slate-800 text-slate-400' : (st.status === 'IN_PROGRESS' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-300')
                      }`}>
                        {st.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explainability factors */}
              {result.explainability && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Key Contributing Factors (SHAP Attribution)
                  </h4>
                  <div className="space-y-2 text-xs">
                    {result.explainability.top_positive_factors?.map((f, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/60 rounded border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-200">{f.factor_name}</span>
                          <div className="text-[11px] text-slate-400">{f.interpretation}</div>
                        </div>
                        <span className="font-bold text-rose-400 whitespace-nowrap ml-2">+{f.impact_hours} hrs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3">
              <Activity className="w-8 h-8 mx-auto text-slate-600" />
              <h3 className="text-sm font-semibold text-white">No Active Scenario Computed</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an operational mode, adjust parameters or select a live monitored shipment, and generate an ETA prediction.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
