@echo off
echo Starting Billing App Backend Server...
echo.
echo Note: Make sure Python is installed and virtual environment is set up.
echo.

cd /d "%~dp0backend"

REM Check if virtual environment exists
if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
) else (
    echo Virtual environment not found!
    echo.
    echo To set up the backend:
    echo 1. Install Python 3.10 or higher
    echo 2. Run: python -m venv .venv
    echo 3. Run: .venv\Scripts\activate.bat
    echo 4. Run: pip install -r requirements.txt
    echo 5. Run: python manage.py migrate
    echo.
    pause
    exit /b 1
)

echo.
echo Starting Django server on http://127.0.0.1:8765
echo Press Ctrl+C to stop the server
echo.

python manage.py runserver 127.0.0.1:8765

pause
