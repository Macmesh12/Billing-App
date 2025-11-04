# Billing Desktop Shell (Tauri + Django)

The desktop bundle embeds the Django backend as a Tauri sidecar so the UI can talk to a fully featured HTTP API without shipping Python separately.

## Prerequisites

- Python 3.11+ toolchain with `pyinstaller` available in the backend virtualenv
- Node.js 18+ and npm
- Rust toolchain with Cargo (required by Tauri)

## 1. Build or Refresh the Django Sidecar

```bash
cd ../backend
source .venv/bin/activate        # if not already active
pyinstaller django-app.spec
cp dist/django-app ../my-desktop-app/src-tauri/binaries/django-app
```

If you change Django code, rebuild and copy the binary again before packaging the desktop app.

## 2. Install Frontend Dependencies

```bash
cd ../my-desktop-app
npm install
```

## 3. Run the Desktop App in Development

```bash
npm run tauri dev
```

The frontend spawns the `django-app` sidecar, reads the dynamic `DJANGO_PORT` line, and exposes helpers (`window.waitForBackend`, `window.apiFetch`) once the server is ready.

## 4. Produce Release Builds

```bash
npm run tauri build
```

Artifacts appear in `src-tauri/target/release/bundle/` for each supported platform. For consistent multi-platform outputs, prefer running the build inside a CI service (e.g., GitHub Actions) that provides native runners for Windows, macOS, and Linux.
