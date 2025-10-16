const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');
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
  });

  const frontendEntry = 'http://localhost:5173/';
  mainWindow.loadURL(frontendEntry);
  return mainWindow;
}

function startDjango() {
  djangoProcess = spawn('python', ['manage.py', 'runserver', '127.0.0.1:8765'], {
    cwd: path.join(__dirname, '..', 'backend'),
    stdio: 'inherit'
  });
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

  const intervalMs = parseInt(process.env.AUTO_UPDATE_INTERVAL_MS, 10) || 1000;
  checkForUpdates();
  updateIntervalHandle = setInterval(checkForUpdates, intervalMs);
}

app.whenReady().then(() => {
  startDjango();
  const window = createWindow();
  setupAutoUpdates(window);
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
