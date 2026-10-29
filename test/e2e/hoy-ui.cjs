const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function nuevo(b, { mobile = false, blanco = false, inyectar = true } = {}) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1180, height: 900 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" })); await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { if (localStorage.getItem('congelar')) return true; localStorage.setItem('stub', JSON.stringify(x)); return true; } }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana');
  await p.click(blanco ? 'text=Empezar en blanco' : 'text=Empezar con un plan de ejemplo'); await p.waitForSelector('h1.title'); await p.waitForTimeout(500);
  if (!blanco && inyectar) {   // hoy toca "Tirón" y hace 5 días levantaste 62,5 kg en remo y 45 kg en jalón
    await p.evaluate(() => { const f = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; const d = JSON.parse(localStorage.getItem('stub'));
      const hoy = f(new Date()), antes = f(new Date(Date.now() - 5 * 864e5)); localStorage.setItem('congelar', '1'); d.dias[hoy] = { ...(d.dias[hoy] || { hechos: {} }), entreno: 's2' };
      d.dias[antes] = { hechos: {}, gym: { 'remo-con-barra': { hecho: true, kg: 62.5 }, 'jalon-al-pecho': { hecho: true, kg: 45 } } }; localStorage.setItem('stub', JSON.stringify(d)); });
    await p.reload(); await p.waitForSelector('#slot-gym'); await p.evaluate(() => localStorage.removeItem('congelar')); }
  return p;
}
const guardado = (p) => p.evaluate(() => { const f = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; const d = JSON.parse(localStorage.getItem('stub')); return (d.dias[f(new Date())] || {}); });
(async () => {
  const b = await chromium.launch(); let p = await nuevo(b);
  // ---- la tarjeta ya no se despliega: se abre en grande ----
  ok(!(await p.textContent('#slot-gym')).includes('Ver y registrar') && (await p.textContent('#slot-gym')).includes('0 de 5 ejercicios') && await p.locator('#slot-gym .bar').count() === 1, 'La tarjeta de entreno resume "0 de 5 ejercicios" con su barra, sin texto de "Ver y registrar"');
  ok(await p.locator('.slot .ejs, .slot .open-btn').count() === 0, 'Ya no hay un despliegue dentro de la tarjeta');
  await p.click('#slot-gym'); await p.waitForSelector('.sheet.grande');
  const dim = await p.evaluate(() => { const r = document.querySelector('.sheet.grande').getBoundingClientRect(); return { ancho: Math.round(r.width), alto: Math.round(r.height), vw: innerWidth, vh: innerHeight }; });
  ok(dim.ancho >= 700 && dim.alto >= dim.vh * 0.85, `Al pulsar la tarjeta se abre una vista grande (${dim.ancho}×${dim.alto} en ${dim.vw}×${dim.vh})`);
  ok((await p.textContent('#entreno-titulo')) === 'Tirón: espalda y bíceps' && await p.locator('.ficha').count() === 5, 'Muestra la sesión y sus 5 ejercicios'); ok((await p.textContent('#entreno-progreso')) === '0 de 5', 'Con su progreso');
  // ---- se recuerda el último peso ----
  ok((await p.inputValue('#kg-remo-con-barra')) === '62,5' && (await p.getAttribute('#kg-remo-con-barra', 'class')).includes('sugerido'), 'Remo con barra aparece ya con 62,5 kg (el de la última vez), en gris como sugerencia');
  ok((await p.inputValue('#kg-jalon-al-pecho')) === '45', 'Jalón al pecho: 45 kg recordados'); ok((await p.textContent('#ficha-remo-con-barra')).includes('Peso de la última vez: 62,5 kg'), 'Indica de cuándo viene el peso');
  ok((await p.inputValue('#kg-curl-de-biceps')) === '', 'Sin historial, el campo queda vacío');
  await p.click('#hecho-remo-con-barra'); await p.waitForTimeout(450); ok((await p.textContent('#entreno-progreso')) === '1 de 5', 'Marcar el ejercicio sube el progreso (1 de 5)');
  const g1 = await guardado(p); ok(g1.gym['remo-con-barra'].kg === 62.5 && g1.gym['remo-con-barra'].hecho === true, 'Al marcarlo hecho se guarda el peso recordado en el registro de hoy');
  ok(!(await p.getAttribute('#kg-remo-con-barra', 'class')).includes('sugerido') && (await p.textContent('#ficha-remo-con-barra')).includes('Última vez: 62,5 kg'), 'Y ya no se muestra como sugerencia');
  // ---- + y − ----
  await p.click('#ficha-jalon-al-pecho .mas >> nth=1'); ok((await p.inputValue('#kg-jalon-al-pecho')) === '47,5', 'El botón + suma 2,5 kg (45 → 47,5)'); await p.click('#ficha-jalon-al-pecho .mas >> nth=1'); await p.click('#ficha-jalon-al-pecho .mas >> nth=0'); ok((await p.inputValue('#kg-jalon-al-pecho')) === '47,5', '+ y − se compensan');
  await p.fill('#kg-curl-de-biceps', '17,5'); await p.press('#kg-curl-de-biceps', 'Tab'); await p.waitForTimeout(450); ok((await guardado(p)).gym['curl-de-biceps'].kg === 17.5, 'Escribir un peso a mano también se guarda (17,5)');
  ok(await p.locator('[id^=dolor-], .ficha select').count() === 0 && !(await p.textContent('.sheet.grande')).includes('Dolor'), 'Ya no hay seguimiento del dolor');
  // ---- series y repeticiones ----
  ok((await p.textContent('#esq-remo-con-barra')).includes('4×8'), 'Cada ejercicio muestra su "4×8" como botón');
  await p.click('#esq-remo-con-barra'); await p.waitForSelector('#ser-series'); ok((await p.inputValue('#ser-series')) === '4' && (await p.inputValue('#ser-reps')) === '8', 'Al tocarlo se editan series (4) y repeticiones (8)');
  await p.fill('#ser-series', '3'); await p.fill('#ser-reps', '10'); await p.click('.sheet:has(#ser-series) header .btn:not(.plain)'); await p.waitForTimeout(350);
  ok((await p.textContent('#esq-remo-con-barra')).includes('3×10') && (await p.textContent('#esq-remo-con-barra')).includes('plan 4×8'), 'Solo hoy: muestra 3×10 y recuerda que el plan es 4×8');
  ok((await guardado(p)).gym['remo-con-barra'].s === '3×10', 'Y se guarda en el registro de hoy');
  await p.click('#esq-remo-con-barra'); await p.click('#ser-volver'); await p.waitForTimeout(350); ok((await p.textContent('#esq-remo-con-barra')).includes('4×8') && !(await p.textContent('#esq-remo-con-barra')).includes('plan'), '"Volver al plan" deshace el cambio de hoy');
  await p.click('#esq-jalon-al-pecho'); await p.fill('#ser-series', '4'); await p.fill('#ser-reps', '8-12'); await p.click('.sheet:has(#ser-series) .switch'); await p.click('.sheet:has(#ser-series) header .btn:not(.plain)'); await p.waitForTimeout(450);
  ok((await p.textContent('#esq-jalon-al-pecho')).includes('4×8-12') && !(await p.textContent('#esq-jalon-al-pecho')).includes('plan'), 'Con el interruptor, el cambio pasa también al plan (4×8-12)');
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('stub')).entreno.sesiones.find((x) => x.id === 's2').ej.find((e) => e.n === 'Jalón al pecho').s)) === '4×8-12', 'Y queda guardado en la sesión');
  await p.click('#esq-curl-de-biceps'); await p.fill('#ser-series', ''); await p.click('.sheet:has(#ser-series) header .btn:not(.plain)'); ok((await p.textContent('.sheet:has(#ser-series) .err')).includes('series'), 'Sin series, avisa');
  await p.locator('.sheet:has(#ser-series) header .btn.plain').click();
  // ---- se mantiene al reiniciar ----
  await p.reload(); await p.waitForSelector('#slot-gym'); ok((await p.textContent('#slot-gym')).includes('1 de 5 ejercicios'), 'La tarjeta recuerda el progreso tras reiniciar'); await p.click('#slot-gym'); await p.waitForSelector('#kg-jalon-al-pecho');
  ok((await p.inputValue('#kg-jalon-al-pecho')) === '47,5' && (await p.inputValue('#kg-curl-de-biceps')) === '17,5', 'Los pesos de hoy siguen ahí');
  // ---- terminar ----
  await p.click('#entreno-terminar'); await p.waitForTimeout(250); ok(await p.locator('.sheet.grande').count() === 0 && (await p.getAttribute('.slot:has(#slot-gym) .chk', 'aria-pressed')) === 'true', '"Terminar entreno" cierra la vista y marca el entreno como hecho');
  await p.click('#slot-gym'); await p.click('#entreno-reabrir'); await p.waitForTimeout(250); ok(await p.locator('#entreno-terminar').count() === 1, 'Se puede volver a marcar como pendiente');
  // ---- cambiar a descanso desde dentro ----
  await p.click('#entreno-cambiar'); await p.click('#cambiar-descanso'); await p.waitForTimeout(300); ok(await p.locator('.sheet').count() === 0 && await p.locator('#slot-gym').count() === 0, 'Cambiar a descanso cierra la vista y quita el entreno de hoy');
  // ---- añadir entreno ----
  ok((await p.textContent('#entreno-hoy')).includes('descanso') && (await p.textContent('#cambiar-entreno')) === 'Añadir entreno', 'En descanso el botón dice "Añadir entreno"');
  await p.click('#cambiar-entreno'); await p.waitForSelector('.sheet'); ok((await p.textContent('.sheet header h3')) === 'Añadir entreno' && await p.locator('#cambiar-descanso').count() === 0 && await p.locator('#cambiar-nueva').count() === 1, 'La hoja "Añadir entreno" lista tus sesiones y "Crear una sesión nueva", sin opción de descanso');
  await p.click('#cambiar-s1'); await p.waitForTimeout(300); ok((await p.textContent('#slot-gym')).includes('Empuje') && await p.locator('#cambiar-entreno').count() === 0, 'Elegir una sesión la añade a hoy y desaparece el botón suelto');
  // ---- sin ninguna sesión creada ----
  const v = await nuevo(b, { blanco: true }); await v.waitForSelector('#cambiar-entreno'); ok((await v.textContent('#cambiar-entreno')) === 'Añadir entreno', 'Sin sesiones también ofrece "Añadir entreno"');
  await v.click('#cambiar-entreno'); await v.waitForSelector('.sheet'); ok((await v.textContent('.sheet header h3')) === 'Nueva sesión', 'Y abre directamente el editor para crear la primera');
  // ---- orden de la barra: Compra a la izquierda, Hoy en medio y más grande ----
  const nombres = await p.locator('nav .nav .nl').allTextContents(); ok(nombres.join(',') === 'Compra,Menú,Hoy,Entreno,Ajustes', 'Orden: ' + nombres.join(' · ')); ok((await p.locator('nav .nav.principal .nl').textContent()) === 'Hoy', 'Hoy es el destacado');
  const alturas = await p.evaluate(() => [...document.querySelectorAll('nav .nav')].map((x) => ({ t: x.textContent.trim(), h: Math.round(x.getBoundingClientRect().height), f: parseFloat(getComputedStyle(x).fontSize) })));
  const hoy = alturas.find((x) => x.t === 'Hoy'), otros = alturas.filter((x) => x.t !== 'Hoy'); ok(hoy.h > Math.max(...otros.map((x) => x.h)) && hoy.f > otros[0].f, `Escritorio: "Hoy" es más grande (${hoy.h}px y letra ${hoy.f}px frente a ${otros[0].h}px y ${otros[0].f}px)`);
  await p.click('nav >> text=Compra'); await p.keyboard.press('Control+3'); await p.waitForTimeout(200); ok(/Buen/.test(await p.textContent('h1.title')), 'Ctrl+3 abre Hoy (la del medio)'); ok((await p.getAttribute('nav .nav.principal', 'aria-current')) === 'page', 'Y queda marcada');
  // ---- móvil ----
  const m = await nuevo(b, { mobile: true }); await m.waitForSelector('#slot-gym');
  const mm = await m.evaluate(() => { const bar = document.querySelector('.side').getBoundingClientRect(), ico = document.querySelector('.nav.principal .ico').getBoundingClientRect(), btns = [...document.querySelectorAll('nav .nav')].map((x) => x.getBoundingClientRect()), cx = ico.left + ico.width / 2, cy = ico.top + ico.height / 2, tope = document.elementFromPoint(cx, cy);
    return { circulo: Math.round(ico.width), sobreBarra: Math.round(bar.top - ico.top), centrado: Math.abs(cx - innerWidth / 2) < 6, visible: !!(tope && tope.closest('.nav.principal')), orden: [...document.querySelectorAll('nav .nl')].map((x) => x.textContent).join(','), izq: btns[0].left < btns[1].left && btns[0].left < 40, desborda: document.documentElement.scrollWidth > innerWidth + 1 }; });
  ok(mm.orden === 'Compra,Menú,Hoy,Entreno,Ajustes' && mm.izq, 'Móvil: Compra queda a la izquierda del todo'); ok(mm.circulo >= 56 && mm.sobreBarra > 8 && mm.centrado && mm.visible, `Móvil: "Hoy" es un botón redondo grande (${mm.circulo}px), centrado y sobresale ${mm.sobreBarra}px de la barra, sin cortarse`); ok(!mm.desborda, 'Móvil: sin desbordes');
  await m.screenshot({ path: SHOTS + '/m-nav.png' });
  await m.click('#slot-gym'); await m.waitForSelector('.sheet.grande'); const mg = await m.evaluate(() => { const r = document.querySelector('.sheet.grande').getBoundingClientRect(), c = document.querySelector('.sheet.grande .body'); return { alto: Math.round(r.height), vh: innerHeight, ancho: Math.round(r.width), vw: innerWidth, scroll: c.scrollHeight > c.clientHeight }; });
  ok(mg.alto >= mg.vh * 0.95 && mg.ancho === mg.vw && mg.scroll, `Móvil: la vista del entreno ocupa casi toda la pantalla (${mg.ancho}×${mg.alto}) y se desplaza`);
  await m.screenshot({ path: SHOTS + '/m-entreno.png' });
  console.log('errores JS:', JSON.stringify([...p.errs, ...v.errs, ...m.errs])); await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
