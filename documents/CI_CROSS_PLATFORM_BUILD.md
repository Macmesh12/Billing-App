# Cross-Platform CI Build Setup

## Overview
GitHub Actions workflow has been configured to automatically build Tauri desktop applications for **Windows**, **macOS**, and **Linux** platforms.

## What Gets Built

### Windows
- **NSIS Installer** (`.exe`) - Standard Windows installer
- **MSI Installer** (`.msi`) - Alternative Windows installer format

### macOS
- **DMG Image** (`.dmg`) - Standard macOS disk image for both Intel (x86_64) and Apple Silicon (ARM64)
- **App Bundle** (`.app`) - Native macOS application

### Linux
- **Debian Package** (`.deb`) - For Debian/Ubuntu distributions
- **AppImage** (`.AppImage`) - Universal Linux portable application

## How to Trigger Builds

### Automatic Builds
The workflow runs automatically on:
- Every push to the `main` branch
- Every pull request to the `main` branch
- When you create a version tag (e.g., `v0.1.0`)

### Manual Builds
You can manually trigger a build:
1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select **Build Tauri Cross-Platform** workflow
4. Click **Run workflow** button
5. Choose the branch and click **Run workflow**

## Creating a Release

To create an official release with installers:

```bash
# Tag your commit with a version
git tag v0.1.0
git push origin v0.1.0
```

The CI will automatically:
1. Build installers for all platforms
2. Create a GitHub Release
3. Upload all installers to the release

## Download Built Artifacts

### From Actions Tab
1. Go to **Actions** tab in GitHub
2. Click on the workflow run
3. Scroll to **Artifacts** section at the bottom
4. Download the platform-specific artifacts:
   - `windows-installers` - Windows .exe and .msi files
   - `macos-dmg` - macOS Intel .dmg
   - `macos-arm64-dmg` - macOS Apple Silicon .dmg
   - `linux-packages` - Linux .deb and .AppImage files

### From Releases Page
If you tagged a version (e.g., `v0.1.0`):
1. Go to **Releases** tab in GitHub
2. Find your version
3. Download installers from **Assets** section

## Workflow Configuration

The workflow file is located at:
```
.github/workflows/tauri-build.yml
```

### What It Does
1. **Sets up build environment** - Installs Node.js, Python, Rust
2. **Installs platform dependencies** - System libraries for Tauri and WeasyPrint (PDF generation)
3. **Builds Django backend** - Creates PyInstaller binaries for each platform
4. **Builds Tauri app** - Bundles the frontend with the Django backend sidecar
5. **Uploads artifacts** - Makes installers available for download

### Build Matrix
The workflow uses a matrix strategy to build in parallel:
- **macOS Intel (x86_64)** - For older Macs
- **macOS Apple Silicon (ARM64)** - For M1/M2/M3 Macs
- **Windows** - x86_64 architecture
- **Linux Ubuntu 22.04** - x86_64 architecture

## Troubleshooting

### Build Fails on macOS
- Check if Homebrew dependencies are installed correctly
- Verify PyInstaller works on macOS (Cairo/Pango for WeasyPrint)

### Build Fails on Windows
- Ensure PyInstaller spec file works on Windows
- Check if Visual C++ redistributables are needed

### Build Fails on Linux
- Verify all apt packages are installed
- Check if WebKit2GTK dependencies are satisfied

### Missing Django Backend in Bundle
- The workflow builds `django-app` binary with PyInstaller
- Binary is placed in `my-desktop-app/src-tauri/binaries/`
- Tauri bundles it as an external binary (sidecar)

## Current Configuration

**Tauri Config** (`my-desktop-app/src-tauri/tauri.conf.json`):
- Bundle targets: `deb`, `appimage`, `msi`, `nsis`, `dmg`, `app`
- External binary: `binaries/django-app` (Django backend sidecar)
- Product name: "Billing App"
- Version: 0.1.0

**Django Backend**:
- Built with PyInstaller using `backend/django-app.spec`
- Includes frontend templates and static files
- Entry point: `manage_for_tauri.py`

## Next Steps

1. **Push to GitHub** to trigger the first build:
   ```bash
   git push origin main
   ```

2. **Monitor the build** in the Actions tab

3. **Create a release** when ready:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. **Share installers** from the Releases page with users

## Notes

- Artifacts are kept for 30 days
- Release assets are permanent
- macOS builds create both Intel and ARM64 versions
- Windows builds create both NSIS (.exe) and MSI (.msi) installers
- Linux builds include both .deb and .AppImage for maximum compatibility
