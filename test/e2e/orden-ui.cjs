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
  await p.click('nav >> text=Entreno'); await p.waitForSelector('#nueva-sesion');
  const titulos = () => p.locator('section.card h2.sec').allTextContents();
  const t0 = await titulos(); ok(t0.length >= 3 && await p.locator('.ord-sube').first().isDisabled() && await p.locator('.ord-baja').last().isDisabled(), `Hay flechas; la primera no sube y la última no baja (${t0.length} sesiones)`);
  await p.locator('.ord-baja').first().click(); await p.waitForTimeout(250); const t1 = await titulos();
  ok(t1[0] === t0[1] && t1[1] === t0[0], 'Bajar la primera sesión la pasa al segundo lugar');
  await p.reload(); await p.waitForSelector('h1.title'); await p.click('nav >> text=Entreno'); await p.waitForSelector('#nueva-sesion'); ok((await titulos())[0] === t0[1], 'El orden se guarda');
  await p.locator('section.card').first().locator('text=Editar').click(); await p.waitForSelector('.exrow');
  const nombres = () => p.locator('.exrow input[aria-label=Ejercicio]').evaluateAll((l) => l.map((x) => x.value)); const e0 = await nombres();
  await p.locator('.exrow .ord-baja').first().click(); const e1 = await nombres(); ok(e1[0] === e0[1] && e1[1] === e0[0], 'Dentro de la sesión se puede reordenar un ejercicio');
  await p.setViewportSize({ width: 340, height: 700 }); await p.screenshot({ path: SHOTS + '/orden.png' });
  const caja = await p.locator('.exrow').first().boundingBox(); ok(caja.width <= 340, 'La fila de ejercicio cabe a 340 px');
  await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  await p.locator('section.card').first().locator('text=Editar').click(); await p.waitForSelector('.exrow'); const e2 = await nombres(); ok(e2[0] === e1[0], 'El orden de ejercicios se guarda ' + e2.slice(0,2) + ' vs ' + e1.slice(0,2));
  ok(p.errs.length === 0, 'Sin errores JS ' + p.errs.join('|')); await b.close();
})();
