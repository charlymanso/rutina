const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rutina', {
  platform: process.platform,
  version: () => ipcRenderer.invoke('app:version'),
  autoUpdate: () => ipcRenderer.invoke('update:soporte'),
  onUpdate: (cb) => ipcRenderer.on('update:estado', (_e, estado) => cb(estado)),
  instalarUpdate: () => ipcRenderer.invoke('update:instalar'),
  load: () => ipcRenderer.invoke('datos:cargar'),
  save: (d) => ipcRenderer.invoke('datos:guardar', d),
  exportar: (d) => ipcRenderer.invoke('datos:exportar', d),
  importar: () => ipcRenderer.invoke('datos:importar'),
});
