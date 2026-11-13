"""
SQLAlchemy relational entities for shipments, stage events, predictions, and ports.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.database.connection import Base


class ShipmentModel(Base):
    __tablename__ = "shipments"

    shipment_id = Column(String(32), primary_key=True, index=True)
    origin_port = Column(String(10), nullable=False, index=True)
    origin_port_name = Column(String(100), nullable=False)
    destination_port = Column(String(10), nullable=False, index=True)
    destination_port_name = Column(String(100), nullable=False)
    route_distance_nm = Column(Float, nullable=False)
    transport_mode = Column(String(50), default="Ocean Freight")
    vessel_type = Column(String(60), default="Neo-Panamax (10000-14999 TEU)")
    cargo_category = Column(String(60), default="Consumer Goods & Retail")

    scheduled_departure = Column(DateTime, nullable=False)
    scheduled_eta = Column(DateTime, nullable=False)
    predicted_eta = Column(DateTime, nullable=False)
    actual_delivery = Column(DateTime, nullable=True)

    current_stage = Column(String(50), default="Origin Departure")
    current_stage_order = Column(Integer, default=1)
    status = Column(String(30), default="IN_TRANSIT", index=True)  # IN_TRANSIT, DELIVERED, SCHEDULED

    initial_delay_hours = Column(Float, default=0.0)
    cumulative_delay_hours = Column(Float, default=0.0)
    remaining_delay_hours = Column(Float, default=0.0)
    final_delay_hours = Column(Float, default=0.0)
    delay_severity = Column(String(30), default="On Time", index=True)

    port_congestion_index = Column(Float, default=1.15)
    weather_severity_index = Column(Float, default=0.20)
    wind_speed_kmh = Column(Float, default=18.0)
    precipitation_mm = Column(Float, default=2.0)
    total_recovered_hours = Column(Float, default=0.0)
    has_missing_intermediate_events = Column(Boolean, default=False)
    data_source = Column(String(100), default="hybrid_empirical_reconstruction")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    events = relationship("ShipmentEventModel", back_populates="shipment", cascade="all, delete-orphan")
    predictions = relationship("PredictionRecordModel", back_populates="shipment", cascade="all, delete-orphan")


class ShipmentEventModel(Base):
    __tablename__ = "shipment_events"

    event_id = Column(String(64), primary_key=True, index=True)
    shipment_id = Column(String(32), ForeignKey("shipments.shipment_id"), nullable=False, index=True)
    stage_name = Column(String(50), nullable=False)
    stage_order = Column(Integer, nullable=False)
    location = Column(String(50), nullable=False)

    scheduled_start = Column(DateTime, nullable=True)
    scheduled_end = Column(DateTime, nullable=True)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)

    scheduled_duration_hours = Column(Float, default=0.0)
    actual_duration_hours = Column(Float, nullable=True)
    incremental_delay_hours = Column(Float, default=0.0)
    recovered_delay_hours = Column(Float, default=0.0)
    cumulative_delay_hours = Column(Float, default=0.0)

    event_status = Column(String(30), default="COMPLETED")  # COMPLETED, IN_PROGRESS, SCHEDULED
    is_missing = Column(Boolean, default=False)
    data_source = Column(String(60), default="empirical_event_log")

    shipment = relationship("ShipmentModel", back_populates="events")


class PredictionRecordModel(Base):
    __tablename__ = "prediction_history"

    prediction_id = Column(Integer, primary_key=True, autoincrement=True)
    shipment_id = Column(String(32), ForeignKey("shipments.shipment_id"), nullable=False, index=True)
    checkpoint_stage = Column(String(50), nullable=False)
    predicted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    scheduled_eta = Column(DateTime, nullable=False)
    predicted_eta = Column(DateTime, nullable=False)
    predicted_remaining_delay_hours = Column(Float, nullable=False)
    total_predicted_delay_hours = Column(Float, nullable=False)
    predicted_severity = Column(String(30), nullable=False)
    confidence_score = Column(Float, nullable=False)

    explanation_payload = Column(JSON, nullable=True)

    shipment = relationship("ShipmentModel", back_populates="predictions")
