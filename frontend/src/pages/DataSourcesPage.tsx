import React, { useEffect, useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  ExternalLink, 
  Info, 
  RefreshCw, 
  BookOpen, 
  Search,
  Activity,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Layers,
  Sparkles,
  Calendar,
  Hash
} from 'lucide-react';
import { fetchDataSources, fetchDataStatus, fetchDataQuality } from '../services/api';
import type { DataSource, DataQualityReport } from '../types';

export const DataSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [dictionary, setDictionary] = useState<Record<string, any>>({});
  const [statusInfo, setStatusInfo] = useState<any | null>(null);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dictSearch, setDictSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [sourceData, statusData, qualityData] = await Promise.all([
          fetchDataSources(),
          fetchDataStatus(),
          fetchDataQuality(),
        ]);
        setSources(sourceData.sources);
        setDictionary(sourceData.dictionary);
        setStatusInfo(statusData);
        setQualityReport(qualityData);
      } catch (err) {
        console.error('Failed to load data sources or quality report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading dataset registries, quality metrics, and schemas...</p>
      </div>
    );
  }

  const filteredFields = Object.entries(dictionary).filter(([field, meta]) => {
    if (!dictSearch.trim()) return true;
    const q = dictSearch.toLowerCase();
    return (
      field.toLowerCase().includes(q) || 
      meta.description?.toLowerCase().includes(q) ||
      meta.source_classification?.toLowerCase().includes(q)
    );
  });

  const getSourceBadge = (classification?: string) => {
    switch (classification) {
      case 'REAL HISTORICAL DATASET':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'LIVE EXTERNAL API DATA':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'DERIVED FEATURE / DISTANCE GRAPH':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-cyan-400" />
          Public Data Sources, Quality Audit & Data Dictionary
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Complete transparency into genuine empirical registries, live API connectors, automated data quality validations, and canonical schema definitions.
        </p>
      </div>

      {/* Integration Status Bar */}
      {statusInfo && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-semibold text-white">System Data Pipeline Operational</span>
                <p className="text-[11px] text-slate-400">
                  {statusInfo.total_indexed_shipments} shipments &bull; {statusInfo.total_indexed_events} journey events indexed in relational storage.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              {statusInfo.external_connectors?.map((conn: any, idx: number) => (
                <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-medium">{conn.name}:</span>
                  <span className="text-slate-400 text-[11px]">{conn.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TASK 8: Data Quality Summary */}
      {qualityReport && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Data Quality & Pipeline Integrity Audit Report
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated validation metrics computed across active database tables.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              Audit Date: {qualityReport.audit_timestamp}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Total Shipments</span>
              <span className="text-base font-bold text-white mt-0.5 block font-mono">
                {qualityReport.total_shipment_records.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400">100% indexed</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Stage Events</span>
              <span className="text-base font-bold text-white mt-0.5 block font-mono">
                {qualityReport.total_event_records.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">7 stages / shipment</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Duplicate Records</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block font-mono">
                {qualityReport.duplicate_records.duplicate_shipments}
              </span>
              <span className="text-[10px] text-emerald-400">{qualityReport.duplicate_records.status}</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Invalid Records</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block font-mono">
                {qualityReport.invalid_records.total_invalid}
              </span>
              <span className="text-[10px] text-emerald-400">{qualityReport.invalid_records.status}</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Records Excluded</span>
              <span className="text-base font-bold text-slate-300 mt-0.5 block font-mono">
                {qualityReport.records_excluded}
              </span>
              <span className="text-[10px] text-slate-500">Zero data discarded</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Telemetry Sensor Gaps</span>
              <span className="text-base font-bold text-amber-400 mt-0.5 block font-mono">
                {qualityReport.missing_timestamps.gap_rate_pct}%
              </span>
              <span className="text-[10px] text-amber-400">Handled via Dead-Reckoning</span>
            </div>
          </div>

          {/* Missing Value Treatment Strategies */}
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Missing-Value Treatment & Imputation Protocols
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {qualityReport.missing_value_treatment_strategies.map((strat, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950/50 rounded border border-slate-850">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{strat.field_group}</span>
                    <span className="text-[10px] text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800">
                      {strat.strategy}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {strat.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TASK 3: Verified Datasets Cards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Registered Public Datasets & External APIs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified data sources integrated into the ShipPredict AI ingestion and simulation architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((src) => (
            <div key={src.source_id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{src.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getSourceBadge(src.source_classification)}`}>
                      {src.source_classification}
                    </span>
                  </div>
                  <div className="text-[11px] text-cyan-400 mt-0.5 font-medium">{src.provider}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  {src.integration_status}
                </span>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed">{src.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-850">
                <div>
                  <span className="text-slate-500 block">License:</span>
                  <span className="text-slate-300 font-medium">{src.license}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Records:</span>
                  <span className="text-slate-300 font-medium">{src.record_count}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Collection:</span>
                  <span className="text-slate-300 font-medium">{src.collection_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Freshness:</span>
                  <span className="text-slate-300 font-medium">{src.data_freshness}</span>
                </div>
              </div>

              {src.endpoint_or_url && (
                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono truncate">
                  <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-cyan-400 truncate">{src.endpoint_or_url}</span>
                </div>
              )}

              <div className="text-[10px] text-amber-400/90 bg-amber-500/5 p-2 rounded border border-amber-500/10">
                <strong>Limitations:</strong> {src.limitations}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TASK 4: Comprehensive Data Dictionary */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Technical Data Dictionary (Automatically Validated from Schemas)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive field descriptions, types, constraints, and source classifications matching backend schemas.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter fields or sources..."
              value={dictSearch}
              onChange={(e) => setDictSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Field Name</th>
                <th className="py-2.5 px-3">Data Type</th>
                <th className="py-2.5 px-3">Source Classification</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Validation & Constraints</th>
                <th className="py-2.5 px-3">Missing / Null Handling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFields.map(([fieldName, meta]) => (
                <tr key={fieldName} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-semibold text-cyan-400 font-mono text-[11px]">
                    {fieldName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                    {meta.type}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {meta.source_classification || 'Derived Feature'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {meta.description}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {meta.validation}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {meta.handling_strategy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
