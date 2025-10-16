const { app, BrowserWindow } = require('electron');
// Import Electron modules
const { spawn } = require('child_process');
// Import spawn for child processes
const path = require('path');
// Import path module

let djangoProcess;
// Variable to hold Django process

function createWindow() {
  // Function to create main window
  const mainWindow = new BrowserWindow({
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

app.on('ready', () => {
  // When app is ready
  startDjango();
  // Start Django
  createWindow();
  // Create window
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
});
