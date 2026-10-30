const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function nuevo(b, mobile = false) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1180, height: 900 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" })); await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { localStorage.setItem('stub', JSON.stringify(x)); return true; } }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Carlos'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot'); return p;
}
(async () => {
  const b = await chromium.launch(), p = await nuevo(b, true);
  await p.click('nav >> text=Ajustes'); await p.click('#aj-ingredientes'); await p.waitForSelector('#ing-lista');
  const n0 = await p.locator('#ing-lista .row').count(); ok(n0 > 20, `Ajustes > Ingredientes lista los registrados (${n0})`);
  await p.fill('#ing-buscar', 'pollo'); const nf = await p.locator('#ing-lista .row').count(); ok(nf >= 1 && nf < n0, `Buscar filtra (${nf})`);
  await p.locator('#ing-lista .row').first().click(); await p.waitForSelector('.sheet input[type=text]');
  await p.locator('.sheet input[type=text]').first().fill('Pollo renombrado'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  await p.fill('#ing-buscar', 'renombrado'); ok(await p.locator('#ing-lista .row').count() === 1, 'Renombrar un ingrediente se guarda');
  await p.click('#ing-nuevo'); await p.waitForSelector('.sheet input[type=text]'); await p.locator('.sheet input[type=text]').first().fill('Zumo raro'); await p.locator('.sheet input[type=number]').first().fill('45');
  await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  await p.fill('#ing-buscar', 'zumo raro'); ok(await p.locator('#ing-lista .row').count() === 1, 'Se puede añadir un ingrediente nuevo');
  ok(p.errs.length === 0, 'Sin errores JS ' + p.errs.join('|')); await b.close();
})();
