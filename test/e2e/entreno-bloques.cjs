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
  const b = await chromium.launch(); let p = await nuevo(b, false);
  const stub = () => p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); return { d, hoy: Object.keys(d.dias).find((k) => d.dias[k].entreno === 's2') }; });
  const hoyKey = (await stub()).hoy, n0 = (await stub()).d.entreno.sesiones.find((x) => x.id === 's2').ej.length, plan0 = JSON.stringify((await stub()).d.entreno.sesiones);
  await p.click('#slot-gym'); await p.waitForSelector('#bloque-anadir'); const fichas0 = await p.locator('.ficha').count(); const titulo0 = await p.textContent('#entreno-titulo');
  ok(fichas0 === n0 && !titulo0.includes('+'), 'Al empezar: solo la sesión de hoy (' + titulo0 + ')');
  await p.click('#bloque-anadir'); await p.waitForSelector('#sumar-s1');
  ok(await p.locator('#sumar-s2').count() === 0 && await p.locator('#sumar-s1').count() === 1 && await p.locator('#sumar-s3').count() === 1, 'La lista ofrece las otras sesiones, no la de hoy');
  const nEmpuje = (await stub()).d.entreno.sesiones.find((x) => x.id === 's1').ej.length;
  await p.click('#sumar-s1'); await p.waitForTimeout(300);
  const titulo1 = await p.textContent('#entreno-titulo'); ok(titulo1.includes(' + ') && titulo1.startsWith(titulo0), 'El título pasa a ser una sola mezcla: ' + titulo1);
  ok(await p.locator('.ficha').count() === n0 + nEmpuje && await p.locator('#bloque-s1').count() === 1, `Salen juntos: ${n0} + ${nEmpuje} ejercicios`);
  ok((await p.textContent('#entreno-progreso')).endsWith('de ' + (n0 + nEmpuje)), 'El progreso cuenta todo junto: ' + await p.textContent('#entreno-progreso'));
  // apuntar peso en un ejercicio del bloque
  const idBloque = await p.locator('#bloque-s1 ~ .swipe .ficha').first().getAttribute('id'), k = idBloque.replace('ficha-', '');
  await p.fill('#kg-' + k, '40'); await p.press('#kg-' + k, 'Tab'); await p.click('#hecho-' + k); await p.waitForTimeout(250);
  ok((await p.textContent('#entreno-progreso')).startsWith('1 de'), 'Marcar un ejercicio del bloque suma al progreso');
  // en Hoy
  await p.click('.sheet.grande header .btn.plain'); await p.waitForTimeout(200);
  const hoy = await p.textContent('#slot-gym'); ok(hoy.includes(' + ') && hoy.includes(`1 de ${n0 + nEmpuje} ejercicios`), 'Hoy muestra una sola tarjeta con la mezcla: ' + hoy.replace(/\s+/g, ' ').slice(0, 90));
  ok(await p.locator('[id^=slot-gym]').count() === 1, 'Y es una sola tarjeta de entreno');
  // el plan no cambia y se guarda
  let g = await stub(); ok(JSON.stringify(g.d.entreno.sesiones) === plan0 && JSON.stringify(g.d.dias[g.hoy].bloques) === '["s1"]' && g.d.dias[g.hoy].gym[k].kg === 40, 'Las sesiones del plan no cambian; se guarda el bloque y el peso');
  await p.reload(); await p.waitForSelector('#slot-gym'); ok((await p.textContent('#slot-gym')).includes(' + '), 'Persiste tras reiniciar');
  // quitar sesión y deshacer
  await p.click('#slot-gym'); await p.click('#bloque-quitar-s1'); await p.waitForTimeout(250);
  ok(await p.locator('.ficha').count() === n0 && !(await p.textContent('#entreno-titulo')).includes('+') && await p.locator('#bloque-s1').count() === 0, 'Quitar sesión devuelve el entreno original');
  await p.click('.toast-undo'); await p.waitForTimeout(250);
  ok(await p.locator('.ficha').count() === n0 + nEmpuje && (await p.inputValue('#kg-' + k)) === '40' && (await p.getAttribute('#hecho-' + k, 'aria-pressed')) === 'true', 'Deshacer devuelve la sesión con su peso y su check');
  // quitar un ejercicio concreto del bloque
  await p.click('#quitar-' + k); await p.waitForTimeout(200); ok(await p.locator('#ficha-' + k).count() === 0 && await p.locator('.ficha').count() === n0 + nEmpuje - 1, 'Se puede quitar un ejercicio suelto de la sesión sumada'); await p.click('#ej-restaurar'); ok(await p.locator('#ficha-' + k).count() === 1, 'Y restaurarlo');
  // sumar todas las sesiones -> ya no quedan
  await p.click('#bloque-anadir'); await p.click('#sumar-s3'); await p.waitForTimeout(250); await p.click('#bloque-anadir'); await p.waitForTimeout(250);
  const restantes = await p.locator('[id^=sumar-]').count(); if (restantes) { for (let i = 0; i < restantes; i++) { await p.locator('[id^=sumar-]').first().click(); await p.waitForTimeout(250); if (i < restantes - 1) await p.click('#bloque-anadir'); } await p.click('#bloque-anadir'); }
  await p.waitForSelector('#bloque-vacio'); ok(await p.locator('#bloque-nueva').count() === 1, 'Sin más sesiones: avisa y ofrece crear una'); await p.click('.sheet >> nth=-1 >> text=Cerrar');
  // cambiar la sesión principal limpia los bloques
  await p.click('#entreno-cambiar'); await p.click('#cambiar-s1'); await p.waitForTimeout(300);
  g = await stub(); ok(!(await p.textContent('#entreno-titulo')).includes('+') && !g.d.dias[hoyKey].bloques, 'Al cambiar la sesión principal se limpian los bloques');
  ok(p.errs.length === 0, 'Sin errores JS ' + p.errs.join('|'));
  await b.close();
})();
