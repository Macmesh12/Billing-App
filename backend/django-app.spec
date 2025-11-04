# -*- mode: python ; coding: ascii -*-

from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files

BASE_DIR = Path.cwd()
ROOT_DIR = BASE_DIR.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

extra_datas = []

if FRONTEND_DIR.exists():
    templates_dir = FRONTEND_DIR / "templates"
    static_dir = FRONTEND_DIR / "static"
    if templates_dir.exists():
        extra_datas.append((str(templates_dir), "frontend/templates"))
    if static_dir.exists():
        extra_datas.append((str(static_dir), "frontend/static"))

app_datas = collect_data_files("billing_app", include_py_files=True)

a = Analysis(
    ['manage_for_tauri.py'],
    pathex=[str(BASE_DIR)],
    binaries=[],
    datas=app_datas + extra_datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='django-app',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
