/**
 * ============================================
 * ELECTRON MAIN PROCESS
 * ============================================
 * This file manages the Electron application lifecycle and integrates
 * with the Django backend server.
 * 
 * Key responsibilities:
 * - Launch and manage the Django backend server
 * - Create and manage the main application window
 * - Handle application lifecycle events
 * - Clean up processes on application exit
 * ============================================
 */

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

// Global reference to the Django backend process
let djangoProcess;

/**
 * Create the main application window
 * Configures the window size, security settings, and loads the frontend HTML
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Preload script for security
      contextIsolation: true, // Enable context isolation for security
    }
  });

  // Load the frontend HTML file
  const frontendEntry = path.join(__dirname, '..', 'frontend', 'public', 'index.html');
  mainWindow.loadFile(frontendEntry);
}

/**
 * Start the Django development server as a child process
 * The server runs on localhost:8765 and provides the REST API backend
 */
function startDjango() {
  djangoProcess = spawn('python', ['manage.py', 'runserver', '127.0.0.1:8765'], {
    cwd: path.join(__dirname, '..', 'backend'), // Set working directory to backend folder
    stdio: 'inherit' // Inherit stdio to see Django output in console
  });
}

// ============================================
// APPLICATION LIFECYCLE EVENTS
// ============================================

/**
 * Called when Electron is ready to create browser windows
 * Start Django server first, then create the application window
 */
app.on('ready', () => {
  startDjango();
  createWindow();
});

/**
 * Called when all windows are closed
 * On macOS, applications typically remain active until explicitly quit
 * On other platforms, quit the application
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Called before the application quits
 * Clean up by terminating the Django server process
 */
app.on('will-quit', () => {
  if (djangoProcess) {
    djangoProcess.kill();
  }
});
