const { app, BrowserWindow, ipcMain, dialog, shell, session, safeStorage, net } = require('electron');
const http = require('node:http');
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

// Base de alimentos online (Open Food Facts). Se consulta desde aquí porque su buscador no admite llamadas directas desde una página.
const CAMPOS = 'code,product_name,brands,quantity,nutriments';
const UA = () => ({ 'User-Agent': `Rutina/${app.getVersion()} (https://github.com/charlymanso/rutina)` });
async function consultar(url) {
  const r = await net.fetch(url, { headers: UA(), signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
ipcMain.handle('alimentos:buscar', async (_e, q) => {
  q = String(q || '').trim().slice(0, 80); if (q.length < 2) return [];
  const u = new URL('https://search.openfoodfacts.org/search');
  u.searchParams.set('q', q); u.searchParams.set('page_size', '20'); u.searchParams.set('langs', 'es'); u.searchParams.set('fields', CAMPOS);
  return (await consultar(u.toString())).hits || [];
});
ipcMain.handle('alimentos:codigo', async (_e, codigo) => {
  codigo = String(codigo || '').trim(); if (!/^\d{6,14}$/.test(codigo)) return null;
  const j = await consultar(`https://world.openfoodfacts.org/api/v2/product/${codigo}?fields=${CAMPOS}`);
  return j.status === 0 ? null : j.product || null;
});

// Sesión de la cuenta: se guarda cifrada con el llavero del sistema (Windows/Mac). Nunca va dentro del archivo de datos.
const SESION = () => path.join(app.getPath('userData'), 'sesion.bin');
ipcMain.handle('sesion:cargar', () => {
  try {
    if (!fs.existsSync(SESION())) return null;
    const buf = fs.readFileSync(SESION());
    return JSON.parse(safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8'));
  } catch { return null; }
});
ipcMain.handle('sesion:guardar', (_e, s) => {
  if (!s) { try { fs.rmSync(SESION(), { force: true }); } catch { /* ya no existe */ } return true; }
  const txt = JSON.stringify(s);
  fs.writeFileSync(SESION(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(txt) : txt, { mode: 0o600 });
  return true;
});

// Inicio de sesión con Google: se abre el navegador del sistema y Google devuelve el código a una dirección local temporal.
const PAGINA = (ok) => `<!doctype html><meta charset="utf-8"><title>Rutina</title><body style="font:18px -apple-system,Segoe UI,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#f5f5f7;color:#1d1d1f"><div style="text-align:center"><h1 style="font-size:28px">${ok ? 'Listo' : 'No se pudo entrar'}</h1><p>${ok ? 'Ya puedes volver a Rutina y cerrar esta pestaña.' : 'Vuelve a Rutina e inténtalo de nuevo.'}</p></div>`;
ipcMain.handle('oauth:abrir', (_e, url) => new Promise((resolve, reject) => {
  let u; try { u = new URL(url); } catch { return reject(new Error('Dirección no válida.')); }
  if (u.protocol !== 'https:' || !u.hostname.endsWith('.supabase.co')) return reject(new Error('Dirección no permitida.'));
  const t = setTimeout(() => { srv.close(); reject(new Error('Se agotó el tiempo. Inténtalo de nuevo.')); }, 180000);
  const srv = http.createServer((req, res) => {
    const q = new URL(req.url, 'http://127.0.0.1');
    if (q.pathname !== '/callback') { res.writeHead(404); return res.end(); }
    const code = q.searchParams.get('code');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(PAGINA(!!code));
    clearTimeout(t); srv.close();
    code ? resolve(code) : reject(new Error(q.searchParams.get('error_description') || 'Se canceló el inicio de sesión.'));
  });
  srv.on('error', () => { clearTimeout(t); reject(new Error('No se pudo abrir la conexión local (puerto 53682 ocupado).')); });
  srv.listen(53682, '127.0.0.1', () => shell.openExternal(url));
}));

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  crearVentana();
  iniciarActualizador();
  app.on('browser-window-focus', comprobarActualizacion);
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) crearVentana(); });
});
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
