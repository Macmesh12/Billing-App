#!/usr/bin/env bash
# Minimal PyInstaller build script for CI (Linux). Produces a onedir build
# at backend/dist/billing-backend which we then copy into the electron packaging
# workspace.
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

# Ensure virtualenv present and use it to get a reproducible build
python3 -m venv .venv-py || true
source .venv-py/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

# Remove previous builds
rm -rf build dist __pycache__

# Build a directory bundle (safer for system libs) named billing-backend
pyinstaller --noconfirm --clean --log-level=WARN --onedir --name billing-backend runner.py

# After build, dist/billing-backend contains the executable and supporting files
echo "PyInstaller build complete: $(pwd)/dist/billing-backend"

# Optional: list files for debugging
ls -al dist/billing-backend || true

exit 0
