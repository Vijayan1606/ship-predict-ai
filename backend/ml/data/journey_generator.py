"""
Shipment Journey Reconstruction and Synthetic Historical Dataset Generator.
Combines real-world ports, maritime route distances, and Open-Meteo meteorological conditions
into high-fidelity, multi-stage shipment journeys with realistic delay propagation dynamics.
"""

import os
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple

from backend.ml.data.ports_data import PORTS_DATABASE, get_maritime_distance_nm
from backend.ml.ingestion.weather_connector import WeatherConnector
from backend.ml.propagation.engine import StageDelayRecord, DelayPropagationEngine

STAGES_ORDER = [
    ("Origin Departure", 1),
    ("Vessel Departure", 2),
    ("Intermediate Port Arrival", 3),
    ("Port Processing", 4),
    ("Customs Clearance", 5),
    ("Destination Port Departure", 6),
    ("Final Delivery", 7),
]

VESSEL_CLASSES = [
    {"type": "ULCV (18000+ TEU)", "speed_knots": 19.5, "berth_hours_mult": 1.3},
    {"type": "Neo-Panamax (10000-14999 TEU)", "speed_knots": 20.0, "berth_hours_mult": 1.1},
    {"type": "Post-Panamax (5000-9999 TEU)", "speed_knots": 21.0, "berth_hours_mult": 1.0},
    {"type": "Feeder (<3000 TEU)", "speed_knots": 17.0, "berth_hours_mult": 0.8},
]

CARGO_CATEGORIES = [
    {"category": "Electronics & High-Tech", "customs_risk": "low", "priority": "high"},
    {"category": "Consumer Goods & Retail", "customs_risk": "low", "priority": "standard"},
    {"category": "Automotive Parts & Machinery", "customs_risk": "medium", "priority": "high"},
    {"category": "Chemicals & Dangerous Goods", "customs_risk": "high", "priority": "regulated"},
    {"category": "Refrigerated Perishables (Reefer)", "customs_risk": "medium", "priority": "express"},
]

POPULAR_TRADE_LANES = [
    ("CNSHA", "USLAX"),
    ("CNSHA", "USLGB"),
    ("CNSHA", "NLRTM"),
    ("CNSHA", "AEJEA"),
    ("CNNGB", "USLAX"),
    ("CNSZX", "NLRTM"),
    ("SGSIN", "NLRTM"),
    ("SGSIN", "USNYC"),
    ("KRPUS", "USLAX"),
    ("NLRTM", "USNYC"),
    ("NLRTM", "USSAV"),
    ("AEJEA", "INNSA"),
    ("LKCMB", "SGSIN"),
    ("INNSA", "NLRTM"),
    ("BRSSZ", "NLRTM"),
]


def generate_shipment_dataset(
    num_shipments: int = 1500,
    seed: int = 42,
    output_dir: str = "data/processed"
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generates a realistic historical dataset of shipments and associated sequence of events.
    Anchor points are based on real ports, nautical distances, and meteorological variations.
    """
    random.seed(seed)
    np.random.seed(seed)

    weather_conn = WeatherConnector()
    propagation_engine = DelayPropagationEngine()

    start_date = datetime(2024, 1, 1, 8, 0, tzinfo=timezone.utc)
    shipments_data: List[Dict[str, Any]] = []
    events_data: List[Dict[str, Any]] = []

    port_codes = list(PORTS_DATABASE.keys())

    for i in range(1, num_shipments + 1):
        shipment_id = f"SHP-{1000 + i}"

        # 70% trade lane from popular corridors, 30% random port pair
        if random.random() < 0.70:
            origin_code, dest_code = random.choice(POPULAR_TRADE_LANES)
        else:
            origin_code = random.choice(port_codes)
            dest_code = random.choice([p for p in port_codes if p != origin_code])

        origin_port = PORTS_DATABASE[origin_code]
        dest_port = PORTS_DATABASE[dest_code]

        distance_nm = get_maritime_distance_nm(origin_code, dest_code)
        vessel = random.choice(VESSEL_CLASSES)
        cargo = random.choice(CARGO_CATEGORIES)

        # Baseline sailing hours based on distance and vessel speed
        sailing_hours = distance_nm / vessel["speed_knots"]

        # Departure date distributed across 2024
        day_offset = random.randint(0, 310)
        hour_offset = random.randint(0, 23)
        sched_origin_dep = start_date + timedelta(days=day_offset, hours=hour_offset)

        # Weather query for origin & destination
        origin_weather = weather_conn.get_port_weather(
            origin_code, origin_port["latitude"], origin_port["longitude"], origin_port["region"]
        )
        dest_weather = weather_conn.get_port_weather(
            dest_code, dest_port["latitude"], dest_port["longitude"], dest_port["region"]
        )
        avg_weather_severity = round(
            (origin_weather["weather_severity_index"] + dest_weather["weather_severity_index"]) / 2.0, 3
        )

        # Port congestion indices
        origin_congestion = round(origin_port["congestion_factor_base"] * random.uniform(0.90, 1.25), 2)
        dest_congestion = round(dest_port["congestion_factor_base"] * random.uniform(0.90, 1.35), 2)

        # Stage scheduled durations (hours)
        durations_sched = {
            1: round(random.uniform(8.0, 18.0), 1),    # Origin Departure (drayage/loading)
            2: round(random.uniform(12.0, 24.0), 1),   # Vessel Departure (berth/pilotage)
            3: round(sailing_hours, 1),                # Sailing to Intermediate / Destination Port
            4: round(dest_port["baseline_dwell_hours"] * 0.75, 1), # Port Processing / Discharge
            5: round(random.uniform(12.0, 36.0), 1),   # Customs Clearance
            6: round(random.uniform(8.0, 20.0), 1),    # Destination Port Departure (gate-out)
            7: round(random.uniform(6.0, 24.0), 1),    # Final Delivery (last-mile transit)
        }

        # Build scheduled timeline
        sched_times = {}
        curr_sched = sched_origin_dep
        for stage_name, order in STAGES_ORDER:
            sched_start = curr_sched
            sched_end = sched_start + timedelta(hours=durations_sched[order])
            sched_times[order] = (sched_start, sched_end)
            curr_sched = sched_end

        scheduled_final_eta = sched_times[7][1]

        # Simulate Actual timeline with realistic disruptions
        stage_records: List[StageDelayRecord] = []
        curr_actual = sched_origin_dep

        # 1. Origin departure delay (lognormal: mostly small 0-4h, occasionally 12-36h)
        if random.random() < 0.40:
            origin_delay_hours = round(random.lognormvariate(1.2, 0.7), 1)
        else:
            origin_delay_hours = round(random.uniform(-1.0, 1.5), 1)

        curr_actual = curr_actual + timedelta(hours=origin_delay_hours)

        # Simulate full ground truth journey across all 7 stages
        full_actual_stages: List[StageDelayRecord] = []
        missing_stage_order = None
        if random.random() < 0.06:
            missing_stage_order = random.choice([3, 4, 5])

        for stage_name, order in STAGES_ORDER:
            s_start, s_end = sched_times[order]
            is_missing = (order == missing_stage_order)
            act_start = curr_actual
            stage_sched_dur = durations_sched[order]
            incremental_disruption = 0.0

            if order == 1:
                # Origin gate-in / drayage disruption
                incremental_disruption = 0.0
            elif order == 2:
                # Vessel departure berth congestion
                if origin_congestion > 1.2 or random.random() < 0.25:
                    incremental_disruption += round(random.expovariate(0.25), 1)
            elif order == 3:
                # Ocean Transit: weather and route distance
                if avg_weather_severity > 0.35:
                    incremental_disruption += round(avg_weather_severity * random.uniform(10.0, 36.0), 1)
                # Vessel speed recovery: if delayed, captain may steam faster to recover up to 10%
                if origin_delay_hours > 6.0 and random.random() < 0.50:
                    recovery_amount = min(stage_sched_dur * 0.08, origin_delay_hours * 0.4)
                    incremental_disruption -= round(recovery_amount, 1)
            elif order == 4:
                # Port Processing: strongly driven by destination port congestion
                congestion_mult = max(dest_congestion - 1.0, 0.0)
                if congestion_mult > 0.15:
                    incremental_disruption += round(congestion_mult * stage_sched_dur * random.uniform(0.5, 1.2), 1)
            elif order == 5:
                # Customs clearance: inspection probability
                inspection_prob = 0.25 if cargo["customs_risk"] == "high" else (0.12 if cargo["customs_risk"] == "medium" else 0.04)
                if random.random() < inspection_prob:
                    incremental_disruption += round(random.uniform(16.0, 52.0), 1)
            elif order == 6:
                # Gate-out & chassis availability
                if random.random() < 0.20:
                    incremental_disruption += round(random.uniform(4.0, 16.0), 1)
            elif order == 7:
                # Last-mile delivery
                if random.random() < 0.18:
                    incremental_disruption += round(random.uniform(3.0, 12.0), 1)

            actual_duration = max(stage_sched_dur + incremental_disruption, 1.0)
            act_end = act_start + timedelta(hours=actual_duration)
            curr_actual = act_end

            full_actual_stages.append(
                StageDelayRecord(
                    stage_name=stage_name,
                    stage_order=order,
                    scheduled_start=s_start,
                    scheduled_end=s_end,
                    actual_start=act_start,
                    actual_end=act_end,
                    status="COMPLETED",
                    missing=is_missing
                )
            )

        # Ground truth final delivery delay
        ground_truth_final_delivery_time = full_actual_stages[6].actual_end
        ground_truth_final_delay_hours = round(
            (ground_truth_final_delivery_time - scheduled_final_eta).total_seconds() / 3600.0, 2
        )

        # Sample observation checkpoint stage (from 1 to 7)
        # 15% stage 1, 15% stage 2, 20% stage 3, 20% stage 4, 15% stage 5, 10% stage 6, 5% stage 7
        checkpoint_stage = random.choices([1, 2, 3, 4, 5, 6, 7], weights=[0.15, 0.15, 0.20, 0.20, 0.15, 0.10, 0.05])[0]

        # Build observed stages up to checkpoint
        observed_stage_records: List[StageDelayRecord] = []
        for stage in full_actual_stages:
            order = stage.stage_order
            s_start, s_end = sched_times[order]
            is_missing = (order == missing_stage_order)

            if order < checkpoint_stage:
                observed_stage_records.append(
                    StageDelayRecord(
                        stage_name=stage.stage_name,
                        stage_order=order,
                        scheduled_start=s_start,
                        scheduled_end=s_end,
                        actual_start=None if is_missing else stage.actual_start,
                        actual_end=None if is_missing else stage.actual_end,
                        status="COMPLETED",
                        missing=is_missing
                    )
                )
            elif order == checkpoint_stage and checkpoint_stage < 7:
                # Stage currently in progress
                observed_stage_records.append(
                    StageDelayRecord(
                        stage_name=stage.stage_name,
                        stage_order=order,
                        scheduled_start=s_start,
                        scheduled_end=s_end,
                        actual_start=stage.actual_start,
                        actual_end=None,
                        status="IN_PROGRESS",
                        missing=False
                    )
                )
            elif order == checkpoint_stage and checkpoint_stage == 7:
                # Fully completed journey
                observed_stage_records.append(
                    StageDelayRecord(
                        stage_name=stage.stage_name,
                        stage_order=order,
                        scheduled_start=s_start,
                        scheduled_end=s_end,
                        actual_start=stage.actual_start,
                        actual_end=stage.actual_end,
                        status="COMPLETED",
                        missing=False
                    )
                )
            else:
                # Future scheduled stage
                observed_stage_records.append(
                    StageDelayRecord(
                        stage_name=stage.stage_name,
                        stage_order=order,
                        scheduled_start=s_start,
                        scheduled_end=s_end,
                        actual_start=None,
                        actual_end=None,
                        status="SCHEDULED",
                        missing=False
                    )
                )

        # Analyze delay propagation from current checkpoint
        analysis = propagation_engine.analyze_journey(
            stages=observed_stage_records,
            current_stage_order=checkpoint_stage,
            remaining_stages_count=7 - checkpoint_stage,
            port_congestion_factor=dest_congestion,
            weather_severity=avg_weather_severity
        )

        current_stage_name = [s[0] for s in STAGES_ORDER if s[1] == checkpoint_stage][0]
        current_cum_delay = analysis["current_cumulative_delay_hours"]

        # Target variable: true remaining delay from checkpoint to destination
        remaining_delay_hours = max(0.0, round(ground_truth_final_delay_hours - current_cum_delay, 2))
        final_delay_hours = round(current_cum_delay + remaining_delay_hours, 2)
        predicted_final_eta = scheduled_final_eta + timedelta(hours=final_delay_hours)

        # Delay Severity Classification (Section 9)
        # On Time: <= 0h, Minor Delay: 0 to 6h, Moderate Delay: 6 to 24h, Severe Delay: > 24h
        if final_delay_hours <= 0.0:
            delay_severity = "On Time"
        elif final_delay_hours <= 6.0:
            delay_severity = "Minor Delay"
        elif final_delay_hours <= 24.0:
            delay_severity = "Moderate Delay"
        else:
            delay_severity = "Severe Delay"

        shipment_record = {
            "shipment_id": shipment_id,
            "origin_port": origin_code,
            "origin_port_name": origin_port["name"],
            "destination_port": dest_code,
            "destination_port_name": dest_port["name"],
            "route_distance_nm": distance_nm,
            "transport_mode": "Ocean Express" if "Express" in cargo["priority"] else "Ocean Freight",
            "vessel_type": vessel["type"],
            "cargo_category": cargo["category"],
            "scheduled_departure": sched_origin_dep.isoformat(),
            "scheduled_eta": scheduled_final_eta.isoformat(),
            "predicted_eta": predicted_final_eta.isoformat(),
            "actual_delivery": ground_truth_final_delivery_time.isoformat() if checkpoint_stage == 7 else None,
            "current_stage": current_stage_name,
            "current_stage_order": checkpoint_stage,
            "status": "DELIVERED" if checkpoint_stage == 7 else "IN_TRANSIT",
            "initial_delay_hours": analysis["initial_delay_hours"],
            "cumulative_delay_hours": current_cum_delay,
            "remaining_delay_hours": remaining_delay_hours,
            "final_delay_hours": final_delay_hours,
            "delay_severity": delay_severity,
            "port_congestion_index": dest_congestion,
            "weather_severity_index": avg_weather_severity,
            "wind_speed_kmh": round((origin_weather["wind_speed_kmh"] + dest_weather["wind_speed_kmh"]) / 2.0, 1),
            "precipitation_mm": round((origin_weather["precipitation_mm"] + dest_weather["precipitation_mm"]) / 2.0, 1),
            "total_recovered_hours": analysis["total_recovered_hours"],
            "has_missing_intermediate_events": analysis["has_missing_intermediate_events"],
            "data_source": "hybrid_empirical_reconstruction"
        }
        shipments_data.append(shipment_record)

        # Store individual stage events with stage-level cumulative delay tracking
        running_stage_delay = analysis["initial_delay_hours"]
        for rec in observed_stage_records:
            if rec.status == "COMPLETED":
                running_stage_delay += (rec.incremental_delay_hours - rec.recovered_delay_hours)
                event_cum_delay = round(running_stage_delay, 2)
            elif rec.status == "IN_PROGRESS":
                event_cum_delay = round(rec.arrival_delay_hours, 2)
            else:
                event_cum_delay = current_cum_delay

            events_data.append({
                "shipment_id": shipment_id,
                "event_id": f"EVT-{shipment_id}-{rec.stage_order}",
                "stage_name": rec.stage_name,
                "stage_order": rec.stage_order,
                "location": origin_code if rec.stage_order <= 2 else (dest_code if rec.stage_order >= 4 else "International Waters"),
                "scheduled_start": rec.scheduled_start.isoformat() if rec.scheduled_start else None,
                "scheduled_end": rec.scheduled_end.isoformat() if rec.scheduled_end else None,
                "actual_start": rec.actual_start.isoformat() if rec.actual_start else None,
                "actual_end": rec.actual_end.isoformat() if rec.actual_end else None,
                "scheduled_duration_hours": rec.scheduled_duration_hours,
                "actual_duration_hours": rec.actual_duration_hours,
                "incremental_delay_hours": rec.incremental_delay_hours,
                "recovered_delay_hours": rec.recovered_delay_hours,
                "cumulative_delay_hours": event_cum_delay,
                "event_status": rec.status,
                "is_missing": rec.missing,
                "data_source": "empirical_event_log"
            })

    df_shipments = pd.DataFrame(shipments_data)
    df_events = pd.DataFrame(events_data)

    os.makedirs(output_dir, exist_ok=True)
    shipments_csv = os.path.join(output_dir, "shipments.csv")
    events_csv = os.path.join(output_dir, "events.csv")

    df_shipments.to_csv(shipments_csv, index=False)
    df_events.to_csv(events_csv, index=False)

    return df_shipments, df_events


if __name__ == "__main__":
    df_s, df_e = generate_shipment_dataset()
    print(f"Generated {len(df_s)} shipments and {len(df_e)} journey events.")
