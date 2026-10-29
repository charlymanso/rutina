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
  const b = await chromium.launch(); let p = await nuevo(b, false);
  ok(await p.locator('#cambiar-entreno').count() === 0 && await p.locator('#entreno-hoy').count() === 0, 'Hoy con entreno: no hay botón suelto "Cambiar entreno"');
  await p.click('#slot-gym'); await p.waitForSelector('#ej-anadir'); const n0 = await p.locator('.ficha').count(); ok(await p.locator('#entreno-cambiar').count() === 1, 'Dentro del entreno sí se puede cambiar');
  // añadir ejercicio nuevo
  await p.click('#ej-anadir'); await p.waitForSelector('#ej-nombre'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); ok((await p.locator('.sheet').last().textContent()).includes('Escribe el nombre'), 'Pide nombre');
  await p.fill('#ej-nombre', 'Fondos en paralelas'); await p.fill('#ej-series', '4'); await p.fill('#ej-reps', '12'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  ok(await p.locator('.ficha').count() === n0 + 1 && (await p.textContent('#ficha-fondos-en-paralelas')).includes('4×12') && (await p.textContent('#ficha-fondos-en-paralelas')).includes('Extra'), 'El ejercicio nuevo aparece como Extra con 4×12');
  await p.fill('#kg-fondos-en-paralelas', '20'); await p.press('#kg-fondos-en-paralelas', 'Tab'); await p.click('#hecho-fondos-en-paralelas'); await p.waitForTimeout(200);
  let g = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); const f = Object.keys(d.dias).find((k) => d.dias[k].ejExtra); return { d: d.dias[f], sesion: d.entreno.sesiones.find((x) => x.id === 's2') }; });
  ok(g.d.gym['fondos-en-paralelas'].kg === 20 && g.d.gym['fondos-en-paralelas'].hecho && g.sesion.ej.length === n0, 'Se registra su peso y la sesión del plan NO cambia');
  ok((await p.textContent('#entreno-progreso')).startsWith('1 de ' + (n0 + 1)), 'El progreso cuenta el ejercicio nuevo');
  await p.click('#ej-anadir'); await p.fill('#ej-nombre', 'Fondos en paralelas'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); ok((await p.locator('.sheet').last().textContent()).includes('ya está'), 'No deja repetir un ejercicio'); await p.click('.sheet >> nth=-1 >> text=Cancelar');
  // quitar un ejercicio del plan solo por hoy
  const primero = await p.locator('.ficha').first().getAttribute('id'); await p.click(`#quitar-${primero.replace('ficha-', '')}`); await p.waitForTimeout(200);
  ok(await p.locator('.ficha').count() === n0 && await p.locator('#ej-restaurar').count() === 1, 'Quitar un ejercicio del plan lo oculta solo hoy y ofrece restaurar');
  g = await p.evaluate(() => JSON.parse(localStorage.getItem('stub')).entreno.sesiones.find((x) => x.id === 's2').ej.length); ok(g === n0, 'La sesión del plan sigue intacta (' + g + ' ejercicios)');
  await p.click('#ej-restaurar'); ok(await p.locator('.ficha').count() === n0 + 1, 'Restaurar lo devuelve');
  await p.click('#quitar-fondos-en-paralelas'); await p.waitForTimeout(200); ok(await p.locator('#ficha-fondos-en-paralelas').count() === 0, 'Se puede borrar el ejercicio añadido');
  ok((await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); const f = Object.keys(d.dias).find((k) => d.dias[k].entreno === 's2'); return !d.dias[f].ejExtra && !(d.dias[f].gym && d.dias[f].gym['fondos-en-paralelas']); })), 'Y su registro de hoy también');
  await p.click('.toast-undo'); await p.waitForTimeout(250);
  ok(await p.locator('#ficha-fondos-en-paralelas').count() === 1 && (await p.inputValue('#kg-fondos-en-paralelas')) === '20' && (await p.getAttribute('#hecho-fondos-en-paralelas', 'aria-pressed')) === 'true', 'Deshacer devuelve el ejercicio con su peso y su check');
  await p.click('#quitar-' + primero.replace('ficha-', '')); await p.click('.toast-undo'); await p.waitForTimeout(250); ok(await p.locator('#' + primero).count() === 1 && await p.locator('#ej-restaurar').count() === 0, 'Deshacer también devuelve uno del plan');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.locator('.sheet').count() === 0, 'Escape cierra la ventana');
  ok(p.errs.length === 0, 'Sin errores JS ' + p.errs.join('|'));
  // ---- móvil: deslizar ----
  p = await nuevo(b, true);
  await p.click('#slot-gym'); await p.waitForSelector('#ej-anadir'); ok(await p.locator('.hint-swipe').isVisible(), 'En móvil hay una pista para deslizar');
  const n1 = await p.locator('.ficha').count(); const id1 = await p.locator('.ficha').first().getAttribute('id');
  await swipe(p, '.swipe >> nth=0', -30); ok(await p.locator('.ficha').count() === n1 && (await p.locator('.swipe-in >> nth=0').evaluate((e) => e.style.transform)) === '', 'Un deslizamiento corto no borra y vuelve a su sitio');
  await swipe(p, '.swipe >> nth=0', -100); const tr = await p.locator('.swipe-in >> nth=0').evaluate((e) => e.style.transform); ok(tr.includes('-88'), 'Al deslizar queda abierto el botón Quitar (' + tr + ')');
  ok(await p.locator('.swipe-del >> nth=0').isVisible(), 'Se ve el botón rojo'); await pulsarBorrar(p, '.swipe-del >> nth=0'); await p.waitForTimeout(250);
  ok(await p.locator('.ficha').count() === n1 - 1 && await p.locator('#' + id1).count() === 0, 'Pulsar el botón lo quita');
  await p.click('#ej-restaurar'); await swipe(p, '.swipe >> nth=1', -300); await p.waitForTimeout(400); ok(await p.locator('.ficha').count() === n1 - 1, 'Deslizar hasta el final lo borra directamente');
  await p.click('.sheet.grande header .btn:not(.plain)');
  // extras del día en móvil
  await p.evaluate(() => { const f = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; const d = JSON.parse(localStorage.getItem('stub')); const hoy = f(new Date()); d.dias[hoy].extras = [{ n: 'Manzana', q: 1, u: 'ud', k: 52, p: 0.3, c: 14, f: 0.2, tipo: 'snack' }, { n: 'Nueces', q: 20, u: 'g', k: 130, p: 3, c: 3, f: 13, tipo: 'snack' }]; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); });
  await p.reload(); await p.waitForSelector('#add-extra'); await p.evaluate(() => localStorage.removeItem('congelar'));
  ok(await p.locator('.swipe .row:has-text("Manzana")').count() === 1, 'Los extras de hoy se pueden deslizar'); await swipe(p, '.swipe:has-text("Manzana")', -100); await pulsarBorrar(p, '.swipe:has-text("Manzana") .swipe-del'); await p.waitForTimeout(250);
  ok(await p.locator('.swipe:has-text("Manzana")').count() === 0 && await p.locator('.swipe:has-text("Nueces")').count() === 1, 'Borrar un extra deslizando');
  ok(p.errs.length === 0, 'Sin errores JS móvil ' + p.errs.join('|'));
  await p.screenshot({ path: SHOTS + '/swipe.png' }); await b.close();
})();
