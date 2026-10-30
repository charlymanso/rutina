const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE;
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" }));
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { if (localStorage.getItem('congelar')) return; localStorage.setItem('stub', JSON.stringify(x)); }, version: async () => '0' }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('h1.title'); await p.waitForTimeout(600);
  const fijar = async (hogar) => {   // hoy toca un plato normal en comida y cena (sea cual sea el día) y quien comparte lo que se indique
    await p.evaluate((hg) => { const d = JSON.parse(localStorage.getItem('stub')), i = (new Date().getDay() + 6) % 7, sem = d.menu.semanas[0]; sem[i].comida = JSON.parse(JSON.stringify(sem[0].comida)); sem[i].cena = JSON.parse(JSON.stringify(sem[0].cena)); d.dias = {}; d.perfil.hogar = hg; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); }, hogar);
    await p.reload(); await p.waitForSelector('#slot-comida'); await p.evaluate(() => localStorage.removeItem('congelar'));
  };
  await fijar([]); ok(await p.locator('.cocinar-btn').count() === 0, 'Quien come solo: no hay botón "Para cocinar"');
  await fijar([{ id: 'h1', n: 'Marta', f: 0.7, comidas: ['comida'] }]);
  ok(await p.locator('#cocinar-comida').count() === 1 && (await p.textContent('#cocinar-comida')) === 'Para cocinar · 2 personas', 'Si Marta come contigo: "Para cocinar · 2 personas" en la comida');
  ok(await p.locator('#cocinar-cena').count() === 0 && await p.locator('#cocinar-desayuno').count() === 0, 'En lo que no compartís no sale');
  await p.click('#cocinar-comida'); await p.waitForSelector('#cocinar-lista');
  const nIng = await p.locator('#cocinar-lista .item').count(); ok(nIng >= 3 && (await p.textContent('#cocinar-titulo')).length > 3, `Muestra el plato y sus ${nIng} ingredientes`);
  const fila = p.locator('#cocinar-lista .item:has-text("Pechuga de pollo")');
  ok((await fila.locator('.q').textContent()).includes('150') && (await fila.textContent()).includes('Tú 88 g') && (await fila.textContent()).includes('Marta 62 g'), 'Pollo: las cantidades del plato tal cual, 150 g (tú 88 g · Marta 62 g): ' + (await fila.textContent()).replace(/\s+/g, ' ').slice(0, 70));
  await fila.click(); ok((await p.locator('#cocinar-lista .item:has-text("Pechuga de pollo")').getAttribute('aria-pressed')) === 'true', 'Tocar un ingrediente lo marca'); await p.locator('.sheet').last().locator('header .btn').first().click();
  // lo que cambias hoy se refleja al cocinar
  await p.click('#slot-comida'); await p.waitForSelector('#plato-elegir'); await p.click('#porcion-2'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  await p.click('#cocinar-comida'); await p.waitForSelector('#cocinar-lista'); ok((await p.locator('#cocinar-lista .item:has-text("Pechuga de pollo") .q').textContent()).includes('300'), 'Si hoy comes el doble, al cocinar sale el doble: 300 g'); await p.locator('.sheet').last().locator('header .btn').first().click();
  // unidades: 2 fajitas para ti, 2 para ella
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')), i = (new Date().getDay() + 6) % 7; d.ingredientes.faj = { n: 'Fajita', u: 'ud', k: 150, p: 5, s: 'pan', pl: 'Fajitas' }; d.menu.semanas[0][i].comida = { t: 'Fajitas', items: [['faj', 4]] }; d.dias = {}; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); });
  await p.reload(); await p.waitForSelector('#cocinar-comida'); await p.evaluate(() => localStorage.removeItem('congelar')); await p.click('#cocinar-comida'); await p.waitForSelector('#cocinar-lista');
  const f2 = await p.textContent('#cocinar-lista .item'); ok(f2.includes('4 Fajitas') && f2.includes('Tú 2 Fajitas') && f2.includes('Marta 2 Fajitas'), 'Por unidades: 4 fajitas, 2 para ti y 2 para ella: ' + f2.replace(/\s+/g, ' ').slice(0, 80)); await p.locator('.sheet').last().locator('header .btn').first().click();
  // comida libre: no hay nada que cocinar con cantidades
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')), i = (new Date().getDay() + 6) % 7; d.menu.semanas[0][i].comida = { t: 'Comida libre', libre: true, items: [] }; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); });
  await p.reload(); await p.waitForSelector('#slot-comida'); await p.evaluate(() => localStorage.removeItem('congelar')); ok(await p.locator('#cocinar-comida').count() === 0, 'Comida libre: sin botón');
  ok(errs.length === 0, 'Sin errores JS ' + errs.join('|'));
  await b.close();
})();
