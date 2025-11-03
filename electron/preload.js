/**
 * ============================================
 * ELECTRON PRELOAD SCRIPT
 * ============================================
 * This script runs in the renderer process before any other scripts.
 * It provides a secure bridge between the main process and the renderer
 * process using Electron's contextBridge API.
 * 
 * Purpose:
 * - Expose safe, limited APIs to the renderer process
 * - Maintain security through context isolation
 * - Provide application state information
 * ============================================
 */

const { contextBridge } = require('electron');

/**
 * Expose a minimal API to the renderer process
 * This object will be accessible as window.billingAPI in the frontend
 */
contextBridge.exposeInMainWorld('billingAPI', {
  ready: true, // Indicates that the Electron environment is ready
});
