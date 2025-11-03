/**
 * Electron Main Process
 * 
 * This is the entry point for the Electron application.
 * It handles:
 * - Creating the browser window
 * - Starting the Django backend server
 * - Managing application lifecycle events
 * - Cleaning up resources on quit
 * 
 * Architecture:
 * - Electron provides the native desktop wrapper
 * - Django runs as a child process providing the backend API
 * - Frontend HTML/CSS/JS loads in the Electron window
 * - Communication happens via HTTP to http://127.0.0.1:8765
 */

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

// Global reference to the Django server process
// Needs to be global to ensure it stays alive and can be killed on quit
let djangoProcess;

/**
 * Create the main application window.
 * 
 * This function:
 * - Creates a BrowserWindow with specific dimensions
 * - Enables security features (contextIsolation)
 * - Loads the preload script for secure IPC
 * - Loads the frontend HTML entry point
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // Preload script runs before the web page loads
      preload: path.join(__dirname, 'preload.js'),
      // Enable context isolation for security
      // This prevents the renderer from accessing Node.js APIs directly
      contextIsolation: true,
    }
  });

  // Path to the frontend entry HTML file
  const frontendEntry = path.join(__dirname, '..', 'frontend', 'public', 'index.html');
  
  // Load the HTML file into the window
  mainWindow.loadFile(frontendEntry);
  
  // Optional: Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

/**
 * Start the Django development server.
 * 
 * This function:
 * - Spawns a Python process running Django's runserver
 * - Binds to 127.0.0.1:8765 (localhost only for security)
 * - Inherits stdio so server logs appear in terminal
 * - Stores process reference for cleanup on quit
 * 
 * Note: In production, Django should be packaged differently
 * (e.g., using PyInstaller or running as a frozen executable)
 */
function startDjango() {
  djangoProcess = spawn('python', ['manage.py', 'runserver', '127.0.0.1:8765'], {
    // Set working directory to the backend folder
    cwd: path.join(__dirname, '..', 'backend'),
    // Inherit stdio so we can see Django's output in the terminal
    stdio: 'inherit'
  });
  
  // Handle Django process errors
  djangoProcess.on('error', (err) => {
    console.error('Failed to start Django server:', err);
  });
}

/**
 * App ready event - fired when Electron has finished initialization.
 * This is the main entry point for the application.
 */
app.on('ready', () => {
  // Start Django backend first
  startDjango();
  
  // Create the main window
  // Note: In production, you might want to delay window creation
  // until Django is ready to accept connections
  createWindow();
});

/**
 * All windows closed event.
 * On macOS, apps typically stay active until user quits explicitly (Cmd+Q).
 * On other platforms, quit when all windows are closed.
 */
app.on('window-all-closed', () => {
  // darwin is macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Before quit event - cleanup before application exits.
 * This ensures the Django server is properly terminated.
 */
app.on('will-quit', () => {
  if (djangoProcess) {
    // Kill the Django process
    djangoProcess.kill();
    console.log('Django server stopped');
  }
});
