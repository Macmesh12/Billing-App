const { app, BrowserWindow, dialog } = require('electron');
// Import Electron modules
const { autoUpdater } = require('electron-updater');
// Auto updater for handling application updates
const { spawn } = require('child_process');
// Import spawn for child processes
const path = require('path');
// Import path module

let djangoProcess;
// Variable to hold Django process
let updateIntervalHandle;
// Interval handle for periodic update checks
let mainWindow;
// Reference to main application window

function createWindow() {
  // Function to create main window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Preload script path
      contextIsolation: true,
      // Enable context isolation
    }
  });

  const frontendEntry = 'http://localhost:5173/';
  // URL to React dev server
  mainWindow.loadURL(frontendEntry);
  // Load the URL
  return mainWindow;
}

function startDjango() {
  // Function to start Django server
  djangoProcess = spawn('python', ['manage.py', 'runserver', '127.0.0.1:8765'], {
    cwd: path.join(__dirname, '..', 'backend'),
    // Working directory for backend
    stdio: 'inherit'
    // Inherit stdio
  });
}

function handleUpdateEvents(targetWindow) {
  // Wire up auto updater lifecycle events
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

  checkForUpdates();
  updateIntervalHandle = setInterval(checkForUpdates, 1000);
}

app.whenReady().then(() => {
  // When app is ready
  startDjango();
  // Start Django
  const window = createWindow();
  // Create window
  setupAutoUpdates(window);
  // Enable automatic updates
});

app.on('window-all-closed', () => {
  // When all windows closed
  if (process.platform !== 'darwin') {
    app.quit();
    // Quit app on non-mac
  }
});

app.on('will-quit', () => {
  // Before quitting
  if (djangoProcess) {
    djangoProcess.kill();
    // Kill Django process
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
