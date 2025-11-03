const { app, BrowserWindow, dialog, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn, spawnSync } = require('child_process');
const path = require('path');

let djangoProcess;
let updateIntervalHandle;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
    }
    ,
    // Hide native menu by default for a clean desktop window
    autoHideMenuBar: true,
    menuBarVisibility: false,
  });

  // Start with a lightweight local loading page to avoid blank white screen.
  const loadingPage = `file://${path.join(__dirname, 'loading.html')}`;
  mainWindow.loadURL(loadingPage);
  // Frontend entry will be loaded once backend responds; returned by startDjango/poller.
  return mainWindow;
}

// IPC handler: capture a rectangular region of the sender's webContents and return base64 PNG
ipcMain.handle('capture-element', async (event, clip) => {
  try {
    // clip should be { x, y, width, height }
    const webContents = event.sender;
    const image = await webContents.capturePage(clip || undefined);
    const pngBuffer = image.toPNG();
    return { ok: true, pngBase64: pngBuffer.toString('base64') };
  } catch (err) {
    console.error('capture-element failed', err);
    return { ok: false, error: String(err) };
  }
});

async function startDjango() {
  // Resolve Python across platforms (prefer bundled, then system)
  const resolvePython = () => {
    // In packaged apps, prefer a bundled interpreter if present
    if (app.isPackaged) {
      if (process.platform === 'win32') {
        // Prefer venv layout: python\Scripts\python.exe
        const bundledVenv = path.join(process.resourcesPath, 'python', 'Scripts', 'python.exe');
        const fs = require('fs');
        try {
          if (fs.existsSync(bundledVenv)) {
            return { cmd: bundledVenv, prefix: [], shell: false };
          }
        } catch {}
        const bundled = path.join(process.resourcesPath, 'python', 'python.exe');
        try {
          if (fs.existsSync(bundled)) {
            return { cmd: bundled, prefix: [], shell: false };
          }
        } catch {}
      }
      if (process.platform !== 'win32') {
        const fs = require('fs');
        // Prefer venv layout: python/bin/python3
        const bundled3 = path.join(process.resourcesPath, 'python', 'bin', 'python3');
        try {
          if (fs.existsSync(bundled3)) {
            return { cmd: bundled3, prefix: [], shell: false };
          }
        } catch {}
        const bundled = path.join(process.resourcesPath, 'python', 'bin', 'python');
        try {
          if (fs.existsSync(bundled)) {
            return { cmd: bundled, prefix: [], shell: false };
          }
        } catch {}
      }
    }

    if (process.platform === 'win32') {
      // Use py launcher if available
      const tryPy = spawnSync('py', ['-3', '--version'], { shell: true });
      if (tryPy && tryPy.status === 0) {
        return { cmd: 'py', prefix: ['-3'], shell: true };
      }
      // Try python.exe
      const tryPyCmd = spawnSync('python', ['--version'], { shell: true });
      if (tryPyCmd && tryPyCmd.status === 0) return { cmd: 'python', prefix: [], shell: true };
      const tryPy3Cmd = spawnSync('python3', ['--version'], { shell: true });
      if (tryPy3Cmd && tryPy3Cmd.status === 0) return { cmd: 'python3', prefix: [], shell: true };
      // Last resort: common store path (may not exist)
      const possible = [
        'C:/Windows/py.exe',
        'C:/Python311/python.exe',
        'C:/Python310/python.exe',
        'C:/Users/' + (process.env.USERNAME || 'User') + '/AppData/Local/Programs/Python/Python311/python.exe',
        'C:/Users/' + (process.env.USERNAME || 'User') + '/AppData/Local/Programs/Python/Python310/python.exe',
      ];
      const fs = require('fs');
      for (const p of possible) {
        if (fs.existsSync(p)) return { cmd: p, prefix: [], shell: false };
      }
      return { cmd: 'python', prefix: [], shell: true };
    }

    // Non-Windows: prefer venv python in dev, then system
    try {
      const devVenv = path.join(__dirname, '..', 'backend', '.venv', 'bin', 'python');
      if (!app.isPackaged && require('fs').existsSync(devVenv)) {
        return { cmd: devVenv, prefix: [], shell: false };
      }
    } catch {}
    const tryPy3 = spawnSync('python3', ['--version']);
    if (tryPy3 && tryPy3.status === 0) return { cmd: 'python3', prefix: [], shell: false };
    return { cmd: 'python', prefix: [], shell: false };
  };

  const { cmd, prefix, shell } = resolvePython();

  // Use unpacked backend in packaged builds
  const backendCwd = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'backend')
    : path.join(__dirname, '..', 'backend');

  // If packaged, ensure the embedded SQLite DB is writable by copying it to userData on first run
  const env = Object.assign({}, process.env);
  if (app.isPackaged) {
    try {
      const fs = require('fs');
      const unpackedDb = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'db.sqlite3');
      const userDataDir = app.getPath('userData');
      const targetDir = path.join(userDataDir, 'backend');
      const targetDb = path.join(targetDir, 'db.sqlite3');
      if (fs.existsSync(unpackedDb)) {
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        // Copy only if target doesn't exist to preserve user data on upgrades
        if (!fs.existsSync(targetDb)) {
          fs.copyFileSync(unpackedDb, targetDb);
          // Make sure the copied file is writable by the user
          try { fs.chmodSync(targetDb, 0o600); } catch (e) {}
          console.log('[billing-app] Seeded SQLite database in userData directory');
        }
        // Point Django to the userData DB path
        env.DJANGO_SQLITE_PATH = targetDb;
      }
      if (!env.DJANGO_SQLITE_PATH) {
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        env.DJANGO_SQLITE_PATH = targetDb;
      }
      // Also set FRONTEND_DIR to the embedded static_build so Django finds the production assets
      env.FRONTEND_STATIC_BUILD = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'static_build');
    } catch (e) {
      console.warn('Failed to prepare userData DB copy:', e && e.message);
    }
    if (!env.DJANGO_SQLITE_PATH) {
      const fallbackDir = path.join(app.getPath('userData'), 'backend');
      const fallbackDb = path.join(fallbackDir, 'db.sqlite3');
      env.DJANGO_SQLITE_PATH = fallbackDb;
    }
  }

  // If packaged, run migrations synchronously before starting the server.
  if (app.isPackaged) {
    try {
      const migrateArgs = [...prefix, 'manage.py', 'migrate', '--noinput'];
      const result = spawnSync(cmd, migrateArgs, {
        cwd: backendCwd,
        stdio: 'inherit',
        shell: shell || false,
        env,
      });
      if (result && result.status !== 0) {
        console.error('Django migrate exited with code', result.status);
      }
    } catch (err) {
      console.error('Failed to run Django migrations before start', err);
    }
  }

  // Find a free port (prefer 8765). If occupied, allocate an ephemeral port so
  // Electron always starts its own Django instance rather than relying on an
  // externally-run server.
  const findFreePort = () => new Promise((resolve, reject) => {
    const net = require('net');
    const preferred = 8765;
    const probe = net.createServer();
    probe.once('error', () => {
      // Preferred port not available; allocate ephemeral port
      probe.close?.();
      const s = net.createServer();
      s.listen(0, '127.0.0.1', () => {
        const port = s.address().port;
        s.close(() => resolve(port));
      });
      s.once('error', (e) => reject(e));
    });
    probe.listen(preferred, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });

  let selectedPort = 8765;
  try {
    selectedPort = await findFreePort();
  } catch (err) {
    console.warn('Could not probe preferred port, falling back to 8765', err && err.message);
    selectedPort = 8765;
  }

  // Expose the port to other parts of the app
  app.__internalDjangoPort = selectedPort;

  const args = [...prefix, 'manage.py', 'runserver', `127.0.0.1:${selectedPort}`];
  console.log(`[billing-app] Starting internal Django: ${cmd} ${args.join(' ')}, cwd=${backendCwd}`);
  djangoProcess = spawn(cmd, args, {
    cwd: backendCwd,
    stdio: 'inherit',
    shell: shell || false,
    env: env,
  });
  djangoProcess.on('error', (err) => {
    console.error('Failed to start Django:', err);
    try { dialog.showErrorBox('Backend Error', `Failed to start Django: ${err.message}`); } catch (e) {}
  });
}

// Poll the backend until it responds (or timeout). Returns a promise that resolves when ready.
async function waitForBackend(url = 'http://127.0.0.1:8765/', { timeout = 30000, interval = 500 } = {}) {
  const start = Date.now();
  const { URL } = require('url');
  const http = require('http');
  const https = require('https');

  const checkOnce = (target) => new Promise((resolve) => {
    try {
      const parsed = new URL(target);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request({ method: 'GET', hostname: parsed.hostname, port: parsed.port, path: parsed.pathname || '/' }, (res) => {
        // resolve true for any <500 status
        resolve(res.statusCode && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.abort();
        resolve(false);
      });
      req.end();
    } catch (err) {
      resolve(false);
    }
  });

  while (Date.now() - start < timeout) {
    const ok = await checkOnce(url);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

function handleUpdateEvents(targetWindow) {
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info?.version || 'unknown version');
  });

  autoUpdater.on('update-downloaded', async () => {
    const focusedWindow = targetWindow && !targetWindow.isDestroyed()
      ? targetWindow
      : BrowserWindow.getAllWindows().find((wnd) => !wnd.isDestroyed());

    const response = await dialog.showMessageBox(focusedWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new update has been downloaded. Restart to apply?',
      detail: 'Restart now to install the latest Billing App features or choose Later to keep working.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (response.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto update error:', error);
  });
}

function setupAutoUpdates(targetWindow) {
  if (!app.isPackaged) {
    console.log('Auto updates are disabled while running in development mode.');
    return;
  }

  autoUpdater.autoDownload = true;
  handleUpdateEvents(targetWindow);

  const checkForUpdates = () => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('Failed to check for updates:', error);
    });
  };

  // Default to checking for updates every 60s in packaged apps; reduce noisy polling.
  const intervalMs = parseInt(process.env.AUTO_UPDATE_INTERVAL_MS, 10) || 60000;
  checkForUpdates();
  updateIntervalHandle = setInterval(checkForUpdates, intervalMs);
}

app.whenReady().then(async () => {
  // Optional: allow disabling Chromium sandbox on Linux via env for testing
  if (process.platform === 'linux' && process.env.ELECTRON_NO_SANDBOX === '1') {
    app.commandLine.appendSwitch('no-sandbox');
  }
  // Start Django (internal child) and create the BrowserWindow. We await
  // startDjango so the selected port is available for waitForBackend below.
  await startDjango();
  const window = createWindow();
  setupAutoUpdates(window);

  // After starting Django, wait for the backend and then load the internal frontend URL.
  (async () => {
    const port = app.__internalDjangoPort || 8765;
    const backendUrl = `http://127.0.0.1:${port}/`;
    const backendReady = await waitForBackend(backendUrl, { timeout: 40000, interval: 600 });
    if (!backendReady) {
      console.error('Backend did not become ready within timeout');
      try {
        dialog.showErrorBox('Startup Error', 'The backend did not start in time. Please check logs.');
      } catch (e) {}
      return;
    }

    // Always load the internal Django frontend so Electron controls the full stack.
    const frontendEntry = backendUrl;
    try {
      if (window && !window.isDestroyed()) {
        window.loadURL(frontendEntry);
      }
    } catch (err) {
      console.error('Failed to load frontend URL', err);
    }
  })();
});

// Remove the default application menu so the window doesn't show File/Edit/View
app.whenReady().then(() => {
  try {
    Menu.setApplicationMenu(null);
  } catch (err) {
    // Best effort: if Menu isn't available, ignore
    console.warn('Could not remove application menu:', err && err.message);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (djangoProcess) {
    djangoProcess.kill();
  }
  if (updateIntervalHandle) {
    clearInterval(updateIntervalHandle);
    updateIntervalHandle = undefined;
  }
});

app.on('before-quit', () => {
  if (updateIntervalHandle) {
    clearInterval(updateIntervalHandle);
    updateIntervalHandle = undefined;
  }
});
