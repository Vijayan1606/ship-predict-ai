#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting ShipPredict AI Platform (Backend & Frontend)    "
echo "=========================================================="

echo "[1/2] Starting FastAPI Backend on http://localhost:8000..."
python3 -m uvicorn backend.app.main:app --reload --port 8000 &
BACKEND_PID=$!

echo "[2/2] Starting Vite Frontend on http://localhost:3000..."
cd frontend && npm run dev -- --port 3000 &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
