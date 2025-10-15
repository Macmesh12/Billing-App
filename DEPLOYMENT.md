# Billing App - Production Deployment Guide

## Overview
This guide covers deploying the Billing App as a standalone desktop application for Windows (.exe) and Linux (.deb).

## Prerequisites

### For Windows Build (.exe)
- Windows OS or Wine on Linux
- Python 3.8+
- PyInstaller
- Node.js (for Electron packaging)

### For Linux Build (.deb)
- Linux OS (Ubuntu/Debian)
- Python 3.8+
- PyInstaller
- Node.js (for Electron packaging)
- electron-builder

## Project Structure
```
Billing-App/
├── backend/                 # Django backend
│   ├── .venv/              # Python virtual environment
│   ├── billing_app/        # Main Django app
│   ├── receipts/           # Receipts app
│   ├── waybills/           # Waybills app
│   ├── manage.py
│   └── requirements.txt
├── frontend/               # Frontend assets
│   ├── static/             # CSS, JS
│   └── templates/          # HTML templates
├── assets/                 # Images (logo, signature)
├── electron/               # Electron app wrapper
│   ├── main.js
│   ├── preload.js
│   └── package.json
└── firebase.json           # Firebase config (optional)
```

## Step 1: Prepare Backend for Production

### 1.1 Update Django Settings
Edit `backend/billing_app/settings.py`:

```python
# Set DEBUG to False for production
DEBUG = False

# Update ALLOWED_HOSTS
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]

# Ensure SECRET_KEY is secure
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "your-production-secret-key-here")

# Static files collection
STATIC_ROOT = BASE_DIR / "staticfiles"
```

### 1.2 Collect Static Files
```bash
cd backend
source .venv/bin/activate
python manage.py collectstatic --noinput
```

### 1.3 Create Django Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 1.4 Bundle Backend with PyInstaller
Create `backend/build_backend.spec`:

```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['manage.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('billing_app', 'billing_app'),
        ('receipts', 'receipts'),
        ('waybills', 'waybills'),
        ('db.sqlite3', '.'),
        ('../frontend/templates', 'frontend/templates'),
        ('../frontend/static', 'frontend/static'),
        ('../assets', 'assets'),
    ],
    hiddenimports=[
        'django',
        'weasyprint',
        'google.cloud.firestore',
        'billing_app.invoices',
        'receipts',
        'waybills',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='billing_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='billing_backend',
)
```

Build the backend:
```bash
cd backend
pyinstaller build_backend.spec
```

This creates `backend/dist/billing_backend/` containing the bundled Django app.

## Step 2: Configure Electron App

### 2.1 Update Electron main.js
Ensure `electron/main.js` spawns the bundled Django backend:

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;
let mainWindow = null;

function startBackend() {
    const isDev = !app.isPackaged;
    
    if (isDev) {
        // Development: use Python directly
        backendProcess = spawn('python', [
            path.join(__dirname, '..', 'backend', 'manage.py'),
            'runserver',
            '127.0.0.1:8765',
            '--noreload'
        ]);
    } else {
        // Production: use bundled executable
        const backendPath = path.join(
            process.resourcesPath,
            'backend',
            'billing_backend',
            process.platform === 'win32' ? 'billing_backend.exe' : 'billing_backend'
        );
        
        backendProcess = spawn(backendPath, [
            'runserver',
            '127.0.0.1:8765',
            '--noreload'
        ]);
    }
    
    backendProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, '..', 'assets', 'logo.png')
    });

    // Wait for backend to start
    setTimeout(() => {
        mainWindow.loadURL('http://127.0.0.1:8765/');
    }, 3000);
}

app.whenReady().then(() => {
    startBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
    app.quit();
});
```

### 2.2 Update package.json
Edit `electron/package.json`:

```json
{
  "name": "billing-app",
  "version": "1.0.0",
  "description": "Professional Billing Application",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build:win": "electron-builder --win",
    "build:linux": "electron-builder --linux deb"
  },
  "build": {
    "appId": "com.spaquels.billingapp",
    "productName": "Billing App",
    "directories": {
      "output": "dist"
    },
    "extraResources": [
      {
        "from": "../backend/dist/billing_backend",
        "to": "backend/billing_backend"
      },
      {
        "from": "../assets",
        "to": "assets"
      }
    ],
    "win": {
      "target": "nsis",
      "icon": "../assets/logo.png"
    },
    "linux": {
      "target": "deb",
      "category": "Office",
      "icon": "../assets/logo.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  }
}
```

## Step 3: Build Electron App

### For Windows (.exe):
```bash
cd electron
npm install
npm run build:win
```

Output: `electron/dist/Billing App Setup 1.0.0.exe`

### For Linux (.deb):
```bash
cd electron
npm install
npm run build:linux
```

Output: `electron/dist/billing-app_1.0.0_amd64.deb`

## Step 4: Testing

### Test the Packaged App
1. **Windows**: Run the installer and test all features
2. **Linux**: Install with `sudo dpkg -i billing-app_1.0.0_amd64.deb`
3. Test all document types (invoice, receipt, waybill)
4. Verify PDF generation works
5. Check logo and assets display correctly
6. Test database persistence across sessions

## Step 5: Distribution

### Windows Distribution
- Distribute the `.exe` installer
- Users run the installer
- App appears in Start Menu
- Database stored in user's AppData folder

### Linux Distribution
- Distribute the `.deb` package
- Users install with package manager
- App appears in applications menu
- Database stored in user's home directory

## Troubleshooting

### Issue: Backend doesn't start
**Solution**: Check that PyInstaller included all Django dependencies. Add missing imports to `hiddenimports` in the spec file.

### Issue: Logo not displaying
**Solution**: Verify assets folder is included in `extraResources` and paths are correct.

### Issue: Database not persisting
**Solution**: Ensure database path is writable. Use app.getPath('userData') for database location.

### Issue: WeasyPrint fonts missing
**Solution**: Include font files in PyInstaller bundle and set WEASYPRINT_DPI environment variable.

## Production Checklist

- [ ] DEBUG = False in settings.py
- [ ] Secure SECRET_KEY configured
- [ ] Static files collected
- [ ] All migrations applied
- [ ] Backend bundled with PyInstaller
- [ ] Electron configured for production
- [ ] App icon set correctly
- [ ] Database path configured
- [ ] All features tested
- [ ] PDF generation tested
- [ ] Installer created
- [ ] Distribution package tested on clean system

## Support

For issues during deployment, check:
1. Console logs in Electron DevTools
2. Backend logs (stdout/stderr)
3. Django error messages
4. File permissions

## Version History

- **v1.0.0** - Initial production release
  - Invoice generation with taxes
  - Receipt generation
  - Waybill generation
  - PDF export with WeasyPrint
  - Firestore counter integration
