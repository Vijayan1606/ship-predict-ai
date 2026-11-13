# ShipPredict AI – Intelligent Shipment ETA Prediction & Delay Propagation Platform

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0+-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Pytest-14%2F14%20Passed-emerald.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Technical Take-Home Assignment for the AI Internship at Aiqon AI**  
> A complete, production-grade, end-to-end logistics intelligence platform that predicts shipment arrival times, estimates multi-tier delay probabilities, isolates stage-level disruption causes using SHAP, and accurately models delay propagation across multi-stage international transport lifecycles **without double-counting**.

---

## Key Highlights & Core Objectives

1. **Intelligent ETA Prediction & Uncertainty:** Calculates predicted final arrival timestamps ($\text{Predicted ETA} = \text{Reference Time} + \text{Remaining Duration}$) along with statistical confidence scores and uncertainty intervals.
2. **Dedicated Delay Propagation Engine:** Strictly prevents double-counting upstream delays. Distinguishes initial origin slips, stage incremental disruptions, buffer absorption, captain speed recoveries, and compound downstream queue risks.
3. **Real-World Empirical Datasets & Live Weather:** Grounded in genuine World Bank Container Port Performance Index (CPPI) turnaround times, UNCTAD/NOAA verified maritime nautical lanes, and live Open-Meteo marine weather queries (with offline caching and seasonal climatology fallbacks).
4. **Machine Learning & Delay Severity Classification:** Compares baseline Linear Regression against Random Forest, Gradient Boosting, and HistGradientBoosting using chronological out-of-time splits (no leakage). Features an operational 4-tier delay classifier (*On Time*, *Minor*, *Moderate*, *Severe*).
5. **Explainable AI (SHAP):** Transparent attribution of delay contributors (port congestion, customs risk, marine winds) vs. mitigating buffer factors with clear natural language narratives for logistics operators.
6. **Full-Stack Production System:** Python 3.11 + FastAPI backend with relational SQLite/PostgreSQL abstraction, paired with a React 19 + TypeScript + Vite + Tailwind CSS dashboard.

---

## System Architecture

```
                    +--------------------------------------------+
                    |        Real Public Datasets & APIs         |
                    |  - Open-Meteo Marine Weather API           |
                    |  - World Bank CPPI (Port Dwell Times)      |
                    |  - UNCTAD & NOAA Maritime Lane Distances   |
                    +--------------------------------------------+
                                          |
                                          v
                    +--------------------------------------------+
                    |        Data Ingestion & Verification       |
                    |  - UN/LOCODE Schema Validation             |
                    |  - Missing Event & Telemetry Gap Detection |
                    |  - Offline Climatological Fallbacks        |
                    +--------------------------------------------+
                                          |
                                          v
                    +--------------------------------------------+
                    |       Delay Propagation & Calculus         |
                    |  - Incremental Delay: Δ_inc = Act - Sched  |
                    |  - Buffer & Steaming Speed Recovery        |
                    |  - Non-Double-Counting Invariant           |
                    +--------------------------------------------+
                                          |
                                          v
                    +--------------------------------------------+
                    |           ML Feature Engineering           |
                    |  - 16 Numerical + Categorical + Cross-Terms|
                    |  - Chronological 80/20 Train/Test Splitting|
                    +--------------------------------------------+
                                          |
                                          v
                    +--------------------------------------------+
                    |          ML Prediction & XAI Engine        |
                    |  - Remaining Delay Regressors              |
                    |  - Operational Severity Classifier         |
                    |  - SHAP Explainer (Waterfall Attributions) |
                    +--------------------------------------------+
                                          |
                                          v
                    +--------------------------------------------+
                    |            FastAPI REST Backend            |
                    |  - SQLite / PostgreSQL with SQLAlchemy     |
                    |  - 12 Production REST Endpoints            |
                    +--------------------------------------------+
                                          |
                                          v
                    +--------------------------------------------+
                    |        React 19 / TypeScript Dashboard     |
                    |  - Executive Overview & Metrics            |
                    |  - Fleet Monitoring Table & Filters        |
                    |  - 7-Stage Detailed Journey Timeline       |
                    |  - Interactive Scenario Prediction Center  |
                    |  - Model Benchmarks & Confusion Matrix     |
                    |  - Data Source Registry & Data Dictionary  |
                    +--------------------------------------------+
```

---

## The 7-Stage Transportation Journey Model

Shipments are modeled as a flexible sequence of 7 transportation stages:

| Stage # | Stage Name | Typical Disruptions & Recoveries |
| :---: | :--- | :--- |
| **1** | **Origin Departure** | Drayage cutoff slips, container gate-in delays, billing/paperwork holds. |
| **2** | **Vessel Departure** | Berth congestion, pilotage queues, harbor tug availability, tidal windows. |
| **3** | **Intermediate Port / Transit** | Open ocean wind resistance, swell speed reduction, canal transits (Suez/Panama), captain speed acceleration recovery. |
| **4** | **Port Processing** | Quayside crane productivity, yard terminal dwell time, discharge bottlenecks. |
| **5** | **Customs Clearance** | Commodity risk inspections, document holds, quarantine checks. |
| **6** | **Destination Port Departure**| Terminal gate-out delays, intermodal rail transfer, chassis shortages. |
| **7** | **Final Delivery** | Last-mile drayage congestion, consignee appointment scheduling. |

---

## Delay Propagation Calculus (Strict Elimination of Double-Counting)

For each stage $i$:
$$\Delta_{incremental, i} = \max(0, D_i^{actual} - D_i^{scheduled})$$
$$\text{Recovery}_i = \max(0, D_i^{scheduled} - D_i^{actual})$$
$$\Delta_{departure, i} = \Delta_{arrival, i} + \Delta_{incremental, i} - \text{Recovery}_i$$

Upstream departure delays are passed forward as arrival shifts entering the next stage, but only **internal incremental stage duration variances** alter the cumulative delay trajectory:
$$\Delta_{cumulative, k} = \Delta_{origin\_dep} + \sum_{j=1}^k \Delta_{incremental, j} - \sum_{j=1}^k \text{Recovery}_j$$

This mathematical identity guarantees that delays are never double-counted.

---

## Model Evaluation & Empirical Results

Evaluated across an out-of-time chronological test split (1,200 training shipments Jan–Sep 2024; 300 test shipments Oct–Nov 2024):

### Regression Models (Target: Remaining Delay in Hours)

| Model | Test MAE (h) | Test RMSE (h) | Test $R^2$ | Median AE (h) | Operational Note |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Linear Regression (Baseline)** | **8.632** | **12.889** | **0.3119** | **5.686** | **Optimal Out-of-Time Generalizer (Active Serving)** |
| **HistGradientBoosting Regressor** | 9.220 | 12.836 | 0.3175 | 7.163 | Robust to non-linear interactions |
| **Gradient Boosting Regressor** | 9.936 | 14.251 | 0.1587 | 6.203 | Tree ensemble benchmark |
| **Random Forest Regressor** | 10.115 | 14.080 | 0.1788 | 6.889 | High-depth tree baseline |

### Delay Classification (Random Forest Classifier)
- **Accuracy:** **71.3%**
- **Macro F1-Score:** **0.717**
- **Operational Tiers:**
  - *On Time:* $\le 0.0$ hours
  - *Minor Delay:* $0.0 < x \le 6.0$ hours
  - *Moderate Delay:* $6.0 < x \le 24.0$ hours
  - *Severe Delay:* $> 24.0$ hours

---

## Technology Stack

- **Backend:** Python 3.11, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, SQLite (or PostgreSQL via `DATABASE_URL`).
- **Machine Learning & XAI:** scikit-learn, NumPy, Pandas, SHAP, Joblib.
- **Frontend Dashboard:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide React, Axios.
- **Testing:** Pytest (14/14 unit and integration tests passing).
- **Deployment:** Docker, Docker Compose.

---

## Quickstart & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone & Set Up Python Virtual Environment
```bash
# Clone the repository
git clone https://github.com/your-org/ship-predict-ai.git
cd "ShipPredict AI"

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate

# On Linux / macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 2. Set Up Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Run the Automated Test Suite (14 Tests)
```bash
# Run all unit and integration tests
python -m pytest backend/tests/test_all.py -v
```

### 4. (Optional) Retrain Machine Learning Models
```bash
# Regenerates data and saves models to models/
python -m backend.ml.training.train
```

### 5. Start the Application

#### Option A: Quick Script (PowerShell / Bash)
- **Windows:** Run `.\scripts\start.ps1`
- **Linux / macOS:** Run `bash scripts/start.sh`

#### Option B: Manual Startup
Terminal 1 (Backend):
```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```
Terminal 2 (Frontend):
```bash
cd frontend
npm run dev -- --port 3000
```

Open your browser at:
- **Interactive Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## Docker & Container Deployment

To launch the complete application with Docker Compose:

```bash
docker-compose up --build
```
- Frontend will be accessible at `http://localhost:3000`
- Backend API will be accessible at `http://localhost:8000`

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `GET` | `/health` | Application status and uptime check |
| `GET` | `/api/overview` | Executive KPI aggregations, delay distribution, route performance |
| `GET` | `/api/shipments` | Query shipment fleet with search and multi-criteria filters |
| `GET` | `/api/shipments/{id}` | Full shipment record details |
| `GET` | `/api/shipments/{id}/timeline` | Chronological 7-stage event breakdown & stage-level delays |
| `GET` | `/api/shipments/{id}/explanation`| SHAP feature attribution & positive/recovery factors |
| `POST`| `/api/predict` | Interactive prediction for any shipment checkpoint |
| `POST`| `/api/shipments` | Register a new shipment for monitoring |
| `GET` | `/api/model/metrics` | Model comparison table, classification metrics, confusion matrix |
| `GET` | `/api/model/feature-importance`| Global normalized feature importances |
| `GET` | `/api/data/sources` | Public dataset registry & technical data dictionary |
| `GET` | `/api/data/status` | Live external API connectivity status & indexed counts |
| `GET` | `/api/ports` | Registered world ports database (coordinates & CPPI tiers) |

---

## Verification & Testing Evidence

All 14 unit and integration tests execute successfully:

```
backend/tests/test_all.py::test_port_database_validity PASSED            [  7%]
backend/tests/test_all.py::test_maritime_distance_calculation PASSED     [ 14%]
backend/tests/test_all.py::test_weather_connector_offline_fallback PASSED [ 21%]
backend/tests/test_all.py::test_weather_severity_bounds PASSED           [ 28%]
backend/tests/test_all.py::test_delay_propagation_no_double_counting PASSED [ 35%]
backend/tests/test_all.py::test_delay_recovery_mechanism PASSED          [ 42%]
backend/tests/test_all.py::test_feature_engineering_pipeline PASSED      [ 50%]
backend/tests/test_all.py::test_saved_model_metrics PASSED               [ 57%]
backend/tests/test_all.py::test_prediction_service PASSED                [ 64%]
backend/tests/test_all.py::test_health_endpoint PASSED                   [ 71%]
backend/tests/test_all.py::test_shipments_api PASSED                     [ 78%]
backend/tests/test_all.py::test_overview_metrics_api PASSED              [ 85%]
backend/tests/test_all.py::test_predict_api_endpoint PASSED              [ 92%]
backend/tests/test_all.py::test_data_sources_api PASSED                  [100%]

======================== 14 passed in 5.91s ========================
```

---

## Technical Report

For in-depth analysis of the delay propagation calculus, feature sensitivity, scientific assumptions, predictive association vs. causality, and future enhancements, see:
[`docs/TECHNICAL_REPORT.md`](file:///c:/Users/vijay/Downloads/ShipPredict%20AI%20%E2%80%93%20Intelligent%20Shipment%20ETA%20Prediction%20&%20Delay%20Propagation%20System/docs/TECHNICAL_REPORT.md).

---

## License

This project was built for the Aiqon AI Internship technical assessment and is available under the MIT License.
