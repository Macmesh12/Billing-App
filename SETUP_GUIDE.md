# Billing App - Complete Setup Guide

## Overview
This billing application consists of:
- **Frontend**: Flutter desktop/mobile app (`billdoc/` folder)
- **Backend**: Django REST API (`backend/` folder)

## Prerequisites
1. **Flutter SDK** (for frontend)
2. **Python 3.10+** (for backend)

## Quick Start

### Backend Setup (First Time Only)

1. **Install Python** (if not already installed)
   - Download from https://www.python.org/downloads/
   - Make sure to check "Add Python to PATH" during installation

2. **Set up the backend**:
   ```powershell
   cd backend
   python -m venv .venv
   .venv\Scripts\Activate.ps1   # On Windows PowerShell
   # OR
   .venv\Scripts\activate.bat   # On Windows CMD
   pip install -r requirements.txt
   python manage.py migrate
   ```

### Running the Application

#### Option 1: Use the Startup Scripts (Recommended)

**Windows:**
- Double-click `START_BACKEND.bat` or `START_BACKEND.ps1` to start the backend server
- The backend will run on http://127.0.0.1:8765

**Then run the Flutter app:**
```powershell
cd billdoc
flutter run -d windows
# OR for web
flutter run -d chrome
```

#### Option 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
.venv\Scripts\Activate.ps1
python manage.py runserver 127.0.0.1:8765
```

**Terminal 2 - Frontend:**
```powershell
cd billdoc
flutter run -d windows
```

## Features Implemented

### ✅ Fully Functional Settings Screen
- Company Information (Name, Address, Phone, Email, TIN, Website)
- Logo Management (displays from assets/images/logo.png)
- Tax Settings (NHIL, GETFund, VAT rates)
- Document Prefixes (Invoice, Receipt, Waybill)
- Payment Information (Bank Account, Mobile Money)

### ✅ Document Management
- **Save as Draft**: Saves documents to drafts list (max 50 per type)
- **Finalize**: Moves documents to recents/completed list (max 100 per type)
- Documents appear in Home screen under "Recent" or "Drafts" tabs
- Automatic deduplication when finalizing drafts

### ✅ Logo Integration
- Default logo at `billdoc/assets/images/logo.png`
- Logo displays on all preview screens (Invoices, Receipts)
- Supports both asset images and custom uploaded images

### ✅ Backend API Integration
The app is configured to connect to the Django backend at `http://localhost:8765`

**Available API endpoints:**
- `POST /invoices/api/create/` - Create invoice
- `POST /invoices/api/calculate-preview/` - Calculate totals
- `GET /invoices/api/<id>/` - Get invoice details
- `GET /invoices/<id>/pdf/` - Download invoice PDF
- Similar endpoints for receipts and waybills

## Project Structure

```
Billing-App/
├── billdoc/                    # Flutter frontend
│   ├── lib/
│   │   ├── models/            # Data models
│   │   ├── providers/         # State management
│   │   ├── screens/           # UI screens
│   │   ├── services/          # API services
│   │   ├── utils/             # PDF generator, helpers
│   │   └── widgets/           # Reusable widgets
│   ├── assets/images/         # Logo and images
│   └── pubspec.yaml
├── backend/                   # Django backend
│   ├── billing_app/          # Main Django app
│   ├── invoices/             # Invoices app
│   ├── receipts/             # Receipts app
│   ├── waybills/             # Waybills app
│   ├── manage.py
│   └── requirements.txt
├── START_BACKEND.bat         # Windows batch script to start backend
└── START_BACKEND.ps1         # PowerShell script to start backend
```

## Cleaned Up Files
- ✅ Removed duplicate `lib/lib/` folder
- ✅ Removed unused example files
- ✅ Settings dialog replaced with actual settings screen

## Troubleshooting

### Backend Issues

**"Python was not found"**
- Install Python from https://www.python.org/
- Add Python to PATH during installation

**"Virtual environment not found"**
- Run the backend setup commands again (see "Backend Setup" above)

**"Port already in use"**
- Stop any existing Django server
- Or use a different port: `python manage.py runserver 127.0.0.1:8766`

### Frontend Issues

**"Could not resolve dependencies"**
```powershell
cd billdoc
flutter clean
flutter pub get
```

**Backend connection errors**
- Make sure the backend server is running on port 8765
- Check `billdoc/lib/services/api_service.dart` for the correct `baseUrl`

## Development Notes

### State Management
- Uses Provider pattern
- Main state in `lib/providers/app_state.dart`
- Includes methods for saving drafts and recents

### API Integration
- API service in `lib/services/api_service.dart`
- All backend calls use `http` package
- Configured for `localhost:8765` (Django default)

### Data Persistence
- Documents stored in-memory (drafts and recents lists)
- Backend persistence available via API calls
- PDF generation uses Flutter's `printing` package

## Next Steps

To enable full backend persistence:
1. Update save methods in screens to call `ApiService.createInvoice()` etc.
2. Load documents from backend on app start
3. Implement local storage (shared_preferences) for offline mode

---

**Need Help?**
- Check the backend logs in the terminal
- Run `flutter doctor` to check Flutter setup
- Check Django admin at http://127.0.0.1:8765/admin
