const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + process.env.CAM + ''] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['camera'] }), errs = [];
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  // sin window.rutina: modo web. La nube es la real (config por defecto).
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(1500); await p.screenshot({ path: SHOTS + '/scan-0.png' });
  if (await p.locator('text=/invitado/i').count()) await p.locator('text=/invitado/i').first().click();
  await p.waitForTimeout(500);
  if (await p.locator('input[placeholder="Tu nombre"]').count()) { await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); }
  await p.waitForSelector('h1.title'); await p.click('nav >> text=Menú'); await p.click('.plato >> nth=0'); await p.click('#anadir-alimento'); await p.waitForSelector('#buscar-alimento');
  ok(await p.locator('#escanear').count() === 1, 'Hay botón de escanear');
  await p.fill('#buscar-alimento', 'yogur griego'); await p.waitForFunction(() => [...document.querySelectorAll('.sheet')].pop().textContent.includes('Productos de supermercado') && ![...document.querySelectorAll('.sheet')].pop().textContent.includes('Buscando'), null, { timeout: 25000 });
  const t = await p.locator('.sheet').last().textContent(); ok(!t.includes('solo está en la app') && !t.includes('No se pudo consultar'), 'Búsqueda de marcas funciona en la web');
  ok(await p.locator('.res').count() > 3, 'Hay resultados (' + await p.locator('.res').count() + ')');
  await p.fill('#buscar-alimento', '');
  await p.click('#escanear'); await p.waitForSelector('.scan-video');
  await p.waitForFunction(() => document.getElementById('buscar-alimento').value.length > 5, null, { timeout: 20000 }).catch(() => {});
  const v = await p.inputValue('#buscar-alimento'); ok(v === '3017620422003', 'Lee el código del vídeo: ' + v);
  ok(await p.locator('.scan-video').count() === 0, 'Se cierra la cámara tras leer');
  await p.waitForFunction(() => [...document.querySelectorAll('.sheet')].pop().textContent.includes('Nutella') || document.querySelectorAll('.res').length > 0, null, { timeout: 20000 }).catch(() => {});
  ok((await p.locator('.sheet').last().textContent()).toLowerCase().includes('nutella') || (await p.locator('.res').count()) > 0, 'Muestra el producto del código');
  await p.screenshot({ path: SHOTS + '/scan-res.png' });
  await p.click('.res >> nth=0'); await p.waitForTimeout(300); await p.click('#anadir-alimento'); await p.fill('#buscar-alimento', 'nutella'); await p.waitForTimeout(300);
  const primero = await p.evaluate(() => (() => { const sh = [...document.querySelectorAll('.sheet')].pop(); return sh.querySelector('.label').textContent + '|' + sh.querySelector('.res').textContent; })());
  ok(primero.startsWith('Usados antes|') && primero.toLowerCase().includes('nutella'), 'Lo ya usado sale primero al buscar: ' + primero.slice(0, 40));
  await p.waitForFunction(() => ![...document.querySelectorAll('.sheet')].pop().textContent.includes('Buscando'), null, { timeout: 20000 });
  ok(await p.evaluate(() => [...[...document.querySelectorAll('.sheet')].pop().querySelectorAll('.res')].filter((r) => /nutella/i.test(r.textContent) && r.textContent.includes('539 kcal')).length) === 1, 'Y el mismo producto no se repite en la lista de supermercado');
  ok(errs.length === 0, 'Sin errores JS ' + errs.join('|'));
  await b.close();
})();
