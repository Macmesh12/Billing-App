/**
 * ELECTRON MAIN PROCESS
 * 
 * This is the main entry point for the Electron desktop application.
 * It manages the application lifecycle and spawns the Django backend server.
 * 
 * Architecture:
 * - Starts Django backend server on http://127.0.0.1:8765
 * - Creates main browser window pointing to frontend HTML
 * - Manages process cleanup on application exit
 * 
 * The application uses a hybrid architecture:
 * - Backend: Django server (Python) running locally
 * - Frontend: HTML/CSS/JavaScript served from filesystem
 * - Desktop shell: Electron (Chromium + Node.js)
 */

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

// Reference to Django backend process for cleanup
let djangoProcess;

/**
 * Create the main application window
 * 
 * Creates a Chromium browser window with preload script for secure
 * communication between renderer and main processes.
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // Preload script for secure IPC bridge
      preload: path.join(__dirname, 'preload.js'),
      // Enable context isolation for security
      contextIsolation: true,
    }
  });

  // Load frontend HTML from filesystem
  const frontendEntry = path.join(__dirname, '..', 'frontend', 'public', 'index.html');
  mainWindow.loadFile(frontendEntry);
}

/**
 * Start Django development server
 * 
 * Spawns Python Django server process on localhost:8765.
 * The server runs in the background and handles API requests from the frontend.
 */
function startDjango() {
  djangoProcess = spawn('python', ['manage.py', 'runserver', '127.0.0.1:8765'], {
    // Set working directory to backend folder
    cwd: path.join(__dirname, '..', 'backend'),
    // Inherit stdio to see Django logs in terminal
    stdio: 'inherit'
  });
}

// ============================================
// APPLICATION LIFECYCLE EVENTS
// ============================================

/**
 * App ready event - Initialize application
 * 
 * Fires when Electron has finished initialization.
 * Start Django backend and create main window.
 */
app.on('ready', () => {
  startDjango();
  createWindow();
});

/**
 * Window all closed event - Handle app shutdown
 * 
 * On Windows/Linux, quit the app when all windows are closed.
 * On macOS, apps typically stay active until explicitly quit.
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Will quit event - Cleanup before exit
 * 
 * Terminate Django backend process before app exits
 * to prevent orphaned processes.
 */
app.on('will-quit', () => {
  if (djangoProcess) {
    djangoProcess.kill();
  }
});
