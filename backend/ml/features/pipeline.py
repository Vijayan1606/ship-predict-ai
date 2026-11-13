"""
Feature Engineering Pipeline for ShipPredict AI.
Constructs domain-aware features reflecting maritime physics, port congestion,
meteorological severity, and upstream delay propagation.
Avoids target leakage and supports reproducible tabular transformations.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timezone
from typing import Tuple, List, Dict, Any
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline as SklearnPipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer


FEATURE_METADATA = {
    "numerical_features": [
        "route_distance_nm",
        "current_stage_order",
        "remaining_stages_count",
        "initial_delay_hours",
        "cumulative_delay_hours",
        "total_recovered_hours",
        "port_congestion_index",
        "weather_severity_index",
        "wind_speed_kmh",
        "precipitation_mm",
        "departure_month",
        "departure_day_of_week",
        "departure_hour",
        "interaction_weather_distance",
        "interaction_congestion_delay",
        "interaction_remaining_congestion",
    ],
    "categorical_features": [
        "transport_mode",
        "vessel_type",
        "cargo_category",
    ],
    "boolean_features": [
        "has_missing_intermediate_events",
    ]
}


def build_feature_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw shipment records into engineered ML feature matrix.
    Ensures no future target leakage occurs.
    """
    df = df.copy()

    # Parse timestamps with safe fallback
    if "scheduled_departure" not in df.columns or df["scheduled_departure"].isna().all():
        df["scheduled_departure"] = datetime.now(timezone.utc).isoformat()
    df["scheduled_departure"] = df["scheduled_departure"].fillna(datetime.now(timezone.utc).isoformat())
    sched_dep = pd.to_datetime(df["scheduled_departure"], utc=True)
    df["departure_month"] = sched_dep.dt.month.fillna(6).astype(int)
    df["departure_day_of_week"] = sched_dep.dt.day_of_week.fillna(2).astype(int)
    df["departure_hour"] = sched_dep.dt.hour.fillna(12).astype(int)

    # Stages calculation
    if "current_stage_order" not in df.columns:
        df["current_stage_order"] = 1
    df["remaining_stages_count"] = 7 - df["current_stage_order"]

    # Fill numerical nulls with sensible defaults
    if "route_distance_nm" not in df.columns:
        df["route_distance_nm"] = 5000.0
    if "initial_delay_hours" not in df.columns:
        df["initial_delay_hours"] = 0.0
    if "cumulative_delay_hours" not in df.columns:
        df["cumulative_delay_hours"] = 0.0
    if "total_recovered_hours" not in df.columns:
        df["total_recovered_hours"] = 0.0
    if "port_congestion_index" not in df.columns:
        df["port_congestion_index"] = 1.15
    if "weather_severity_index" not in df.columns:
        df["weather_severity_index"] = 0.20
    if "wind_speed_kmh" not in df.columns:
        df["wind_speed_kmh"] = 18.0
    if "precipitation_mm" not in df.columns:
        df["precipitation_mm"] = 2.0
    if "has_missing_intermediate_events" not in df.columns:
        df["has_missing_intermediate_events"] = False

    df["route_distance_nm"] = df["route_distance_nm"].fillna(5000.0)
    df["initial_delay_hours"] = df["initial_delay_hours"].fillna(0.0)
    df["cumulative_delay_hours"] = df["cumulative_delay_hours"].fillna(0.0)
    df["total_recovered_hours"] = df["total_recovered_hours"].fillna(0.0)
    df["port_congestion_index"] = df["port_congestion_index"].fillna(1.15)
    df["weather_severity_index"] = df["weather_severity_index"].fillna(0.20)
    df["wind_speed_kmh"] = df["wind_speed_kmh"].fillna(18.0)
    df["precipitation_mm"] = df["precipitation_mm"].fillna(2.0)
    df["has_missing_intermediate_events"] = df["has_missing_intermediate_events"].fillna(False).astype(int)

    # Interaction Features
    df["interaction_weather_distance"] = (
        df["weather_severity_index"] * (df["route_distance_nm"] / 1000.0)
    )
    df["interaction_congestion_delay"] = (
        df["cumulative_delay_hours"] * (df["port_congestion_index"] - 1.0).clip(lower=0.0)
    )
    df["interaction_remaining_congestion"] = (
        df["remaining_stages_count"] * df["port_congestion_index"]
    )

    return df


def get_feature_column_names() -> List[str]:
    """Returns complete list of feature columns passed to the ML models."""
    return (
        FEATURE_METADATA["numerical_features"]
        + FEATURE_METADATA["categorical_features"]
        + FEATURE_METADATA["boolean_features"]
    )


def create_preprocessor() -> ColumnTransformer:
    """Creates a ColumnTransformer to encode categorical features and scale numericals."""
    num_pipeline = SklearnPipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                num_pipeline,
                FEATURE_METADATA["numerical_features"]
            ),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                FEATURE_METADATA["categorical_features"]
            ),
            (
                "passthrough",
                "passthrough",
                FEATURE_METADATA["boolean_features"]
            )
        ]
    )
    return preprocessor


def chronological_train_test_split(
    df: pd.DataFrame,
    test_ratio: float = 0.20
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Performs chronological splitting by scheduled_departure timestamp
    to prevent temporal leakage across historical shipments.
    """
    df_sorted = df.sort_values(by="scheduled_departure").reset_index(drop=True)
    split_idx = int(len(df_sorted) * (1.0 - test_ratio))
    train_df = df_sorted.iloc[:split_idx].copy()
    test_df = df_sorted.iloc[split_idx:].copy()
    return train_df, test_df
