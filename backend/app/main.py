"""
FastAPI application entrypoint for ShipPredict AI.
Handles lifecycle events, CORS middleware, schema initialization, and database seeding.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.database.connection import engine, Base, SessionLocal
from backend.app.api.endpoints import router as api_router
from backend.app.services.shipment_service import ShipmentService


# Ensure database tables exist and are seeded
Base.metadata.create_all(bind=engine)
with SessionLocal() as db_session:
    ShipmentService(db_session).seed_initial_data_if_empty()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database initialized on startup
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db_session:
        ShipmentService(db_session).seed_initial_data_if_empty()
    yield


app = FastAPI(
    title="ShipPredict AI – Intelligent Shipment ETA Prediction Platform",
    description="Multi-stage logistics delay prediction, non-double-counting delay propagation, and SHAP explainability engine.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API endpoints
app.include_router(api_router, prefix="/api")

# Also mount root /health directly
@app.get("/health")
def root_health():
    return {"status": "ok", "app": "ShipPredict AI"}
