const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rutina', {
  platform: process.platform,
  load: () => ipcRenderer.invoke('datos:cargar'),
  save: (d) => ipcRenderer.invoke('datos:guardar', d),
  exportar: (d) => ipcRenderer.invoke('datos:exportar', d),
  importar: () => ipcRenderer.invoke('datos:importar'),
});
