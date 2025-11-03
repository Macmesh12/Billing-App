/**
 * Electron Preload Script
 * 
 * This script runs in a privileged context before the renderer process loads.
 * It uses contextBridge to safely expose APIs to the renderer without
 * compromising security by directly exposing Node.js/Electron APIs.
 * 
 * Security: Context isolation is enabled in main.js, so this bridge is
 * required for any Electron-specific functionality needed by the renderer.
 */

const { contextBridge } = require('electron');

/**
 * Expose Billing App API to Renderer Process
 * 
 * Creates a global 'billingAPI' object in the renderer's window that
 * provides controlled access to Electron functionality.
 * 
 * Currently exposes:
 * - ready: Boolean flag indicating the API is available
 */
contextBridge.exposeInMainWorld('billingAPI', {
  ready: true, // Indicates the billing API is initialized and ready
});
