/**
 * Electron Preload Script
 * 
 * This script runs in the renderer process before the web page loads.
 * It provides a secure bridge between the Electron main process and
 * the renderer process using contextBridge.
 * 
 * Security:
 * - contextIsolation is enabled to separate contexts
 * - Only explicitly exposed APIs are available to the web page
 * - Node.js APIs are not directly accessible from the renderer
 */

const { contextBridge } = require('electron');

// Expose a limited API to the renderer process
// This creates a global 'billingAPI' object in the renderer
contextBridge.exposeInMainWorld('billingAPI', {
  // Readiness flag to indicate the API is loaded
  ready: true,
  
  // Future: Add secure IPC methods here as needed
  // Example: savePDF: (data) => ipcRenderer.invoke('save-pdf', data)
});
