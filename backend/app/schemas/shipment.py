"""
Pydantic request and response schemas for ShipPredict AI API.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ShipmentCreateSchema(BaseModel):
    shipment_id: Optional[str] = Field(None, description="Unique shipment code (e.g. SHP-2001)")
    origin_port: str = Field(..., description="Origin port UN/LOCODE, e.g. CNSHA")
    destination_port: str = Field(..., description="Destination port UN/LOCODE, e.g. USLAX")
    transport_mode: Optional[str] = "Ocean Freight"
    vessel_type: Optional[str] = "Neo-Panamax (10000-14999 TEU)"
    cargo_category: Optional[str] = "Consumer Goods & Retail"
    scheduled_departure: Optional[datetime] = None
    scheduled_eta: Optional[datetime] = None
    current_stage: Optional[str] = "Origin Departure"
    initial_delay_hours: Optional[float] = 0.0
    port_congestion_index: Optional[float] = None
    weather_severity_index: Optional[float] = None


class PredictRequestSchema(BaseModel):
    shipment_id: Optional[str] = "SHP-SIMULATED"
    origin_port: str = Field("CNSHA", description="Origin port UN/LOCODE")
    destination_port: str = Field("USLAX", description="Destination port UN/LOCODE")
    transport_mode: Optional[str] = "Ocean Freight"
    vessel_type: Optional[str] = "Neo-Panamax (10000-14999 TEU)"
    cargo_category: Optional[str] = "Electronics & High-Tech"
    current_stage: Optional[str] = "Vessel Departure"
    scheduled_departure: Optional[str] = None
    scheduled_eta: Optional[str] = None
    initial_delay_hours: Optional[float] = 0.0
    cumulative_delay_hours: Optional[float] = 0.0
    port_congestion_index: Optional[float] = None
    weather_severity_index: Optional[float] = None
    has_missing_intermediate_events: Optional[bool] = False


class StageEventSchema(BaseModel):
    event_id: str
    shipment_id: str
    stage_name: str
    stage_order: int
    location: str
    scheduled_start: Optional[str]
    scheduled_end: Optional[str]
    actual_start: Optional[str]
    actual_end: Optional[str]
    scheduled_duration_hours: float
    actual_duration_hours: Optional[float]
    incremental_delay_hours: float
    recovered_delay_hours: float
    cumulative_delay_hours: float = 0.0
    event_status: str
    is_missing: bool
    data_source: str


class ShipmentResponseSchema(BaseModel):
    shipment_id: str
    origin_port: str
    origin_port_name: str
    destination_port: str
    destination_port_name: str
    route_distance_nm: float
    transport_mode: str
    vessel_type: str
    cargo_category: str
    scheduled_departure: str
    scheduled_eta: str
    predicted_eta: str
    actual_delivery: Optional[str]
    current_stage: str
    current_stage_order: int
    status: str
    initial_delay_hours: float
    cumulative_delay_hours: float
    remaining_delay_hours: float
    final_delay_hours: float
    delay_severity: str
    port_congestion_index: float
    weather_severity_index: float
    wind_speed_kmh: float
    precipitation_mm: float
    total_recovered_hours: float
    has_missing_intermediate_events: bool
    data_source: str


class PredictionResultSchema(BaseModel):
    shipment_id: str
    prediction_mode: Optional[str] = "hypothetical_simulation"
    current_stage: str
    current_stage_order: int
    scheduled_eta: str
    predicted_eta: str
    current_cumulative_delay_hours: float
    predicted_remaining_delay_hours: float
    total_predicted_final_delay_hours: float
    delay_severity: str
    delay_probability_breakdown: Dict[str, float]
    confidence_score: float
    uncertainty_interval_hours: Dict[str, float]
    uncertainty_reasons: List[str]
    data_quality_indicators: Dict[str, Any]
    downstream_stage_schedule: List[Dict[str, Any]]
    delay_propagation_analysis: Dict[str, Any]
    explainability: Dict[str, Any]
