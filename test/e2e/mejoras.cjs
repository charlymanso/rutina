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
const guardar = async (p) => { await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300); };
(async () => {
  const b = await chromium.launch(), p = await nuevo(b, false);
  // primeros pasos
  ok(await p.locator('#guia').count() === 1, 'Quien empieza ve "Primeros pasos"'); await p.click('#guia-cerrar'); ok(await p.locator('#guia').count() === 0, 'y se cierra con "Entendido"');
  await p.reload(); await p.waitForSelector('#slot-gym'); ok(await p.locator('#guia').count() === 0, 'No vuelve a salir');
  // añadir un ejercicio y guardarlo en la sesión
  const sesion = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); const hoy = (new Date().getDay() + 6) % 7; const o = (d.dias[Object.keys(d.dias).pop()] || {}).entreno; return (d.entreno.sesiones.find((x) => x.id === o) || d.entreno.sesiones.find((x) => x.dias.includes(hoy))).t; });
  await p.click('#slot-gym'); await p.waitForSelector('#ej-anadir'); await p.click('#ej-anadir'); await p.waitForSelector('#ej-nombre');
  ok((await p.textContent('.sheet >> nth=-1')).includes(sesion), 'Ofrece guardarlo en la sesión de hoy (' + sesion + ')');
  await p.fill('#ej-nombre', 'Hack squat'); await p.fill('#ej-series', '3'); await p.fill('#ej-reps', '8'); await p.click('#ej-plan'); await guardar(p);
  ok(await p.locator('#ficha-hack-squat').count() === 1 && !(await p.textContent('#ficha-hack-squat')).includes('Extra'), 'Guardado en la sesión: sale como un ejercicio más, no como Extra');
  const enPlan = await p.evaluate((t) => JSON.parse(localStorage.getItem('stub')).entreno.sesiones.find((x) => x.t === t).ej.some((e) => e.n === 'Hack squat'), sesion); ok(enPlan, 'Está en el plan');
  // kilos por serie
  await p.click('#esq-hack-squat'); await p.waitForSelector('#ser-kgs'); ok(await p.locator('#ser-kgs input').count() === 3, 'Una casilla de kilos por serie');
  const ks = p.locator('#ser-kgs input'); await ks.nth(0).fill('60'); await ks.nth(1).fill('65'); await ks.nth(2).fill('70'); await guardar(p);
  ok((await p.textContent('#kgs-hack-squat')).includes('60 · 65 · 70') && (await p.inputValue('#kg-hack-squat')) === '70', 'Se ven los kilos por serie y el peso del día es el mayor');
  // quitar y volver a añadir eligiéndolo de la lista
  await p.click('#quitar-hack-squat'); await p.waitForTimeout(300); await p.click('#ej-anadir'); await p.waitForSelector('#ej-nombre'); await p.fill('#ej-nombre', 'hack');
  ok(await p.locator('#ej-sug .row').count() === 1 && (await p.textContent('#ej-sug')).includes('3×8'), 'Al escribir sugiere tus ejercicios con sus series'); await p.locator('#ej-sug .row').first().click();
  ok((await p.inputValue('#ej-nombre')) === 'Hack squat' && (await p.inputValue('#ej-reps')) === '8', 'Elegirlo rellena nombre y series'); await p.locator('.sheet').last().locator('header .btn.plain').click();
  await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  // elegir de entre los ejercicios del grupo
  await p.click('#slot-gym'); await p.waitForSelector('#ej-elegir'); const antes = await p.locator('.ficha').count(); await p.click('#ej-elegir'); await p.waitForSelector('#elegir-lista');
  ok(await p.locator('#elegir-lista .item[aria-pressed=true]').count() === antes && await p.locator('#elegir-hack-squat').getAttribute('aria-pressed') === 'false', 'Elegir ejercicios: salen los del grupo, marcados los de hoy (' + antes + ')');
  await p.click('#elegir-hack-squat'); await p.waitForTimeout(200); const primero = p.locator('#elegir-lista .item[aria-pressed=true]').first(), idPrimero = await primero.getAttribute('id'); await primero.click(); await p.waitForTimeout(200);
  ok((await p.textContent('#elegir-cuenta')).startsWith(String(antes) + ' '), 'Marcar uno y desmarcar otro deja ' + antes + ' para hoy'); await p.locator('.sheet').last().locator('header .btn.plain').click(); await p.waitForTimeout(200);
  ok(await p.locator('#ficha-hack-squat').count() === 1 && await p.locator('#ficha-' + idPrimero.replace('elegir-', '')).count() === 0, 'El entreno de hoy queda con lo elegido');
  await p.click('#ej-restaurar'); await p.waitForTimeout(200); await p.click('#quitar-hack-squat'); await p.waitForTimeout(300); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  // nota y vídeo
  await p.click('nav >> text=Ajustes'); await p.click('#aj-ejercicios'); await p.fill('#ejs-buscar', 'hack'); await p.locator('#ejs-lista .row').first().click(); await p.waitForSelector('#ej-nota');
  await p.fill('#ej-nota', 'Baja despacio'); await p.fill('#ej-video', 'no es un enlace'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); ok((await p.textContent('.sheet >> nth=-1')).includes('https://'), 'El vídeo tiene que ser un enlace');
  await p.fill('#ej-video', 'https://youtube.com/shorts/abc'); await guardar(p);
  await p.click('nav >> text=Hoy'); await p.click('#slot-gym'); await p.waitForSelector('#ej-restaurar'); await p.click('#ej-restaurar'); await p.waitForSelector('#nota-hack-squat');
  ok((await p.textContent('#nota-hack-squat')).includes('Baja despacio') && await p.locator('#nota-hack-squat a[href="https://youtube.com/shorts/abc"]').count() === 1, 'La nota y el vídeo salen al entrenar');
  await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  // peso corporal
  await p.click('nav >> text=Ajustes'); if (await p.locator('#aj-atras').count()) await p.click('#aj-atras'); await p.click('#aj-peso'); await p.fill('#peso-kg', '80,4'); await p.click('#peso-anotar'); await p.waitForSelector('#peso-lista');
  ok((await p.textContent('#peso-lista')).includes('80,4 kg') && await p.locator('#peso-grafica').count() === 0, 'Anota el peso de hoy (con un solo dato aún no hay gráfica)');
  await p.waitForTimeout(500); await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); d.pesos.unshift({ f: '2026-01-05', kg: 82 }); localStorage.setItem('stub', JSON.stringify(d)); localStorage.setItem('congelar', '1'); });
  await p.reload(); await p.waitForSelector('h1.title'); await p.evaluate(() => localStorage.removeItem('congelar')); await p.click('nav >> text=Ajustes'); await p.click('#aj-peso');
  ok(await p.locator('#peso-grafica svg').count() === 1 && (await p.textContent('#peso-grafica')).includes('-1,6 kg'), 'Con dos datos sale la gráfica y la diferencia (-1,6 kg)');
  // copiar semana
  await p.click('nav >> text=Menú'); await p.waitForSelector('#media-kcal');
  if (await p.locator('#copiar-semana').count()) { await p.click('#copiar-semana'); await guardar(p); const iguales = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('stub')).menu.semanas; return JSON.stringify(s[0]) === JSON.stringify(s[1]); }); await p.waitForTimeout(400); ok(iguales || await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('stub')).menu.semanas; return JSON.stringify(s[0]) === JSON.stringify(s[1]); }), 'Copiar esta semana a la otra las deja iguales'); }
  else ok(true, 'Plan de una sola semana: no hay nada que copiar');
  ok(p.errs.length === 0, 'Sin errores JS ' + p.errs.join('|')); await b.close();
})();
