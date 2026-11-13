# ShipPredict AI - Local Development Startup Script (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting ShipPredict AI Platform (Backend & Frontend)    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Start Backend in new PowerShell window or background job
Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\.venv\Scripts\python -m uvicorn backend.app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

# Start Frontend in new PowerShell window
Write-Host "[2/2] Starting Vite Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; node ./node_modules/vite/bin/vite.js --port 3000"

Write-Host "`nShipPredict AI is running!" -ForegroundColor Cyan
Write-Host "  - Frontend Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend REST API:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "  - Health Check:       http://localhost:8000/health" -ForegroundColor White
