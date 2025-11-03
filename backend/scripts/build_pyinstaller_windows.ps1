# PowerShell script to build a PyInstaller onedir bundle on Windows
# Usage: run from repository root
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root\..\

# Create or reuse a venv in backend/.venv-py
$venvPath = Join-Path (Get-Location) 'backend\.venv-py'
if (-Not (Test-Path $venvPath)) {
    python -m venv $venvPath
}

$activate = Join-Path $venvPath 'Scripts\Activate.ps1'
. $activate

python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
python -m pip install pyinstaller

# Clean previous builds
Remove-Item -Recurse -Force backend\build, backend\dist, backend\__pycache__ -ErrorAction SilentlyContinue

# Run pyinstaller from backend folder
Push-Location backend
pyinstaller --noconfirm --clean --log-level=WARN --onedir --name billing-backend runner.py
Pop-Location

Write-Host "PyInstaller build complete: $(Resolve-Path backend\dist\billing-backend)"

# List files for debugging
Get-ChildItem -Recurse backend\dist\billing-backend | Select-Object FullName, Length | Format-Table -AutoSize

Exit 0
