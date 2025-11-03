/**
 * ELECTRON PRELOAD SCRIPT
 * 
 * This script runs in the renderer process before the web page loads.
 * It provides a secure bridge between the Electron main process and
 * the renderer process (web page) using contextBridge.
 * 
 * Security:
 * - Runs with Node.js access but in isolated context
 * - Only exposes explicitly defined APIs to renderer
 * - Prevents direct access to Node.js or Electron APIs from web code
 * 
 * Currently exposes a minimal billingAPI with ready flag.
 * Can be extended to add IPC communication, file system access, etc.
 */

const { contextBridge } = require('electron');

/**
 * Expose safe API to renderer process
 * 
 * This object is accessible in the renderer as window.billingAPI
 * All properties/methods here are safely exposed to the web context.
 */
contextBridge.exposeInMainWorld('billingAPI', {
  // Ready flag to indicate Electron environment is initialized
  ready: true,
  
  // Future extensions could include:
  // - IPC communication methods
  // - File system operations
  // - Print functionality
  // - Window management
});
