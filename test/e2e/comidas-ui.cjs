const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function nuevo(b) {
  const ctx = await b.newContext({ viewport: { width: 1180, height: 1000 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" })); await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { localStorage.setItem('stub', JSON.stringify(x)); return true; } }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot'); return p;
}
const kc = (t) => parseInt(String(t).replace(/\./g, '').match(/(\d+)\s*kcal/)[1], 10);
(async () => {
  const b = await chromium.launch(); const p = await nuevo(b); const hoyIdx = await p.evaluate(() => (new Date().getDay() + 6) % 7);
  await p.click('nav >> text=Menú'); await p.waitForSelector('#fija-desayuno-0');
  // ---- cada día muestra su desayuno y media mañana ----
  ok(await p.locator('[id^=fija-desayuno-]').count() === 7 && await p.locator('[id^=fija-media-]').count() === 7 && await p.locator('[id^=fija-merienda-]').count() === 0, 'El menú muestra desayuno y media mañana de cada día (la merienda está desactivada)');
  ok((await p.textContent('#fija-desayuno-0')).includes('Avena con yogur y plátano') && (await p.textContent('#fija-desayuno-0')).includes('kcal'), 'Con el predeterminado y sus kcal');
  const k0 = kc(await p.textContent('.dayrow:nth-child(1) .dtot')), k5 = kc(await p.textContent('.dayrow:nth-child(6) .dtot'));
  // ---- editar el desayuno del lunes y repetirlo lunes a viernes ----
  await p.click('nav >> text=Ajustes'); await p.click('#aj-platos'); await p.click('#plato-nuevo'); await p.fill('#nuevo-plato-nombre', 'Tostadas con aguacate'); await p.locator('.sheet').last().locator('#anadir-alimento').click(); await p.fill('#buscar-alimento', 'aguacate'); await p.click('.res >> text=Aguacate'); await p.waitForTimeout(200); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(250); await p.click('nav >> text=Menú');
  await p.click('#fija-desayuno-0'); await p.waitForSelector('#rep-dias'); ok((await p.textContent('.sheet header h3')) === 'Lunes · Desayuno', 'Abre "Lunes · Desayuno"');
  ok((await p.textContent('#plato-nombre')) === 'Avena con yogur y plátano' && await p.locator('#plato-nombre').evaluate((e) => e.tagName) === 'DIV', 'El nombre del plato sale fijo (no editable)'); ok((await p.getAttribute('#rep-dia-0', 'disabled')) !== null && (await p.getAttribute('#rep-dia-0', 'aria-pressed')) === 'true', 'Repetir en: el lunes va marcado y fijo');
  ok((await p.textContent('#rep-nota')).includes('Solo cambia el lunes'), 'Por defecto solo cambia el día que editas');
  await p.click('#plato-elegir'); await p.click('.res:has-text("Tostadas con aguacate")'); await p.waitForTimeout(150);
  ok((await p.textContent('#plato-total')).includes('kcal'), 'Calorías en vivo también en el desayuno');
  await p.click('#rep-laborables'); ok((await p.textContent('#rep-nota')).match(/martes|mar/i) && (await p.textContent('#rep-nota')).includes('sustituye'), 'Lunes a viernes: avisa de qué días cambia: ' + (await p.textContent('#rep-nota')).slice(0, 60));
  ok(await p.locator('#rep-dias .chipopt[aria-pressed=true]').count() === 5, '5 días marcados'); await p.click('.sheet header .btn:not(.plain)'); await p.waitForSelector('.toast'); ok((await p.textContent('.toast')).includes('5 días'), 'Guardado en 5 días');
  for (const i of [0, 1, 2, 3, 4]) ok((await p.textContent('#fija-desayuno-' + i)).includes('Tostadas con aguacate') && (await p.getAttribute('#fija-desayuno-' + i, 'class')).includes('propio'), `${['Lun', 'Mar', 'Mié', 'Jue', 'Vie'][i]}: tostadas con aguacate (marcado como propio)`);
  for (const i of [5, 6]) ok((await p.textContent('#fija-desayuno-' + i)).includes('Avena con yogur'), `${['Sáb', 'Dom'][i - 5]}: sigue con el predeterminado`);
  const k0b = kc(await p.textContent('.dayrow:nth-child(1) .dtot')), k5b = kc(await p.textContent('.dayrow:nth-child(6) .dtot'));
  ok(k0b !== k0 && k5b === k5, `Cambian las kcal de lunes (${k0} → ${k0b}) y no las del sábado (${k5})`);
  // ---- Hoy y Compra ----
  await p.click('nav >> text=Hoy'); const tit = await p.textContent('.slot:has-text("Desayuno") h3'); ok(hoyIdx <= 4 ? tit.includes('Tostadas') : tit.includes('Avena'), `Hoy (${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'][hoyIdx]}) muestra el desayuno de su día: ${tit}`);
  await p.click('nav >> text=Compra'); ok((await p.textContent('.page')).includes('Aguacate'), 'La lista de la compra incluye el aguacate del desayuno');
  // ---- volver al predeterminado ----
  await p.click('nav >> text=Menú'); await p.click('#fija-desayuno-1'); await p.click('#plato-predeterminado'); await p.waitForTimeout(250);
  ok((await p.textContent('#fija-desayuno-1')).includes('Avena con yogur') && !(await p.getAttribute('#fija-desayuno-1', 'class')).includes('propio'), 'Martes vuelve al predeterminado'); ok((await p.textContent('#fija-desayuno-0')).includes('Tostadas'), 'Y los otros días no se tocan');
  // ---- comida: repetir toda la semana ----
  await p.click('#plato-comida-1'); await p.click('#rep-todos'); ok(await p.locator('#rep-dias .chipopt[aria-pressed=true]').count() === 7, '"Toda la semana" marca los 7 días'); const nombre = await p.textContent('#plato-nombre'); await p.click('.sheet header .btn:not(.plain)'); await p.waitForTimeout(250);
  const titulos = await p.locator('[id^=plato-comida-] h3').allTextContents(); ok(titulos.length === 7 && new Set(titulos).size === 1 && titulos[0] === nombre, `La comida se repite los 7 días: "${nombre}"`);
  // ---- Comidas y horarios ----
  await p.click('#comidas-horarios'); await p.waitForSelector('text=Comidas y horarios');
  ok(await p.locator('.sheet .row input[type=time]').count() === 4, 'Horas de las comidas activas (desayuno, media, comida, cena)');
  await p.click('.sheet .row:has-text("Merienda") .switch'); await p.waitForTimeout(150); ok(await p.locator('.sheet .row:has-text("Merienda") input[type=time]').count() === 1, 'Activar la merienda muestra su hora');
  await p.click('.sheet .row:has-text("Desayuno") .switch'); await p.waitForTimeout(150); await p.click('#ciclo-2'); await p.waitForTimeout(150);
  await p.locator('.sheet header .btn:not(.plain)').click(); await p.waitForTimeout(250);
  ok(await p.locator('[id^=fija-merienda-]').count() === 7 && await p.locator('[id^=fija-desayuno-]').count() === 0, 'El menú ya muestra la merienda y no el desayuno'); ok((await p.textContent('.subtitle')).includes('de 2'), 'Ciclo de 2 semanas: ' + (await p.textContent('.subtitle')));
  await p.click('nav >> text=Hoy'); ok(await p.locator('.slot:has-text("Desayuno")').count() === 0 && await p.locator('.slot:has-text("Merienda")').count() === 1, 'Hoy: sin desayuno y con merienda');
  // ---- recomendar sigue cuadrando con los desayunos propios ----
  await p.click('nav >> text=Menú'); await p.click('#comidas-horarios'); await p.click('.sheet .row:has-text("Desayuno") .switch'); await p.locator('.sheet header .btn:not(.plain)').click(); await p.waitForTimeout(200);
  await p.click('#recomendar'); await p.waitForSelector('#rec-lista .row'); const dias = (await p.locator('#rec-lista .row').allTextContents()).map(kc); ok(dias.every((k) => k > 1300 && k < 1900), 'Recomendar menú con desayunos por día: totales razonables ' + dias.join(', '));
  await p.locator('.sheet header .btn.plain').click();
  // ---- hora del entreno ahora en Entreno ----
  await p.click('nav >> text=Entreno'); ok(await p.locator('#hora-entreno').count() === 1, 'La hora del entreno está en la pestaña Entreno'); await p.fill('#hora-entreno', '07:15'); await p.press('#hora-entreno', 'Tab'); await p.waitForTimeout(250);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('stub')).entreno.hora)) === '07:15', 'Y se guarda');
  // ---- persistencia ----
  await p.reload(); await p.waitForSelector('.slot'); await p.click('nav >> text=Menú'); ok((await p.textContent('#fija-desayuno-0')).includes('Tostadas') || await p.locator('[id^=fija-merienda-]').count() === 7, 'Los cambios se guardan al reiniciar');
  ok(p.errs.length === 0, 'Sin errores JS: ' + JSON.stringify(p.errs)); await p.screenshot({ path: SHOTS + '/menu-fijas.png' }); await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
