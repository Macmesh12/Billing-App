# Flutter Installation Instructions for Windows

The Flutter backend integration is now complete! Here's how to install Flutter on your Windows system.

## ✅ Backend Integration Complete

Your Flutter app is now fully connected to the Django backend with:

- **Complete API Service** ([api_service.dart](billdoc/lib/services/api_service.dart))
  - Invoice APIs (create, get, update, calculate preview, download PDF)
  - Receipt APIs (create, get, update, download PDF)
  - Waybill APIs (create, get, update, download PDF)
  - Counter APIs (get next document numbers)
  - Project APIs (export/import)
  - Config APIs (tax settings)
  - Proper error handling and timeouts

- **API Usage Examples** ([api_usage_examples.dart](billdoc/lib/services/api_usage_examples.dart))
  - Complete workflow examples
  - Error handling patterns
  - All endpoint usage demonstrations

## 📦 Flutter Installation Options

### Option 1: Manual Installation (Recommended)

1. **Download Flutter SDK**
   ```powershell
   # Download Flutter 3.27.1 (latest stable)
   Invoke-WebRequest -Uri "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.27.1-stable.zip" `
     -OutFile "$env:USERPROFILE\Downloads\flutter_windows.zip" -UseBasicParsing
   ```

2. **Extract to C:\ drive**
   ```powershell
   # Extract Flutter (this may take several minutes)
   Expand-Archive -Path "$env:USERPROFILE\Downloads\flutter_windows.zip" -DestinationPath "C:\" -Force
   ```

3. **Add to PATH**
   ```powershell
   # Add Flutter to system PATH
   $flutterPath = "C:\flutter\bin"
   $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
   [Environment]::SetEnvironmentVariable("Path", "$currentPath;$flutterPath", "User")
   
   # Refresh current session
   $env:Path += ";$flutterPath"
   ```

4. **Verify Installation**
   ```powershell
   # Close and reopen your terminal, then run:
   flutter doctor
   ```

### Option 2: Using Git (if you have Git installed)

```powershell
# Clone Flutter repository
cd C:\
git clone https://github.com/flutter/flutter.git -b stable

# Add to PATH
$env:Path += ";C:\flutter\bin"

# Run flutter doctor
flutter doctor
```

### Option 3: Using Chocolatey

```powershell
# Install chocolatey if you don't have it
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Flutter
choco install flutter
```

## 🔧 Post-Installation Setup

After installing Flutter, run these commands:

```powershell
# Check Flutter installation and dependencies
flutter doctor

# Accept Android licenses (if using Android)
flutter doctor --android-licenses

# Get Flutter dependencies for your project
cd path\to\Billing-App\billdoc
flutter pub get

# Run the app
flutter run
```

## 📱 Running the Flutter App

### 1. Start Django Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8765
```

### 2. Run Flutter App

```powershell
# In a new terminal
cd billdoc
flutter pub get
flutter run -d windows  # For Windows desktop
flutter run -d chrome   # For web browser
```

## 🌐 Backend Configuration

The Flutter app connects to the backend at `http://localhost:8765` by default.

To change this, edit [api_service.dart](billdoc/lib/services/api_service.dart):

```dart
static const String baseUrl = 'http://localhost:8765';  // Change this URL
```

## 🧪 Testing the Integration

Run the example workflows:

```dart
import 'services/api_usage_examples.dart';

// Test complete invoice workflow
await CompleteWorkflowExample.createInvoiceWorkflow();

// Test individual operations
await InvoiceExamples.createInvoice();
await ReceiptExamples.createReceipt();
await WaybillExamples.createWaybill();
```

## 📚 Available API Endpoints

### Invoices
- `POST /invoices/api/calculate-preview/` - Calculate totals
- `POST /invoices/api/create/` - Create invoice  
- `GET /invoices/api/<id>/` - Get invoice
- `PUT /invoices/api/<id>/` - Update invoice
- `GET /invoices/<id>/pdf/` - Download PDF
- `GET /invoices/api/config/` - Get tax settings

### Receipts
- `POST /receipts/api/create/` - Create receipt
- `GET /receipts/api/<id>/` - Get receipt
- `PUT /receipts/api/<id>/` - Update receipt
- `GET /receipts/<id>/pdf/` - Download PDF

### Waybills
- `POST /waybills/api/create/` - Create waybill
- `GET /waybills/api/<id>/` - Get waybill
- `PUT /waybills/api/<id>/` - Update waybill
- `GET /waybills/<id>/pdf/` - Download PDF

### Counters
- `GET/POST /api/counter/invoice/next/` - Next invoice number
- `GET/POST /api/counter/receipt/next/` - Next receipt number
- `GET/POST /api/counter/waybill/next/` - Next waybill number
- `GET /api/counter/counts/` - Get all counts

### Project
- `POST /api/project/export/` - Export project
- `POST /api/project/import/` - Import project

## ❓ Troubleshooting

### Flutter command not found
- Close and reopen your terminal after installation
- Verify PATH with: `$env:Path`
- Manually run: `C:\flutter\bin\flutter.bat doctor`

### Download slow or fails
- Use a download manager
- Download manually from: https://docs.flutter.dev/get-started/install/windows
- Try a different Flutter version

### Backend connection issues
- Ensure Django is running on port 8765
- Check firewall settings
- Verify the baseUrl in api_service.dart

### CORS errors
- Backend already has CORS headers configured
- Check that requests include proper Content-Type headers

## 🎯 Next Steps

1. Install Flutter using one of the methods above
2. Run `flutter doctor` to check dependencies
3. Navigate to the `billdoc` folder
4. Run `flutter pub get` to install packages
5. Start the Django backend on port 8765
6. Run `flutter run` to launch the app

## 📞 Need Help?

- Flutter Documentation: https://docs.flutter.dev
- Backend API Examples: [api_usage_examples.dart](billdoc/lib/services/api_usage_examples.dart)
- Django Backend: http://localhost:8765/admin

---

**Your Flutter app is ready to connect with the Django backend! 🚀**
