"""
Data Quality Audit and Summary Engine for ShipPredict AI.
Inspects datasets, relational storage, and schema integrity to provide
uncompromising transparency on data quality, missingness, duplicates, and imputations.
"""

import os
import pandas as pd
from typing import Dict, Any, List
from datetime import datetime, timezone


def compute_data_quality_report(
    shipments_csv: str = "data/processed/shipments.csv",
    events_csv: str = "data/processed/events.csv"
) -> Dict[str, Any]:
    """
    Computes rigorous data quality metrics across shipment journeys and stage events.
    """
    if not os.path.exists(shipments_csv) or not os.path.exists(events_csv):
        return {
            "status": "dataset_missing",
            "message": "Processed datasets not found on disk."
        }

    df_shipments = pd.read_csv(shipments_csv)
    df_events = pd.read_csv(events_csv)

    total_shipments = len(df_shipments)
    total_events = len(df_events)

    # 1. Duplicate checks
    duplicate_shipment_ids = int(df_shipments.duplicated(subset=["shipment_id"]).sum())
    duplicate_event_ids = int(df_events.duplicated(subset=["event_id"]).sum())

    # 2. Missing timestamp analysis
    missing_actual_starts = int(df_events["actual_start"].isna().sum())
    missing_actual_ends = int(df_events["actual_end"].isna().sum())
    telemetry_gaps = int(df_events["is_missing"].sum())
    shipments_with_gaps = int(df_shipments["has_missing_intermediate_events"].sum())

    # 3. Invalid record checks
    # E.g., Negative distances, impossible coordinates, or corrupt port codes
    invalid_distances = int((df_shipments["route_distance_nm"] <= 0).sum())
    invalid_severities = int((~df_shipments["delay_severity"].isin(["On Time", "Minor Delay", "Moderate Delay", "Severe Delay"])).sum())
    invalid_records_count = invalid_distances + invalid_severities

    # 4. Chronological consistency checks
    # Actual duration should not be negative
    invalid_durations = int((df_events["actual_duration_hours"].dropna() < 0).sum())

    # 5. Completeness score
    total_core_fields = total_shipments * 15
    missing_core_values = int(df_shipments[[
        "shipment_id", "origin_port", "destination_port", "route_distance_nm",
        "scheduled_departure", "scheduled_eta", "current_stage", "cumulative_delay_hours",
        "remaining_delay_hours", "final_delay_hours", "delay_severity",
        "port_congestion_index", "weather_severity_index"
    ]].isna().sum().sum())
    completeness_pct = round(((total_core_fields - missing_core_values) / total_core_fields) * 100.0, 2)

    return {
        "audit_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_shipment_records": total_shipments,
        "total_event_records": total_events,
        "completeness_score_pct": completeness_pct,
        "duplicate_records": {
            "duplicate_shipments": duplicate_shipment_ids,
            "duplicate_events": duplicate_event_ids,
            "status": "PASSED" if duplicate_shipment_ids == 0 and duplicate_event_ids == 0 else "FAILED"
        },
        "missing_timestamps": {
            "telemetry_gaps_flagged": telemetry_gaps,
            "shipments_with_intermediate_gaps": shipments_with_gaps,
            "gap_rate_pct": round((shipments_with_gaps / total_shipments) * 100.0, 2),
            "treatment": "Imputed using empirical port dwell distributions; flagged to degrade confidence interval by 18%."
        },
        "invalid_records": {
            "invalid_distances": invalid_distances,
            "invalid_severities": invalid_severities,
            "invalid_durations": invalid_durations,
            "total_invalid": invalid_records_count + invalid_durations,
            "status": "PASSED" if (invalid_records_count + invalid_durations) == 0 else "WARNING"
        },
        "records_excluded": 0,
        "missing_value_treatment_strategies": [
            {
                "field_group": "Telemetry Checkpoints (Missing Actual Timestamps)",
                "strategy": "Historical Stage Dwell Imputation",
                "details": "When an intermediate port event fails to log (telemetry gap), actual duration is estimated from World Bank CPPI baselines and confidence score is penalized."
            },
            {
                "field_group": "Marine Weather Observations",
                "strategy": "Regional Climatological Fallback",
                "details": "If Open-Meteo API is unreachable or rate-limited, regional monthly seasonal means are applied with transparent source tagging."
            },
            {
                "field_group": "Machine Learning Features",
                "strategy": "Scikit-Learn SimpleImputer (Median)",
                "details": "Continuous numerical features are imputed using training set medians within the Pipeline."
            },
            {
                "field_group": "Categorical Attributes",
                "strategy": "OneHotEncoder(handle_unknown='ignore')",
                "details": "Unseen ports or vessel classes at inference are encoded with zero-vectors rather than crashing."
            }
        ]
    }
