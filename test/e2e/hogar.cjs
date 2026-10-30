const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
const gramos = (t) => { const m = String(t).replace(/\./g, '').match(/([\d,]+)\s*(kg|g)?/); const n = parseFloat(m[1].replace(',', '.')); return m[2] === 'kg' ? n * 1000 : n; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }), errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" }));
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { if (localStorage.getItem('congelar')) return; localStorage.setItem('stub', JSON.stringify(x)); }, version: async () => '0' }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('h1.title');
  const kcalMenu = async () => { await p.click('nav >> text=Menú'); await p.waitForSelector('#media-kcal'); return parseInt((await p.textContent('#media-kcal')).replace(/\./g, ''), 10); };
  const polloCompra = async () => { await p.click('nav >> text=Compra'); await p.waitForSelector('#add-compra'); return gramos(await p.locator('.shop .item:has-text("Pechuga de pollo") .q').textContent()); };
  const k0 = await kcalMenu(), pollo0 = await polloCompra();
  ok(await p.locator('#compra-hogar').count() === 0 && await p.locator('.stepper').count() === 0, 'Quien come solo: Compra no muestra nada de personas');
  await p.click('nav >> text=Ajustes'); ok(await p.locator('#aj-hogar').count() === 0 && !(await p.textContent('body')).includes('Con quién comes'), 'Quien come solo: no sale "Con quién comes" en ningún sitio');
  await p.click('#aj-perfil'); ok((await p.textContent('#personas-n')) === '1', 'En Perfil: "Personas en casa" = 1');
  await p.click('#personas-mas'); ok((await p.textContent('#personas-n')) === '2', 'Al subir a 2 personas...'); await p.click('#aj-atras');
  ok(await p.locator('#aj-hogar').count() === 1 && (await p.textContent('#aj-hogar')).includes('Tú y Persona 2'), '...aparece "Con quién comes" en Ajustes');
  await p.click('#aj-hogar'); ok((await p.textContent('#hogar-lista')).includes('70 %') && (await p.textContent('#hogar-lista')).includes('comida, cena'), 'La persona nueva entra al 70 % con comida y cena');
  await p.locator('#hogar-lista .row').first().click(); await p.waitForSelector('#hogar-nombre');
  ok((await p.textContent('#hogar-pct')) === '70 %' && (await p.getAttribute('#hogar-c-desayuno', 'aria-pressed')) === 'false', 'Por defecto: 70 % y solo comida y cena');
  await p.fill('#hogar-nombre', ''); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); ok((await p.locator('.sheet').last().textContent()).includes('Escribe un nombre'), 'Pide nombre');
  await p.fill('#hogar-nombre', 'Marta'); await p.click('#hogar-mas'); await p.click('#hogar-menos'); await p.click('#hogar-menos'); ok((await p.textContent('#hogar-pct')) === '65 %', 'El porcentaje se ajusta de 5 en 5');
  ok((await p.textContent('#hogar-ejemplo')).includes('340 g') && (await p.textContent('#hogar-ejemplo')).includes('206 g') && (await p.textContent('#hogar-ejemplo')).includes('134 g'), 'Con un ejemplo del plato completo: ' + (await p.textContent('#hogar-ejemplo')).slice(0, 80));
  await p.click('#hogar-mas'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  ok((await p.textContent('#hogar-lista')).includes('Marta') && (await p.textContent('#hogar-lista')).includes('70 %'), 'Queda en la lista');
  await p.click('#aj-atras'); ok((await p.textContent('#aj-hogar')).includes('Tú y Marta'), 'El resumen dice "Tú y Marta"');
  // los platos llevan las cantidades de todos: la compra no cambia, tus calorías sí (solo tu parte)
  const pollo1 = await polloCompra(); ok(pollo1 === pollo0, `La compra son las cantidades del plato, tal cual (${pollo0} g antes y ${pollo1} g después)`);
  ok((await p.textContent('#compra-hogar')).includes('Para ti y Marta'), 'Compra: "Para ti y Marta"');
  const k1 = await kcalMenu(); ok(k1 < k0 && k1 > k0 * 0.5, `Tus calorías bajan a tu parte (${k0} → ${k1} kcal de media)`);
  // en el editor de un plato se ve la diferencia
  await p.click('#plato-comida-0'); await p.waitForSelector('#plato-total'); ok((await p.textContent('#plato-total')).includes('Para ti') && (await p.textContent('#plato-total')).includes('el plato completo suma'), 'El editor del plato dice "Para ti" y cuánto suma el plato completo: ' + (await p.textContent('#plato-total')).slice(0, 80)); ok((await p.textContent('.sheet')).includes('Cantidades del plato (para todos)'), 'Y que las cantidades son para todos'); await p.keyboard.press('Escape');
  // compartir también el desayuno baja todavía más tus calorías
  await p.click('nav >> text=Ajustes'); await p.click('#aj-hogar'); await p.locator('#hogar-lista .row').first().click(); await p.waitForSelector('#hogar-nombre'); await p.click('#hogar-c-desayuno'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(250);
  const k2 = await kcalMenu(); ok(k2 < k1, `Compartir también el desayuno baja tus calorías (${k1} → ${k2})`); ok((await polloCompra()) === pollo0, 'y la compra sigue igual');
  // quitar: deslizar, con deshacer
  await p.click('nav >> text=Ajustes'); await p.click('#aj-hogar');
  const box = await p.locator('#hogar-lista .swipe').first().boundingBox(), c = await p.context().newCDPSession(p), x = box.x + box.width - 20, y = box.y + box.height / 2;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); for (let i = 1; i <= 8; i++) await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 300 * i / 8, y }] }); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(500);
  ok(await p.locator('#hogar-vacio').count() === 1, 'Deslizando se quita la persona'); await p.click('.toast-undo'); await p.waitForTimeout(250); ok((await p.textContent('#hogar-lista')).includes('Marta'), 'Y se puede deshacer');
  // un título muy largo nunca empuja fuera el botón de guardar, tampoco en pantallas estrechas
  await p.setViewportSize({ width: 340, height: 700 }); await p.locator('#hogar-lista .row').first().click(); await p.waitForSelector('#hogar-nombre');
  await p.fill('#hogar-nombre', 'Una persona con un nombre muy pero que muy largo'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  await p.locator('#hogar-lista .row').first().click(); await p.waitForSelector('#hogar-nombre'); await p.waitForTimeout(300);
  const alcance = await p.evaluate(() => { const b = [...document.querySelectorAll('.sheet header .btn')].filter((x) => !x.classList.contains('plain')).pop(), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { dentro: r.left >= 0 && r.right <= innerWidth, encima: !!(e && b.contains(e)), txt: b.textContent }; });
  ok(alcance.dentro && alcance.encima && alcance.txt === 'Guardar', 'Con un título muy largo, el botón "Guardar" se ve y se puede pulsar en una pantalla de 340 px'); await p.keyboard.press('Escape'); await p.setViewportSize({ width: 390, height: 844 });
  // datos viejos: "personas en casa = 2" -> aparece "Persona 2" para ajustarla; la compra no se duplica
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); delete d.perfil.hogar; d.perfil.personas = 2; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); });
  await p.reload(); await p.waitForSelector('h1.title'); await p.evaluate(() => localStorage.removeItem('congelar'));
  const polloV = await polloCompra(); ok(polloV === pollo0 && (await p.textContent('#compra-hogar')).includes('Persona 2'), `Datos viejos (2 personas): aparece "Persona 2" y la compra sigue siendo la del plato (${polloV} g)`);
  ok(errs.length === 0, 'Sin errores JS ' + errs.join('|'));
  await p.screenshot({ path: SHOTS + '/hogar.png' }); await b.close();
})();
