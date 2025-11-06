# Cross-Platform Build Instructions for Billing App

## ✅ Linux (Built Successfully)

The Linux bundles are already built and available in the `deliverables/` folder:
- **Debian Package**: `Billing App_0.1.0_amd64.deb`
- **AppImage**: `Billing App_0.1.0_amd64.AppImage`

To rebuild on Linux:
```bash
cd my-desktop-app
npm install
npm run tauri build
```

## 🪟 Windows (.exe / .msi)

**Requirements:**
- Windows 10/11 or Windows Server
- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://rustup.rs/)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) or Visual Studio with C++ workload
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (usually pre-installed on Windows 10+)

**Build Steps:**

1. Clone the repository:
```powershell
git clone https://github.com/Macmesh12/Billing-App.git
cd Billing-App\my-desktop-app
```

2. Install Node dependencies:
```powershell
npm install
```

3. Build the Windows executable:
```powershell
npm run tauri build
```

**Output:**
- `.exe` installer: `src-tauri\target\release\bundle\nsis\Billing App_0.1.0_x64-setup.exe`
- `.msi` installer: `src-tauri\target\release\bundle\msi\Billing App_0.1.0_x64_en-US.msi`

---

## 🍎 macOS (.dmg / .app)

**Requirements:**
- macOS 10.15+ (Catalina or later)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/resources/)
- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://rustup.rs/)

**Build Steps:**

1. Install Xcode Command Line Tools:
```bash
xcode-select --install
```

2. Clone the repository:
```bash
git clone https://github.com/Macmesh12/Billing-App.git
cd Billing-App/my-desktop-app
```

3. Install Node dependencies:
```bash
npm install
```

4. Add macOS Rust target:
```bash
rustup target add aarch64-apple-darwin  # For Apple Silicon
rustup target add x86_64-apple-darwin   # For Intel Macs
```

5. Build the macOS app:
```bash
npm run tauri build
```

**Output:**
- `.dmg` installer: `src-tauri/target/release/bundle/dmg/Billing App_0.1.0_aarch64.dmg`
- `.app` bundle: `src-tauri/target/release/bundle/macos/Billing App.app`

---

## 🐍 Django Backend Sidecar

The Django backend is packaged as a sidecar executable using PyInstaller. To rebuild:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install pyinstaller

# Build the executable
pyinstaller django-app.spec

# Copy to Tauri binaries folder
cp dist/django-app ../my-desktop-app/src-tauri/binaries/
# On Linux, also create the platform-specific copy:
cp dist/django-app ../my-desktop-app/src-tauri/binaries/django-app-x86_64-unknown-linux-gnu
```

---

## 🚨 Cross-Compilation Limitations

**Building Windows .exe from Linux** is complex and requires:
- `cargo-xwin` (experimental)
- Windows SDK libraries
- May have compatibility issues with WebView2 dependencies

**Building macOS .dmg from Linux/Windows** is **not supported** by Tauri due to:
- Code signing requirements
- Apple's toolchain restrictions
- macOS SDK dependencies

**Recommended approach**: Build each platform on its native OS or use CI/CD services like GitHub Actions that provide runners for all three platforms.

---

## 📦 Current Build Status

| Platform | Status | Location |
|----------|--------|----------|
| Linux .deb | ✅ Built | `deliverables/Billing App_0.1.0_amd64.deb` |
| Linux AppImage | ✅ Built | `deliverables/Billing App_0.1.0_amd64.AppImage` |
| Windows .exe/.msi | ⏳ Pending | Requires Windows build environment |
| macOS .dmg/.app | ⏳ Pending | Requires macOS build environment |

---

## 🔧 Troubleshooting

### "error while running tauri application: PluginInitialization"
- **Fixed**: Updated `tauri.conf.json` to remove invalid `scope` field from shell plugin

### PyInstaller "No module named 'billing_app'"
- Ensure you're running PyInstaller from the `backend/` directory
- Verify `django-app.spec` uses correct paths

### Build fails with "missing WebView2"
- On Windows: Download and install [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)

### Rust compilation errors
- Update Rust: `rustup update`
- Clean build cache: `cargo clean` then rebuild
