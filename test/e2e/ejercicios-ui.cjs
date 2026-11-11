const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function nuevo(b, mobile = false) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1180, height: 900 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" })); await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { if (localStorage.getItem('congelar')) return; localStorage.setItem('stub', JSON.stringify(x)); return true; } }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Carlos'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot'); return p;
}
(async () => {
  const b = await chromium.launch(), p = await nuevo(b, true);
  await p.waitForTimeout(700); await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); d.dias['2026-10-26'] = { gym: { 'press-banca': { kg: 60, hecho: true } } }; d.dias['2026-11-02'] = { gym: { 'press-banca': { kg: 62.5, hecho: true }, 'dominadas': { kg: 5, hecho: true } }, ejExtra: [{ n: 'Dominadas', s: '3×6', c: true }] }; localStorage.setItem('stub', JSON.stringify(d)); localStorage.setItem('congelar', '1'); });
  await p.reload(); await p.waitForSelector('h1.title'); await p.evaluate(() => localStorage.removeItem('congelar')); await p.click('nav >> text=Ajustes'); await p.click('#aj-ejercicios'); await p.waitForSelector('#ejs-lista');
  const grupos = await p.locator('#ejs-lista section').evaluateAll((l) => l.map((x) => x.id)); ok(grupos.includes('ejs-push') && grupos.includes('ejs-pull') && grupos.includes('ejs-pierna'), 'Ejercicios agrupados: ' + grupos.join(', '));
  const sesLunes = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); const x = d.entreno.sesiones.find((y) => (y.dias || []).includes(0)); return x ? x.t : ''; });   // 2026-11-02 es lunes
  ok(await p.locator('#ejs-antiguos').count() === 0 && (await p.textContent('#ejs-lista')).includes('Dominadas'), 'Lo que añadiste solo un día sigue en la lista, en un grupo (sesión de ese lunes: ' + sesLunes + ')');
  ok((await p.textContent('#ejs-push')).includes('62,5 kg'), 'Se ve el último peso (62,5 kg)');
  await p.fill('#ejs-buscar', 'press banca'); await p.locator('#ejs-lista .row').first().click(); await p.waitForSelector('#ej-hist');
  ok((await p.locator('#ej-hist .row').count()) === 2, 'El historial lista cada registro');
  await p.fill('#ej-nom', 'Press banca plano'); await p.fill('#ej-ser', '5×5'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  await p.fill('#ejs-buscar', 'plano'); const txt = await p.textContent('#ejs-lista'); ok(txt.includes('Press banca plano') && txt.includes('5×5') && txt.includes('62,5 kg'), 'Renombrar conserva el peso y cambia las series: ' + txt.replace(/\s+/g, ' ').slice(0, 90));
  await p.fill('#ejs-buscar', 'dominadas'); await p.locator('#ejs-lista .row').first().click(); await p.waitForSelector('#ej-grupo'); await p.selectOption('#ej-grupo', 'pierna'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  await p.fill('#ejs-buscar', ''); ok((await p.textContent('#ejs-pierna')).includes('Dominadas'), 'Se puede elegir el grupo a mano');
  ok(p.errs.length === 0, 'Sin errores JS ' + p.errs.join('|')); await b.close();
})();
