const { chromium } = require('playwright');
// Al elegir un producto de supermercado que se parece a un ingrediente tuyo, pregunta antes de crear otro. La lanza `npm run test:e2e`.
const BASE = process.env.BASE;
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" }));
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { localStorage.setItem('stub', JSON.stringify(x)); return true; },
    buscarAlimentos: async () => [{ product_name: 'Pechuga de pollo fileteada', brands: 'Marca', code: '8400000000017', nutriments: { 'energy-kcal_100g': 110, proteins_100g: 23 } }, { product_name: 'Kombucha de jengibre', brands: 'Otra', code: '8400000000024', quantity: '330 g', nutriments: { 'energy-kcal_100g': 20, proteins_100g: 0 } }] }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot');
  const nIng = () => p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('stub')).ingredientes).length); await p.waitForTimeout(600); const n0 = await nIng();
  const buscar = async (t) => { await p.click('#add-extra'); await p.waitForSelector('#buscar-alimento'); await p.fill('#buscar-alimento', t); await p.waitForSelector('.res:has-text("(Marca)"), .res:has-text("(Otra)")', { timeout: 8000 }); };
  await buscar('pechuga'); await p.locator('.res:has-text("fileteada")').click(); await p.waitForSelector('#parecidos');
  ok((await p.textContent('#parecidos')).includes('Pechuga de pollo'), 'Un producto parecido a uno tuyo pregunta "¿Ya lo tenías?"');
  await p.locator('#parecidos .row').first().click(); await p.waitForSelector('#extra-cant'); await p.waitForTimeout(500);
  ok(await nIng() === n0, 'Si eliges el tuyo no se crea otro ingrediente');
  ok(await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('stub')).ingredientes).some((g) => g.code === '8400000000017')), 'y el tuyo se queda con el código de barras');
  await p.locator('.sheet').last().locator('header .btn.plain').click();
  await buscar('kombucha'); await p.locator('.res:has-text("Kombucha")').click(); await p.waitForSelector('#extra-cant'); ok(await p.locator('#parecidos').count() === 0, 'Si no se parece a nada tuyo, no pregunta');
  await p.locator('.sheet').last().locator('header .btn.plain').click(); await p.waitForTimeout(400); ok(await nIng() === n0 + 1, 'y se crea como ingrediente nuevo');
  ok(errs.length === 0, 'Sin errores JS ' + errs.join('|')); await b.close();
})();
