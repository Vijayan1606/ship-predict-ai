"""
Delay Propagation Engine for ShipPredict AI.

Distinguishes:
1. Initial origin departure delay.
2. Stage-level scheduled duration vs. actual duration.
3. Stage incremental delay (net disruption occurring within the stage).
4. Propagated delay (upstream shift transmitted downstream).
5. Recovered delay (time gained via expedited processing or buffer absorption).
6. Remaining expected delay to final delivery.

Strictly avoids double-counting upstream delays by tracking incremental stage duration
variance (Delta_stage = Actual_Duration - Scheduled_Duration).
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class StageDelayRecord:
    def __init__(
        self,
        stage_name: str,
        stage_order: int,
        scheduled_start: Optional[datetime],
        scheduled_end: Optional[datetime],
        actual_start: Optional[datetime],
        actual_end: Optional[datetime],
        status: str = "COMPLETED",
        missing: bool = False
    ):
        self.stage_name = stage_name
        self.stage_order = stage_order
        self.scheduled_start = scheduled_start
        self.scheduled_end = scheduled_end
        self.actual_start = actual_start
        self.actual_end = actual_end
        self.status = status
        self.missing = missing

        # Durations in hours
        self.scheduled_duration_hours: float = 0.0
        self.actual_duration_hours: Optional[float] = None
        self.arrival_delay_hours: float = 0.0
        self.departure_delay_hours: float = 0.0
        self.incremental_delay_hours: float = 0.0
        self.recovered_delay_hours: float = 0.0

        self.calculate_metrics()

    def calculate_metrics(self):
        if self.scheduled_start and self.scheduled_end:
            self.scheduled_duration_hours = max(
                (self.scheduled_end - self.scheduled_start).total_seconds() / 3600.0, 0.0
            )

        if self.actual_start and self.scheduled_start:
            self.arrival_delay_hours = round(
                (self.actual_start - self.scheduled_start).total_seconds() / 3600.0, 2
            )

        if self.actual_start and self.actual_end:
            self.actual_duration_hours = max(
                (self.actual_end - self.actual_start).total_seconds() / 3600.0, 0.0
            )
            # Incremental delay = actual duration - scheduled duration
            raw_incremental = self.actual_duration_hours - self.scheduled_duration_hours
            if raw_incremental < 0:
                self.incremental_delay_hours = 0.0
                self.recovered_delay_hours = round(abs(raw_incremental), 2)
            else:
                self.incremental_delay_hours = round(raw_incremental, 2)
                self.recovered_delay_hours = 0.0

            if self.scheduled_end:
                self.departure_delay_hours = round(
                    (self.actual_end - self.scheduled_end).total_seconds() / 3600.0, 2
                )
        elif self.actual_start and self.scheduled_end:
            # Stage currently in-progress
            self.departure_delay_hours = self.arrival_delay_hours

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stage_name": self.stage_name,
            "stage_order": self.stage_order,
            "status": self.status,
            "missing": self.missing,
            "scheduled_start": self.scheduled_start.isoformat() if self.scheduled_start else None,
            "scheduled_end": self.scheduled_end.isoformat() if self.scheduled_end else None,
            "actual_start": self.actual_start.isoformat() if self.actual_start else None,
            "actual_end": self.actual_end.isoformat() if self.actual_end else None,
            "scheduled_duration_hours": round(self.scheduled_duration_hours, 2),
            "actual_duration_hours": round(self.actual_duration_hours, 2) if self.actual_duration_hours is not None else None,
            "arrival_delay_hours": self.arrival_delay_hours,
            "departure_delay_hours": self.departure_delay_hours,
            "incremental_delay_hours": self.incremental_delay_hours,
            "recovered_delay_hours": self.recovered_delay_hours,
        }


class DelayPropagationEngine:
    """
    Dedicated Delay Propagation and Recovery Engine for multi-stage shipment journeys.
    Configurable parameters allow simulation and policy evaluation.
    """

    def __init__(
        self,
        buffer_absorption_rate: float = 0.15,
        downstream_coupling_factor: float = 0.85,
        default_contingency_buffer_hours: float = 4.0
    ):
        """
        :param buffer_absorption_rate: Fraction of delay absorbed by planned operational slack per downstream stage.
        :param downstream_coupling_factor: Degree to which upstream vessel delay triggers berth/queue loss downstream.
        :param default_contingency_buffer_hours: Standard buffer built into final delivery schedules.
        """
        self.buffer_absorption_rate = buffer_absorption_rate
        self.downstream_coupling_factor = downstream_coupling_factor
        self.default_contingency_buffer_hours = default_contingency_buffer_hours

    def analyze_journey(
        self,
        stages: List[StageDelayRecord],
        current_stage_order: int,
        remaining_stages_count: int,
        port_congestion_factor: float = 1.0,
        weather_severity: float = 0.0
    ) -> Dict[str, Any]:
        """
        Reconstructs the full delay propagation history and calculates:
        - Initial delay
        - Stage incremental disruptions
        - Total recovered hours
        - Net cumulative delay at current stage
        - Propagated downstream delay
        - Expected final delay
        """
        observed_stages = [s for s in stages if s.stage_order <= current_stage_order and not s.missing]
        missing_stages = [s for s in stages if s.stage_order <= current_stage_order and s.missing]

        initial_delay = 0.0
        total_incremental_delay = 0.0
        total_recovered = 0.0
        last_observed_departure_delay = 0.0

        stage_breakdown = []

        for stage in stages:
            stage_dict = stage.to_dict()
            if stage.stage_order == 1:
                initial_delay = stage.departure_delay_hours

            if stage.stage_order <= current_stage_order:
                total_incremental_delay += stage.incremental_delay_hours
                total_recovered += stage.recovered_delay_hours
                if stage.actual_end is not None:
                    last_observed_departure_delay = stage.departure_delay_hours
                elif stage.actual_start is not None:
                    last_observed_departure_delay = stage.arrival_delay_hours

            stage_breakdown.append(stage_dict)

        # Net cumulative delay at the current checkpoint
        current_cumulative_delay = round(last_observed_departure_delay, 2)

        # Calculate downstream propagation for uncompleted stages
        # Downstream stages experience:
        # 1. Direct upstream transmission (attenuated slightly by buffer absorption)
        # 2. Risk of missed berthing window / customs bottleneck if upstream delay is large
        buffer_recovery_potential = round(
            remaining_stages_count * self.buffer_absorption_rate * 6.0, 2
        )

        # Non-linear congestion multiplier: if vessel is delayed entering congested port, wait time escalates
        congestion_penalty = 0.0
        if current_cumulative_delay > 12.0 and port_congestion_factor > 1.2:
            congestion_penalty = round((port_congestion_factor - 1.0) * 8.0, 2)

        weather_penalty = round(weather_severity * 6.0, 2)

        expected_downstream_incremental = max(
            0.0,
            congestion_penalty + weather_penalty - buffer_recovery_potential
        )

        predicted_remaining_additional_delay = round(expected_downstream_incremental, 2)
        predicted_total_final_delay = round(
            max(0.0, current_cumulative_delay + predicted_remaining_additional_delay), 2
        )

        return {
            "current_stage_order": current_stage_order,
            "remaining_stages_count": remaining_stages_count,
            "initial_delay_hours": round(initial_delay, 2),
            "total_incremental_stage_delay_hours": round(total_incremental_delay, 2),
            "total_recovered_hours": round(total_recovered, 2),
            "current_cumulative_delay_hours": current_cumulative_delay,
            "downstream_buffer_absorption_hours": buffer_recovery_potential,
            "downstream_congestion_penalty_hours": congestion_penalty,
            "downstream_weather_penalty_hours": weather_penalty,
            "predicted_remaining_additional_delay_hours": predicted_remaining_additional_delay,
            "predicted_total_final_delay_hours": predicted_total_final_delay,
            "missing_intermediate_events_count": len(missing_stages),
            "has_missing_intermediate_events": len(missing_stages) > 0,
            "stage_breakdown": stage_breakdown
        }
