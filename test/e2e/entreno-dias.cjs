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

(async () => {
  const b = await chromium.launch(); const p = await nuevo(b, false);
  const stub = () => p.evaluate(() => JSON.parse(localStorage.getItem('stub')));
  // quitar la sesión de hoy del override para trabajar con el plan: dos sesiones programadas el mismo día
  const hoyIdx = await p.evaluate(() => (new Date().getDay() + 6) % 7);
  // plan: la primera sesión de la plantilla toca hoy (sea cual sea el día) y no hay cambios manuales
  await p.waitForTimeout(500); await p.evaluate((hoy) => { const dd = JSON.parse(localStorage.getItem('stub')); if (!dd.entreno.sesiones.some((x) => (x.dias || []).includes(hoy))) dd.entreno.sesiones[0].dias.push(hoy); dd.dias = {}; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(dd)); }, hoyIdx);
  await p.reload(); await p.waitForSelector('#slot-gym'); await p.evaluate(() => localStorage.removeItem('congelar'));
  await p.click('nav >> text=Entreno'); await p.waitForSelector('#nueva-sesion'); await p.click('#nueva-sesion'); await p.waitForSelector('#ses-dias');
  for (let i = 0; i < 7; i++) if ((await p.getAttribute('#ses-dia-' + i, 'aria-pressed')) === 'true') await p.click('#ses-dia-' + i);
  await p.click('#ses-dia-' + hoyIdx); await p.fill('.sheet input[type=text] >> nth=0', 'Brazo'); await p.click('.sheet >> text=+ Ejercicio'); await p.fill('.exrow input >> nth=0', 'Curl martillo'); await p.click('.sheet >> text=+ Ejercicio'); await p.fill('.exrow >> nth=1 >> input >> nth=0', 'Extensión de tríceps');
  const aviso = await p.textContent('#ses-aviso'); ok(aviso.includes('se harán juntas') || aviso.includes('Se repite'), 'El editor avisa de que se harán juntas si el día ya tiene sesión: ' + aviso.slice(0, 80));
  await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  let d = await stub(); const juntas = d.entreno.sesiones.filter((x) => x.dias.includes(hoyIdx)); ok(juntas.length >= 2 && juntas.some((x) => x.t === 'Brazo'), 'Hoy hay varias sesiones programadas: ' + juntas.map((x) => x.t).join(' + '));
  ok(await p.locator('section.card .label:has-text("Sin día fijo")').count() === 0, 'Ninguna sesión pierde su día al programar otra');
  // quitar el cambio manual del día para ver el plan
  await p.click('nav >> text=Hoy'); await p.waitForSelector('#slot-gym');
  const hoy = await p.textContent('#slot-gym'); ok(hoy.includes(' + ') && hoy.includes('Brazo'), 'En Hoy salen juntas, como un solo entreno: ' + hoy.replace(/\s+/g, ' ').slice(0, 80));
  ok(await p.locator('[id^=slot-gym]').count() === 1, 'En una sola tarjeta');
  await p.click('#slot-gym'); await p.waitForSelector('#entreno-titulo'); const nTodos = await p.locator('.ficha').count();
  ok((await p.textContent('#entreno-titulo')).includes('Brazo') && await p.locator('#ficha-curl-martillo').count() === 1 && await p.locator('#ficha-extension-de-triceps').count() === 1, 'Dentro salen los ejercicios de las dos (' + nTodos + ')');
  const idBl = await p.locator('.bloque-cab').first().getAttribute('id'); ok(await p.locator('.bloque-cab').count() >= 1, 'Con la cabecera "Sesión sumada"');
  // quitar la sesión programada solo por hoy y deshacer
  await p.click('#' + idBl.replace('bloque-', 'bloque-quitar-')); await p.waitForTimeout(250); const nSin = await p.locator('.ficha').count(); ok(nSin < nTodos, `Quitar una sesión programada solo por hoy (${nTodos} → ${nSin})`);
  d = await stub(); ok(d.entreno.sesiones.filter((x) => x.dias.includes(hoyIdx)).length >= 2, 'El plan sigue teniendo las dos sesiones ese día');
  await p.click('.toast-undo'); await p.waitForTimeout(250); ok(await p.locator('.ficha').count() === nTodos, 'Deshacer la devuelve');
  await p.reload(); await p.waitForSelector('#slot-gym'); await p.click('#slot-gym'); await p.waitForSelector('#entreno-titulo'); ok(await p.locator('.ficha').count() === nTodos, 'Y sigue igual tras reiniciar');
  // el selector de "Añadir otra sesión" no repite las que ya van sumadas
  await p.click('#bloque-anadir'); await p.waitForSelector('.sheet >> text=Añadir otra sesión'); ok(await p.locator('#sumar-' + idBl.replace('bloque-', '')).count() === 0, 'El selector no ofrece la que ya está en el día');
  ok(p.errs.length === 0, 'Sin errores JS ' + p.errs.join('|'));
  await b.close();
})();
