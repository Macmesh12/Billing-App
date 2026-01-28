#!/usr/bin/env pwsh
Write-Host "Starting Billing App Backend Server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Make sure Python is installed and virtual environment is set up." -ForegroundColor Yellow
Write-Host ""

Set-Location "$PSScriptRoot\backend"

# Check if virtual environment exists
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & .venv\Scripts\Activate.ps1
} else {
    Write-Host "Virtual environment not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To set up the backend:" -ForegroundColor Yellow
    Write-Host "1. Install Python 3.10 or higher"
    Write-Host "2. Run: python -m venv .venv"
    Write-Host "3. Run: .venv\Scripts\Activate.ps1"
    Write-Host "4. Run: pip install -r requirements.txt"
    Write-Host "5. Run: python manage.py migrate"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting Django server on http://127.0.0.1:8765" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

python manage.py runserver 127.0.0.1:8765
