const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('billingAPI', {
  ready: true,
});
