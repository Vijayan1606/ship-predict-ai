import axios from 'axios';
import type {
  Shipment,
  OverviewMetrics,
  StageEvent,
  PredictionResult,
  ModelMetricsSummary,
  FeatureImportance,
  DataSource,
  DataQualityReport,
  Port
} from '../types';

const apiBase = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  timeout: 10000,
});

export const fetchOverviewMetrics = async (): Promise<OverviewMetrics> => {
  const res = await api.get('/overview');
  return res.data;
};

export const fetchShipments = async (params?: {
  search?: string;
  severity?: string;
  stage?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
  skip?: number;
  limit?: number;
}): Promise<Shipment[]> => {
  const res = await api.get('/shipments', { params });
  return res.data;
};

export const fetchShipmentById = async (shipmentId: string): Promise<Shipment> => {
  const res = await api.get(`/shipments/${shipmentId}`);
  return res.data;
};

export const fetchShipmentTimeline = async (shipmentId: string): Promise<{ shipment_id: string; timeline: StageEvent[] }> => {
  const res = await api.get(`/shipments/${shipmentId}/timeline`);
  return res.data;
};

export const fetchShipmentExplanation = async (shipmentId: string): Promise<any> => {
  const res = await api.get(`/shipments/${shipmentId}/explanation`);
  return res.data;
};

export const predictShipment = async (payload: any): Promise<PredictionResult> => {
  const res = await api.post('/predict', payload);
  return res.data;
};

export const fetchModelMetrics = async (): Promise<ModelMetricsSummary> => {
  const res = await api.get('/model/metrics');
  return res.data;
};

export const fetchFeatureImportance = async (): Promise<FeatureImportance[]> => {
  const res = await api.get('/model/feature-importance');
  return res.data;
};

export const fetchDataSources = async (): Promise<{ sources: DataSource[]; dictionary: Record<string, any> }> => {
  const res = await api.get('/data/sources');
  return res.data;
};

export const fetchDataStatus = async (): Promise<any> => {
  const res = await api.get('/data/status');
  return res.data;
};

export const fetchDataQuality = async (): Promise<DataQualityReport> => {
  const res = await api.get('/data/quality');
  return res.data;
};

export const fetchPorts = async (): Promise<Port[]> => {
  const res = await api.get('/ports');
  return res.data;
};
