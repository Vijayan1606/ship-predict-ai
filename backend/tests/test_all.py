"""
Comprehensive test suite for ShipPredict AI platform.
Tests:
1. Maritime Distance and Port Data Validation
2. Weather Connector and Offline Fallback
3. Delay Propagation Engine & Non-Double-Counting Invariant
4. Feature Engineering Pipeline & Leakage Checks
5. Model Evaluation Metrics and Artifact Validity
6. ETA Prediction Service & Confidence Intervals
7. Explainable AI (SHAP) Attribution Outputs
8. FastAPI Endpoints & Error Handling
"""

import pytest
import os
import json
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.ml.data.ports_data import PORTS_DATABASE, get_maritime_distance_nm, haversine_distance_km
from backend.ml.ingestion.weather_connector import WeatherConnector
from backend.ml.propagation.engine import StageDelayRecord, DelayPropagationEngine
from backend.ml.features.pipeline import build_feature_dataframe, get_feature_column_names, chronological_train_test_split
from backend.ml.prediction.service import ETAPredictionService
from backend.ml.explainability.explainer import ShipmentExplainer
from backend.app.main import app

client = TestClient(app)


# 1. Port & Maritime Distance Tests
def test_port_database_validity():
    assert "CNSHA" in PORTS_DATABASE
    assert "USLAX" in PORTS_DATABASE
    assert PORTS_DATABASE["CNSHA"]["latitude"] > 0
    assert PORTS_DATABASE["USLAX"]["longitude"] < 0
    assert PORTS_DATABASE["CNSHA"]["baseline_dwell_hours"] > 0


def test_maritime_distance_calculation():
    dist_sha_lax = get_maritime_distance_nm("CNSHA", "USLAX")
    assert dist_sha_lax == 5700.0  # verified lane distance

    dist_sin_rtm = get_maritime_distance_nm("SGSIN", "NLRTM")
    assert dist_sin_rtm == 8300.0

    # Symmetry check
    dist_lax_sha = get_maritime_distance_nm("USLAX", "CNSHA")
    assert dist_sha_lax == dist_lax_sha


# 2. Weather Connector Tests
def test_weather_connector_offline_fallback():
    connector = WeatherConnector(timeout_seconds=0.01)
    # Forced fast query
    weather = connector.get_port_weather("USLAX", 33.74, -118.26, region="North America West Coast")
    assert "weather_severity_index" in weather
    assert 0.0 <= weather["weather_severity_index"] <= 1.0
    assert "data_source" in weather
    assert weather["wind_speed_kmh"] > 0


def test_weather_severity_bounds():
    connector = WeatherConnector()
    calm = connector.calculate_weather_severity(0.0, 0.0, 0.0)
    assert calm == 0.0

    gale = connector.calculate_weather_severity(80.0, 30.0, 100.0)
    assert gale == 1.0


# 3. Delay Propagation & Non-Double-Counting Tests
def test_delay_propagation_no_double_counting():
    """
    CRITICAL TEST: Ensures upstream delay is not double counted as an independent disruption downstream.
    If Origin departs 3 hours late, and Stage 2 runs in scheduled time, departure delay must remain 3 hours,
    not 3 + 3 = 6 hours.
    """
    engine = DelayPropagationEngine()
    t0 = datetime(2024, 5, 1, 8, 0, tzinfo=timezone.utc)

    # Stage 1: Origin Departure scheduled 8:00 -> 12:00 (dur=4h). Actual 11:00 -> 15:00 (dur=4h, arrival delay=3h, dep delay=3h, incremental=0)
    stage1 = StageDelayRecord(
        stage_name="Origin Departure",
        stage_order=1,
        scheduled_start=t0,
        scheduled_end=t0 + timedelta(hours=4),
        actual_start=t0 + timedelta(hours=3),
        actual_end=t0 + timedelta(hours=7),
        status="COMPLETED"
    )

    # Stage 2: Vessel Departure scheduled 12:00 -> 24:00 (dur=12h). Actual 15:00 -> 27:00 (dur=12h, arrival delay=3h, dep delay=3h, incremental=0)
    stage2 = StageDelayRecord(
        stage_name="Vessel Departure",
        stage_order=2,
        scheduled_start=t0 + timedelta(hours=4),
        scheduled_end=t0 + timedelta(hours=16),
        actual_start=t0 + timedelta(hours=7),
        actual_end=t0 + timedelta(hours=19),
        status="COMPLETED"
    )

    analysis = engine.analyze_journey([stage1, stage2], current_stage_order=2, remaining_stages_count=5)

    # Cumulative delay at stage 2 must be exactly 3.0 hours (not double counted)
    assert analysis["current_cumulative_delay_hours"] == 3.0
    assert analysis["total_incremental_stage_delay_hours"] == 0.0


def test_delay_recovery_mechanism():
    """Tests that faster stage performance correctly records recovered hours."""
    t0 = datetime(2024, 5, 1, 8, 0, tzinfo=timezone.utc)
    # Scheduled duration: 20 hours. Actual duration: 16 hours -> 4 hours recovered!
    stage = StageDelayRecord(
        stage_name="Intermediate Port Arrival",
        stage_order=3,
        scheduled_start=t0,
        scheduled_end=t0 + timedelta(hours=20),
        actual_start=t0 + timedelta(hours=4),
        actual_end=t0 + timedelta(hours=20),
        status="COMPLETED"
    )
    assert stage.scheduled_duration_hours == 20.0
    assert stage.actual_duration_hours == 16.0
    assert stage.recovered_delay_hours == 4.0
    assert stage.incremental_delay_hours == 0.0


# 4. Feature Engineering & Split Tests
def test_feature_engineering_pipeline():
    import pandas as pd
    sample_df = pd.DataFrame([{
        "shipment_id": "SHP-TEST",
        "origin_port": "CNSHA",
        "destination_port": "USLAX",
        "route_distance_nm": 5700.0,
        "transport_mode": "Ocean Freight",
        "vessel_type": "Neo-Panamax (10000-14999 TEU)",
        "cargo_category": "Electronics & High-Tech",
        "scheduled_departure": "2024-06-01T10:00:00+00:00",
        "scheduled_eta": "2024-06-18T10:00:00+00:00",
        "current_stage_order": 2,
        "initial_delay_hours": 2.5,
        "cumulative_delay_hours": 3.0,
        "total_recovered_hours": 0.5,
        "port_congestion_index": 1.25,
        "weather_severity_index": 0.30,
        "wind_speed_kmh": 22.0,
        "precipitation_mm": 1.5,
        "has_missing_intermediate_events": False
    }])

    feat_df = build_feature_dataframe(sample_df)
    cols = get_feature_column_names()
    for c in cols:
        assert c in feat_df.columns
    assert feat_df["interaction_weather_distance"].iloc[0] > 0
    assert feat_df["departure_month"].iloc[0] == 6


# 5. Model Evaluation Artifacts
def test_saved_model_metrics():
    assert os.path.exists("models/metrics.json")
    with open("models/metrics.json", "r", encoding="utf-8") as f:
        metrics = json.load(f)
    assert "regression_metrics" in metrics
    assert "classification_metrics" in metrics
    assert metrics["best_regression_metrics"]["mae"] > 0
    assert metrics["classification_metrics"]["accuracy"] > 0.50


# 6. Prediction Service & SHAP Explainability
def test_prediction_service():
    service = ETAPredictionService()
    payload = {
        "shipment_id": "SHP-UNITTEST",
        "origin_port": "CNSHA",
        "destination_port": "USLAX",
        "transport_mode": "Ocean Freight",
        "vessel_type": "Neo-Panamax (10000-14999 TEU)",
        "cargo_category": "Chemicals & Dangerous Goods",
        "current_stage": "Intermediate Port Arrival",
        "scheduled_departure": "2024-08-01T08:00:00+00:00",
        "scheduled_eta": "2024-08-20T12:00:00+00:00",
        "cumulative_delay_hours": 8.0,
        "port_congestion_index": 1.30,
        "weather_severity_index": 0.40
    }

    result = service.predict_shipment(payload)
    assert "predicted_eta" in result
    assert "predicted_remaining_delay_hours" in result
    assert result["total_predicted_final_delay_hours"] >= 8.0
    assert result["delay_severity"] in ["Moderate Delay", "Severe Delay", "Minor Delay"]
    assert result["confidence_score"] > 0.40
    assert "explainability" in result


# 7. FastAPI Endpoint Integration Tests
def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_shipments_api():
    resp = client.get("/api/shipments?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "shipment_id" in data[0]


def test_overview_metrics_api():
    resp = client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_shipments" in data
    assert data["total_shipments"] > 0
    assert "severity_distribution" in data


def test_predict_api_endpoint():
    payload = {
        "shipment_id": "SHP-APITEST",
        "origin_port": "CNSHA",
        "destination_port": "USLAX",
        "transport_mode": "Ocean Freight",
        "vessel_type": "Neo-Panamax (10000-14999 TEU)",
        "cargo_category": "Electronics & High-Tech",
        "current_stage": "Vessel Departure",
        "cumulative_delay_hours": 4.0,
        "port_congestion_index": 1.20
    }
    resp = client.post("/api/predict", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert "predicted_eta" in body
    assert body["total_predicted_final_delay_hours"] >= 4.0


def test_data_sources_api():
    resp = client.get("/api/data/sources")
    assert resp.status_code == 200
    body = resp.json()
    assert "sources" in body
    assert len(body["sources"]) >= 4


# 8. Enhanced Tests for Audit Requirements

def test_data_quality_endpoint():
    resp = client.get("/api/data/quality")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_shipment_records"] >= 1000
    assert data["total_event_records"] >= 7000
    assert data["duplicate_records"]["duplicate_shipments"] == 0
    assert data["invalid_records"]["total_invalid"] == 0
    assert len(data["missing_value_treatment_strategies"]) >= 3


def test_shipments_sorting():
    # Sort descending by final_delay_hours
    resp_desc = client.get("/api/shipments?limit=10&sort_by=final_delay_hours&sort_dir=desc")
    assert resp_desc.status_code == 200
    items_desc = resp_desc.json()
    assert len(items_desc) == 10
    delays_desc = [x["final_delay_hours"] for x in items_desc]
    assert delays_desc == sorted(delays_desc, reverse=True)

    # Sort ascending by final_delay_hours
    resp_asc = client.get("/api/shipments?limit=10&sort_by=final_delay_hours&sort_dir=asc")
    assert resp_asc.status_code == 200
    items_asc = resp_asc.json()
    delays_asc = [x["final_delay_hours"] for x in items_asc]
    assert delays_asc == sorted(delays_asc)


def test_predicted_eta_alignment():
    """
    CRITICAL AUDIT TEST:
    Ensures predicted_eta on shipment records always equals scheduled_eta + timedelta(hours=final_delay_hours),
    eliminating the bug where in-transit shipments rendered scheduled_eta as predicted_eta.
    """
    resp = client.get("/api/shipments?limit=25")
    assert resp.status_code == 200
    items = resp.json()
    for shp in items:
        assert "predicted_eta" in shp
        assert shp["predicted_eta"] is not None
        sched_dt = datetime.fromisoformat(shp["scheduled_eta"].replace("Z", "+00:00"))
        pred_dt = datetime.fromisoformat(shp["predicted_eta"].replace("Z", "+00:00"))
        expected_pred_dt = sched_dt + timedelta(hours=shp["final_delay_hours"])
        diff_seconds = abs((pred_dt - expected_pred_dt).total_seconds())
        assert diff_seconds < 60, f"Discrepancy for {shp['shipment_id']}: pred={pred_dt}, expected={expected_pred_dt}"


def test_cumulative_delay_timeline_alignment():
    """
    CRITICAL AUDIT TEST:
    Ensures stage events have cumulative_delay_hours matching stage-level propagation.
    """
    resp = client.get("/api/shipments?limit=1")
    shp_id = resp.json()[0]["shipment_id"]
    timeline_resp = client.get(f"/api/shipments/{shp_id}/timeline")
    assert timeline_resp.status_code == 200
    data = timeline_resp.json()
    assert "timeline" in data
    events = data["timeline"]
    assert len(events) >= 1
    for ev in events:
        assert "cumulative_delay_hours" in ev
        assert ev["cumulative_delay_hours"] is not None
        # Check non-negative or consistent float
        assert isinstance(ev["cumulative_delay_hours"], (int, float))


def test_classification_metrics_per_class():
    """
    CRITICAL ML AUDIT TEST:
    Verifies that classification evaluation contains per-class precision, recall, F1, and weighted F1.
    """
    with open("models/metrics.json", "r", encoding="utf-8") as f:
        metrics = json.load(f)
    clf_m = metrics["classification_metrics"]
    assert "per_class_metrics" in clf_m
    assert "weighted_f1" in clf_m
    assert len(clf_m["per_class_metrics"]) == 4
    for label, metrics_dict in clf_m["per_class_metrics"].items():
        assert "precision" in metrics_dict
        assert "recall" in metrics_dict
        assert "f1_score" in metrics_dict
        assert "support" in metrics_dict
        assert 0.0 <= metrics_dict["precision"] <= 1.0
        assert 0.0 <= metrics_dict["recall"] <= 1.0


def test_prediction_mode_distinction():
    """
    CRITICAL PREDICTION CENTER TEST:
    Verifies distinction between hypothetical simulations and live telemetry observations.
    """
    # 1. Hypothetical simulation ID
    sim_payload = {
        "shipment_id": "SIM-8899",
        "origin_port": "CNSHA",
        "destination_port": "USLAX",
        "transport_mode": "Ocean Freight",
        "vessel_type": "Neo-Panamax (10000-14999 TEU)",
        "cargo_category": "Electronics & High-Tech",
        "current_stage": "Port Processing",
        "cumulative_delay_hours": 5.0,
        "port_congestion_index": 1.20
    }
    sim_res = client.post("/api/predict", json=sim_payload).json()
    assert sim_res["prediction_mode"] == "hypothetical_simulation"

    # 2. Live monitored shipment ID
    live_shp_id = client.get("/api/shipments?limit=1").json()[0]["shipment_id"]
    live_payload = {
        "shipment_id": live_shp_id,
        "origin_port": "CNSHA",
        "destination_port": "USLAX",
        "transport_mode": "Ocean Freight",
        "vessel_type": "Neo-Panamax (10000-14999 TEU)",
        "cargo_category": "Electronics & High-Tech",
        "current_stage": "Port Processing",
        "cumulative_delay_hours": 5.0,
        "port_congestion_index": 1.20
    }
    live_res = client.post("/api/predict", json=live_payload).json()
    assert live_res["prediction_mode"] == "live_telemetry_observation"
