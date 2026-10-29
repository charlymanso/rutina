const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
const kcal = (t) => parseInt(String(t).replace(/\./g, '').match(/(\d+)\s*kcal/)[1], 10);
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1180, height: 1000 } }), errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" }));
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { if (localStorage.getItem('congelar')) return; localStorage.setItem('stub', JSON.stringify(x)); }, version: async () => '0' }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('#nutricion');
  // El plan de ejemplo tiene "comida libre" algún día: para esta prueba, hoy toca un plato normal sea cual sea el día
  await p.waitForTimeout(600); await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')), i = (new Date().getDay() + 6) % 7, sem = d.menu.semanas[0]; sem[i].comida = JSON.parse(JSON.stringify(sem[0].comida)); sem[i].cena = JSON.parse(JSON.stringify(sem[0].cena)); localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); });
  await p.reload(); await p.waitForSelector('#nutricion'); await p.evaluate(() => localStorage.removeItem('congelar'));
  const energia = async () => kcal(await p.locator('#nutricion .metric', { hasText: 'Energía' }).first().locator(':scope > b').textContent());
  ok(await energia() === 0, 'Nutrición empieza en 0 kcal: nada marcado');
  ok((await p.textContent('#nutricion-nota')).includes('Se irá completando'), 'Explica que se completa al marcar');
  await p.click('.slot:has(#slot-comida) .chk'); await p.waitForTimeout(250);
  const e1 = await energia(); ok(e1 > 100, 'Al marcar la comida suma sus kcal: ' + e1);
  await p.click('.slot:has(#slot-desayuno) .chk'); await p.waitForTimeout(250);
  const e2 = await energia(); ok(e2 > e1, 'Marcar el desayuno suma más: ' + e2);
  ok((await p.textContent('#nutricion-nota')).includes('Suma lo que has marcado') && (await p.textContent('#nutricion-nota')).includes('Faltan'), 'La nota habla de lo marcado y de lo que falta');
  ok(await p.locator('#nutricion .stackbar').count() === 1, 'Aparece el reparto de energía con lo consumido');
  await p.click('.slot:has(#slot-desayuno) .chk'); await p.waitForTimeout(250); ok(await energia() === e1, 'Al desmarcar resta');
  // ajustar la comida de hoy: porciones y cantidades
  const antes = await p.textContent('#slot-comida h3');
  const guardar = async () => { await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300); };
  await p.click('#slot-comida'); await p.waitForSelector('#plato-elegir');
  ok(await p.locator('#hoy-porciones .chipopt').count() === 6 && await p.locator('.itemrow input').count() >= 2 && await p.locator('#plato-nombre').evaluate((e) => e.tagName) === 'DIV', 'El editor de hoy: nombre fijo, porciones y cantidades');
  ok((await p.getAttribute('#porcion-1', 'aria-pressed')) === 'true', 'Marca 1× cuando no hay cambios');
  const t0 = kcal(await p.textContent('#hoy-total')); await p.click('#porcion-0\\.5'); const t1 = kcal(await p.textContent('#hoy-total'));
  ok(t1 > 0 && Math.abs(t1 - t0 / 2) < t0 * 0.06, `½ porción: ${t0} → ${t1} kcal`);
  await guardar(); ok((await p.textContent('.slot:has(#slot-comida) .kind')).includes('cambiado') && (await p.textContent('#slot-comida h3')) === antes, 'Mismo plato pero marcado como cambiado');
  const e3 = await energia(); ok(Math.abs(e3 - t1) < 15, `La nutrición cuenta la porción real (${e3} ≈ ${t1})`);
  // cantidad a mano
  await p.click('#slot-comida'); await p.waitForSelector('#hoy-volver'); await p.fill('.itemrow input >> nth=0', '3000'); ok(await p.locator('#hoy-porciones .chipopt[aria-pressed=true]').count() === 0, 'Al escribir una cantidad se desmarca la porción');
  const t2 = kcal(await p.textContent('#hoy-total')); ok(t2 > t0, 'El total sube al poner más cantidad: ' + t2); await guardar(); ok((await energia()) > t0, 'Hoy comiste de más: la nutrición lo refleja');
  ok(await p.locator('#nutricion .bar.over').count() === 1 && (await p.textContent('#nutricion')).includes('Te pasas') && !(await p.locator('#nutricion .metric', { hasText: 'Proteína' }).first().locator('.bar').getAttribute('class')).includes('over'), 'Pasarse de las kcal pone la barra en rojo con "Te pasas X kcal" (la proteína no)');
  ok((await p.locator('#nutricion .metric', { hasText: 'Energía' }).first().locator('.bar').getAttribute('class')).includes('over') && !(await p.locator('#nutricion .metric', { hasText: 'Energía' }).first().locator('.bar').getAttribute('class')).includes('ok'), 'Y ya no es verde');
  await p.screenshot({ path: SHOTS + '/hoy-rojo.png', clip: { x: 800, y: 100, width: 380, height: 380 } });
  // otro plato
  await p.click('#slot-comida'); await p.click('#plato-elegir'); await p.waitForSelector('#elegir-gestionar');
  ok((await p.locator('.sheet').last().locator('.res').first().textContent()).includes('Gestionar platos') && await p.locator('#elegir-libre').count() === 1, 'Cambiar plato: Gestionar platos primero y Comida libre');
  await p.locator('.sheet').last().locator('.res').filter({ hasNotText: /Gestionar|Comida libre/ }).filter({ hasNotText: antes }).first().click(); await p.waitForTimeout(200);
  const nuevo = await p.textContent('#plato-nombre'); ok(nuevo !== antes && await p.locator('#porcion-1[aria-pressed=true]').count() === 1, 'Elegir otro plato: carga sus cantidades en 1×: ' + nuevo); await guardar();
  ok((await p.textContent('#slot-comida h3')) === nuevo, 'Hoy muestra el nuevo plato');
  await p.click('nav >> text=Menú'); const hoyIdx = await p.evaluate(() => (new Date().getDay() + 6) % 7);
  ok((await p.textContent(`#plato-comida-${hoyIdx} h3`)) === antes, 'El plan del menú sigue igual');
  await p.click('nav >> text=Hoy'); await p.waitForSelector('#slot-comida');
  // libre y volver
  await p.click('#slot-comida'); await p.click('#plato-elegir'); await p.click('#elegir-libre'); ok((await p.textContent('#hoy-total')).includes('Comida libre') && await p.locator('#hoy-porciones').count() === 0, 'Comida libre en el editor'); await guardar();
  ok((await p.textContent('#slot-comida h3')) === 'Comida libre', 'Comida libre para hoy');
  await p.click('#slot-comida'); await p.click('#hoy-volver'); await p.waitForTimeout(300);
  ok((await p.textContent('#slot-comida h3')) === antes && !(await p.textContent('.slot:has(#slot-comida) .kind')).includes('cambiado'), 'Volver al plan restaura la comida');
  ok(await energia() === e1, 'Y la nutrición vuelve a ' + e1);
  // guardar sin tocar nada no marca cambio
  await p.click('#slot-comida'); await p.waitForSelector('#plato-elegir'); await guardar(); ok(!(await p.textContent('.slot:has(#slot-comida) .kind')).includes('cambiado'), 'Guardar sin cambiar nada no cuenta como cambio');
  await p.click('#slot-desayuno'); await p.waitForSelector('#plato-elegir'); await p.click('#plato-elegir'); ok(await p.locator('#elegir-libre').count() === 0, 'Las comidas fijas no ofrecen "comida libre"'); await p.click('.sheet >> nth=-1 >> text=Cerrar'); await p.click('.sheet >> text=Cancelar');
  ok(errs.length === 0, 'Sin errores JS ' + errs.join('|'));
  await p.screenshot({ path: SHOTS + '/hoy-cambio.png' }); await b.close();
})();
