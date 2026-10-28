const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rutina', {
  platform: process.platform,
  version: () => ipcRenderer.invoke('app:version'),
  autoUpdate: () => ipcRenderer.invoke('update:soporte'),
  onUpdate: (cb) => ipcRenderer.on('update:estado', (_e, estado) => cb(estado)),
  sesion: { cargar: () => ipcRenderer.invoke('sesion:cargar'), guardar: (x) => ipcRenderer.invoke('sesion:guardar', x) },
  oauth: (url) => ipcRenderer.invoke('oauth:abrir', url),
  buscarAlimentos: (q) => ipcRenderer.invoke('alimentos:buscar', q),
  alimentoPorCodigo: (c) => ipcRenderer.invoke('alimentos:codigo', c),
  instalarUpdate: () => ipcRenderer.invoke('update:instalar'),
  load: () => ipcRenderer.invoke('datos:cargar'),
  save: (d) => ipcRenderer.invoke('datos:guardar', d),
  exportar: (d) => ipcRenderer.invoke('datos:exportar', d),
  importar: () => ipcRenderer.invoke('datos:importar'),
});
