const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function nuevo(b, movil) {
  const ctx = await b.newContext(movil ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1180, height: 1000 } });
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" }));
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { if (localStorage.getItem('congelar')) return; localStorage.setItem('stub', JSON.stringify(x)); }, version: async () => '0' }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('h1.title');
  await p.waitForTimeout(600);
  await p.evaluate(() => { const f = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; const d = JSON.parse(localStorage.getItem('stub')); const hoy = f(new Date()); d.dias[hoy] = { ...(d.dias[hoy] || { hechos: {} }), entreno: 's2' }; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); });
  await p.reload(); await p.waitForSelector('#slot-gym'); await p.evaluate(() => localStorage.removeItem('congelar')); return p;
}
const swipe = async (p, sel, dx) => {   // gesto táctil real por CDP
  await p.locator(sel).evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(100); const box = await p.locator(sel).boundingBox(), c = await p.context().newCDPSession(p), x = box.x + box.width - 20, y = box.y + box.height / 2;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y }] });
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(350);
};
const pulsarBorrar = async (p, sel) => { const bx = await p.locator(sel).boundingBox(); await p.locator(sel).click({ position: { x: bx.width - 40, y: bx.height / 2 } }); };
(async () => {
  const b = await chromium.launch(), p = await nuevo(b, true);
  ok(await p.locator('.swipe-slot #slot-gym').count() === 1, 'El entreno de Hoy se puede deslizar');
  await swipe(p, '.swipe-slot', -100); ok((await p.locator('.swipe-slot .swipe-in').evaluate((e) => e.style.transform)).includes('-88'), 'Al deslizar sale "Quitar"');
  await pulsarBorrar(p, '.swipe-slot'); await p.waitForTimeout(400);
  ok(await p.locator('#slot-gym').count() === 0 && (await p.textContent('#entreno-hoy')).includes('descanso'), 'Quitado: hoy es descanso');
  await p.click('.toast-undo'); await p.waitForSelector('#slot-gym'); ok(await p.locator('#slot-gym').count() === 1, 'Deshacer devuelve el entreno');
  await swipe(p, '.swipe-slot', -100); await pulsarBorrar(p, '.swipe-slot'); await p.waitForTimeout(400); await p.reload(); await p.waitForSelector('h1.title');
  ok(await p.locator('#slot-gym').count() === 0, 'Se mantiene tras recargar');
  ok(p.errs.length === 0, 'Sin errores JS ' + p.errs.join('|')); await b.close();
})();
