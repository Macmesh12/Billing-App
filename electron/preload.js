const { contextBridge } = require('electron');
// Import contextBridge from Electron

contextBridge.exposeInMainWorld('billingAPI', {
  // Expose API to renderer
  ready: true,
  // Indicate readiness
});
