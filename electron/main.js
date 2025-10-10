const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let djangoProcess;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  });

  const frontendEntry = path.join(__dirname, '..', 'frontend', 'public', 'index.html');
  mainWindow.loadFile(frontendEntry);
}

function startDjango() {
  djangoProcess = spawn('python', ['manage.py', 'runserver', '127.0.0.1:8765'], {
    cwd: path.join(__dirname, '..', 'backend'),
    stdio: 'inherit'
  });
}

app.on('ready', () => {
  startDjango();
  createWindow();
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
});
