const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const FILE = () => path.join(app.getPath('userData'), 'rutina-datos.json');

if (!app.requestSingleInstanceLock()) app.quit();

function crearVentana() {
  const mac = process.platform === 'darwin';
  const win = new BrowserWindow({
    width: 1120, height: 760, minWidth: 420, minHeight: 560, show: false,
    backgroundColor: '#f5f5f7',
    titleBarStyle: mac ? 'hiddenInset' : 'default',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  // Nada de navegar fuera de la app: los enlaces externos se abren en el navegador
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// Guardado atómico: se escribe en un temporal y se renombra, así un corte de luz no corrompe los datos.
function guardar(json) {
  const f = FILE(), tmp = f + '.tmp';
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(json));
  if (fs.existsSync(f)) fs.copyFileSync(f, f + '.bak');
  fs.renameSync(tmp, f);
}

ipcMain.handle('datos:cargar', () => {
  for (const f of [FILE(), FILE() + '.bak']) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* prueba la copia */ }
  }
  return null;
});
ipcMain.handle('app:version', () => app.getVersion());

// Actualización automática: solo en Windows y con la app instalada. En Mac sin firma de Apple macOS no la permite.
let actualizador = null, ultimaComprobacion = 0;
function avisar(estado) { for (const w of BrowserWindow.getAllWindows()) w.webContents.send('update:estado', estado); }
function iniciarActualizador() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  try {
    ({ autoUpdater: actualizador } = require('electron-updater'));
    actualizador.autoDownload = true; actualizador.autoInstallOnAppQuit = true;
    actualizador.on('update-available', (i) => avisar({ fase: 'descargando', version: i.version }));
    actualizador.on('download-progress', (p) => avisar({ fase: 'descargando', porcentaje: Math.round(p.percent) }));
    actualizador.on('update-downloaded', (i) => avisar({ fase: 'listo', version: i.version }));
    actualizador.on('error', () => avisar({ fase: 'error' }));
    comprobarActualizacion();
    setInterval(comprobarActualizacion, 6 * 3600 * 1000);
  } catch { actualizador = null; }
}
function comprobarActualizacion() {
  if (!actualizador || Date.now() - ultimaComprobacion < 10 * 60 * 1000) return;
  ultimaComprobacion = Date.now(); actualizador.checkForUpdates().catch(() => avisar({ fase: 'error' }));
}
ipcMain.handle('update:soporte', () => !!actualizador);
ipcMain.handle('update:instalar', () => { if (actualizador) actualizador.quitAndInstall(false, true); });
ipcMain.handle('datos:guardar', (_e, json) => { guardar(json); return true; });
ipcMain.handle('datos:exportar', async (e, json) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showSaveDialog(w, { defaultPath: 'rutina-copia.json', filters: [{ name: 'Copia de Rutina', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, JSON.stringify(json, null, 2)); return true;
});
ipcMain.handle('datos:importar', async (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showOpenDialog(w, { properties: ['openFile'], filters: [{ name: 'Copia de Rutina', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try { return JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')); } catch { return null; }
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  crearVentana();
  iniciarActualizador();
  app.on('browser-window-focus', comprobarActualizacion);
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) crearVentana(); });
});
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
