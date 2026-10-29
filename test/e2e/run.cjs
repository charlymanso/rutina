#!/usr/bin/env node
// Lanza todas las pruebas de interfaz contra la app (src/) servida en local.
//   node test/e2e/run.cjs                      → todas, con la fecha de hoy
//   node test/e2e/run.cjs --semana             → todas, simulando cada día de la semana (lun…dom)
//   node test/e2e/run.cjs --fechas=2026-10-26,2026-11-01   → fechas concretas
//   node test/e2e/run.cjs --solo=hoy-ui,compra-ui           → solo algunas
//   node test/e2e/run.cjs --sin-red                         → salta las que necesitan internet
// Requiere Playwright con Chromium (npm i -D playwright && npx playwright install chromium). La de cámara necesita ffmpeg.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const raiz = path.join(__dirname, '..', '..'), src = path.join(raiz, 'src');
const arg = (n) => { const a = process.argv.find((x) => x === '--' + n || x.startsWith('--' + n + '=')); return a ? (a.includes('=') ? a.split('=')[1] : true) : null; };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const SUITES = [['comida', ''], ['comidas-ui', ''], ['plato-ui', ''], ['hoy-ui', ''], ['hoy-cambio', ''], ['entreno-ui', ''], ['entreno-hoy', ''], ['entreno-bloques', ''], ['entreno-dias', ''], ['nav-dur', ''], ['compra-ui', ''], ['ajustes-ui', ''], ['objetivo-ui', ''], ['gate2', ''], ['pwa', 'copia'], ['google-ventana', ''], ['scan-ui', 'red']];

function servir(dir) {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(dir, p); if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => ok({ url: 'http://127.0.0.1:' + s.address().port, cerrar: () => s.close() }));
  });
}
function copiaSrc() { const t = fs.mkdtempSync(path.join(os.tmpdir(), 'rutina-pwa-')); fs.cpSync(src, t, { recursive: true }); return t; }
function camara() {
  if (cp.spawnSync('ffmpeg', ['-version']).status !== 0) return null;
  const y4m = path.join(os.tmpdir(), 'rutina-ean.y4m');
  const r = cp.spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', path.join(__dirname, 'ean.png'), '-t', '2', '-vf', 'scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p', '-r', '10', y4m]);
  return r.status === 0 ? y4m : null;
}

// Asíncrono a propósito: el servidor de la app vive en este mismo proceso y no puede quedarse bloqueado.
function correr(nombre, env) {
  return new Promise((ok) => {
    const h = cp.spawn(process.execPath, ['--require', path.join(__dirname, 'preload.cjs'), path.join(__dirname, nombre + '.cjs')], { cwd: raiz, env: { ...process.env, ...env } });
    let out = '', err = ''; h.stdout.on('data', (d) => { out += d; }); h.stderr.on('data', (d) => { err += d; });
    const t = setTimeout(() => { h.kill('SIGKILL'); err += '\nTiempo agotado (5 min)'; }, 300000);
    h.on('close', (status) => { clearTimeout(t); ok({ status, stdout: out, stderr: err }); });
  });
}

(async () => {
  try { require.resolve('playwright'); } catch { console.error('Falta Playwright: npm i -D playwright && npx playwright install chromium'); process.exit(2); }
  const solo = (arg('solo') || '').split(',').filter(Boolean), sinRed = !!arg('sin-red'), cam = camara();
  const fechas = arg('semana') ? ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map((d) => d + 'T10:00:00')
    : (arg('fechas') ? String(arg('fechas')).split(',').map((d) => (d.includes('T') ? d : d + 'T10:00:00')) : [null]);
  const principal = await servir(src), shots = fs.mkdtempSync(path.join(os.tmpdir(), 'rutina-shots-'));
  let fallos = 0, total = 0; const t0 = Date.now();
  for (const fecha of fechas) {
    if (fecha) console.log(`\n=== Simulando ${new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} ===`);
    for (const [nombre, modo] of SUITES) {
      if (solo.length && !solo.includes(nombre)) continue;
      if (modo === 'red' && (sinRed || !cam)) { console.log(`-  ${nombre}: omitida (${sinRed ? '--sin-red' : 'sin ffmpeg'})`); continue; }
      let srv = principal, dirCopia = null, extra = null;
      if (modo === 'copia') { dirCopia = copiaSrc(); extra = await servir(dirCopia); srv = extra; }
      const t1 = Date.now();
      const r = await correr(nombre, { BASE: srv.url, SHOTS: shots, CAM: cam || '', WEB: dirCopia || '', ...(fecha ? { FAKE_DATE: fecha } : {}) });
      if (extra) extra.cerrar();
      const lineas = (r.stdout || '').split('\n'), oks = lineas.filter((l) => l.startsWith('OK')).length, malas = lineas.filter((l) => l.startsWith('FALLO'));
      const roto = r.status !== 0 && !malas.length; total += oks + malas.length;
      if (malas.length || roto) { fallos += malas.length || 1; console.log(`✗  ${nombre}: ${oks} bien, ${malas.length || 1} mal`); malas.forEach((m) => console.log('     ' + m.slice(0, 220))); if (roto) console.log('     ' + ((r.stderr || r.error || '') + '').split('\n').filter(Boolean).slice(0, 4).join('\n     ').slice(0, 500)); }
      else console.log(`✓  ${nombre}: ${oks} comprobaciones (${((Date.now() - t1) / 1000).toFixed(0)} s)`);
    }
  }
  principal.cerrar();
  console.log(`\n${fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ Todo bien'} · ${total} comprobaciones · ${((Date.now() - t0) / 1000).toFixed(0)} s · capturas en ${shots}`);
  process.exit(fallos ? 1 : 0);
})();
