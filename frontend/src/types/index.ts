export type Shipment = {
  shipment_id: string;
  origin_port: string;
  origin_port_name: string;
  destination_port: string;
  destination_port_name: string;
  route_distance_nm: number;
  transport_mode: string;
  vessel_type: string;
  cargo_category: string;
  scheduled_departure: string;
  scheduled_eta: string;
  predicted_eta: string;
  actual_delivery?: string | null;
  current_stage: string;
  current_stage_order: number;
  status: string;
  initial_delay_hours: number;
  cumulative_delay_hours: number;
  remaining_delay_hours: number;
  final_delay_hours: number;
  delay_severity: 'On Time' | 'Minor Delay' | 'Moderate Delay' | 'Severe Delay';
  port_congestion_index: number;
  weather_severity_index: number;
  wind_speed_kmh: number;
  precipitation_mm: number;
  total_recovered_hours: number;
  has_missing_intermediate_events: boolean;
  data_source: string;
};

export type StageEvent = {
  event_id: string;
  shipment_id: string;
  stage_name: string;
  stage_order: number;
  location: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  scheduled_duration_hours: number;
  actual_duration_hours?: number | null;
  incremental_delay_hours: number;
  recovered_delay_hours: number;
  cumulative_delay_hours: number;
  event_status: string;
  is_missing: boolean;
  data_source: string;
};

export type OverviewMetrics = {
  total_shipments: number;
  on_time_shipments: number;
  delayed_shipments: number;
  on_time_percentage: number;
  average_predicted_delay_hours: number;
  severe_delay_count: number;
  average_prediction_mae_hours: number;
  severity_distribution: Array<{ severity: string; count: number; color: string }>;
  route_performance: Array<{ corridor: string; volume: number; avg_delay_hours: number }>;
  stage_distribution: Array<{ stage: string; count: number }>;
};

export type Port = {
  code: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  region: string;
  cppi_rank_tier: string;
  baseline_dwell_hours: number;
  congestion_factor_base: number;
  annual_teu_million: number;
};

export type PredictionResult = {
  shipment_id: string;
  prediction_mode?: string;
  current_stage: string;
  current_stage_order: number;
  scheduled_eta: string;
  predicted_eta: string;
  current_cumulative_delay_hours: number;
  predicted_remaining_delay_hours: number;
  total_predicted_final_delay_hours: number;
  delay_severity: string;
  delay_probability_breakdown: Record<string, number>;
  confidence_score: number;
  uncertainty_interval_hours: {
    lower_bound_delay_hours: number;
    upper_bound_delay_hours: number;
    margin_hours: number;
  };
  uncertainty_reasons: string[];
  data_quality_indicators: Record<string, any>;
  downstream_stage_schedule: Array<{
    stage_name: string;
    stage_order: number;
    expected_timestamp: string;
    status: string;
  }>;
  delay_propagation_analysis: Record<string, any>;
  explainability: {
    predicted_remaining_delay_hours: number;
    base_value_hours: number;
    top_positive_factors: Array<{
      factor_name: string;
      impact_hours: number;
      impact_direction: string;
      interpretation: string;
    }>;
    top_recovery_factors: Array<{
      factor_name: string;
      impact_hours: number;
      impact_direction: string;
      interpretation: string;
    }>;
    all_attributions: Array<{
      factor_name: string;
      impact_hours: number;
      impact_direction: string;
      interpretation: string;
    }>;
    methodology_disclaimer: string;
  };
};

export type ModelMetricsSummary = {
  model_version: string;
  trained_timestamp: string;
  best_model_name: string;
  train_samples: number;
  test_samples: number;
  regression_metrics: Record<string, { mae: number; rmse: number; r2: number; median_absolute_error: number }>;
  best_regression_metrics: { mae: number; rmse: number; r2: number; median_absolute_error: number };
  classification_metrics: {
    accuracy: number;
    macro_f1: number;
    weighted_f1?: number;
    labels: string[];
    per_class_metrics?: Record<string, { precision: number; recall: number; f1_score: number; support: number }>;
    confusion_matrix: number[][];
    classification_report: Record<string, any>;
  };
  delay_thresholds: Record<string, string>;
};

export type FeatureImportance = {
  feature: string;
  importance: number;
};

export type DataSource = {
  source_id: string;
  name: string;
  source_classification: string;
  provider: string;
  category: string;
  license: string;
  collection_date: string;
  record_count: string;
  data_freshness: string;
  endpoint_or_url?: string;
  coverage: string;
  integration_status: string;
  description: string;
  limitations: string;
  verified: boolean;
};

export type DataQualityReport = {
  audit_timestamp: string;
  total_shipment_records: number;
  total_event_records: number;
  completeness_score_pct: number;
  duplicate_records: {
    duplicate_shipments: number;
    duplicate_events: number;
    status: string;
  };
  missing_timestamps: {
    telemetry_gaps_flagged: number;
    shipments_with_intermediate_gaps: number;
    gap_rate_pct: number;
    treatment: string;
  };
  invalid_records: {
    invalid_distances: number;
    invalid_severities: number;
    invalid_durations: number;
    total_invalid: number;
    status: string;
  };
  records_excluded: number;
  missing_value_treatment_strategies: Array<{
    field_group: string;
    strategy: string;
    details: string;
  }>;
};
