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
  await p.click('nav >> text=Compra'); await p.waitForSelector('#add-compra');
  ok(await p.locator('#compra-hogar').count() === 0 && await p.locator('.stepper').count() === 0, 'Quien come solo: Compra no muestra nada de personas');
  const pollo0 = gramos(await p.locator('.shop .item:has-text("Pechuga de pollo") .q').textContent());
  await p.click('nav >> text=Ajustes'); ok(await p.locator('#aj-hogar').count() === 0, 'Quien come solo: no sale "Con quién comes"'); ok(!(await p.textContent('body')).includes('Con quién comes'), 'Y no se menciona en ningún sitio de Ajustes');
  await p.click('#aj-perfil'); ok((await p.textContent('#personas-n')) === '1' && await p.locator('#personas-menos').count() === 1, 'En Perfil: "Personas en casa" = 1');
  await p.click('#personas-mas'); ok((await p.textContent('#personas-n')) === '2', 'Al subir a 2 personas...'); await p.click('#aj-atras');
  ok(await p.locator('#aj-hogar').count() === 1 && (await p.textContent('#aj-hogar')).includes('Tú y Persona 2'), '...aparece "Con quién comes" en Ajustes');
  await p.click('#aj-hogar'); ok((await p.textContent('#hogar-lista')).includes('70 %') && (await p.textContent('#hogar-lista')).includes('comida, cena'), 'La persona nueva entra al 70 % con comida y cena');
  await p.locator('#hogar-lista .row').first().click(); await p.waitForSelector('#hogar-nombre');
  ok((await p.textContent('#hogar-pct')) === '70 %' && (await p.getAttribute('#hogar-c-desayuno', 'aria-pressed')) === 'false', 'Por defecto: 70 % y solo comida y cena');
  await p.fill('#hogar-nombre', ''); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); ok((await p.locator('.sheet').last().textContent()).includes('Escribe un nombre'), 'Pide nombre');
  await p.fill('#hogar-nombre', 'Marta'); await p.click('#hogar-mas'); await p.click('#hogar-menos'); await p.click('#hogar-menos'); ok((await p.textContent('#hogar-pct')) === '65 %' && (await p.textContent('#hogar-ejemplo')).includes('130 g'), 'El porcentaje se ajusta de 5 en 5 con un ejemplo: ' + (await p.textContent('#hogar-ejemplo')).slice(0, 40));
  await p.click('#hogar-mas'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  ok((await p.textContent('#hogar-lista')).includes('Marta') && (await p.textContent('#hogar-lista')).includes('70 %'), 'Queda en la lista: ' + (await p.textContent('#hogar-lista')).replace(/\s+/g, ' ').slice(0, 70));
  await p.click('#aj-atras'); ok((await p.textContent('#aj-hogar')).includes('Tú y Marta'), 'El resumen dice "Tú y Marta"');
  await p.click('nav >> text=Compra'); await p.waitForSelector('#compra-hogar'); ok((await p.textContent('#compra-hogar')).includes('Para ti y Marta'), 'Compra: "Para ti y Marta"');
  const pollo1 = gramos(await p.locator('.shop .item:has-text("Pechuga de pollo") .q').textContent());
  ok(+pollo1 > +pollo0 && +pollo1 < +pollo0 * 1.75, `El pollo sube (${pollo0} → ${pollo1} g) pero menos del doble, porque Marta no come el desayuno y come menos`);
  // tus calorías no cambian
  await p.click('nav >> text=Menú'); const k1 = await p.textContent('#media-kcal'); await p.click('nav >> text=Ajustes'); await p.click('#aj-hogar'); await p.locator('#hogar-lista .row').first().click(); await p.waitForSelector('#hogar-nombre'); await p.click('#hogar-c-desayuno'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(250);
  await p.click('nav >> text=Menú'); ok((await p.textContent('#media-kcal')) === k1, 'Tus calorías en el Menú no cambian al cambiar con quién comes');
  // la nueva comida compartida (desayuno) sube la compra
  await p.click('nav >> text=Compra'); const pollo2 = gramos(await p.locator('.shop .item:has-text("Pechuga de pollo") .q').textContent()); ok(+pollo2 >= +pollo1, 'Compartir también el desayuno sube (o mantiene) la compra');
  // quitar: deslizar o con deshacer
  await p.click('nav >> text=Ajustes'); await p.click('#aj-hogar'); await p.locator('#hogar-lista .row').first().click(); await p.waitForSelector('#hogar-nombre'); await p.keyboard.press('Escape');
  const box = await p.locator('#hogar-lista .swipe').first().boundingBox(), c = await p.context().newCDPSession(p), x = box.x + box.width - 20, y = box.y + box.height / 2;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); for (let i = 1; i <= 8; i++) await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 300 * i / 8, y }] }); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(500);
  ok(await p.locator('#hogar-vacio').count() === 1, 'Deslizando se quita la persona'); await p.click('.toast-undo'); await p.waitForTimeout(250); ok((await p.textContent('#hogar-lista')).includes('Marta'), 'Y se puede deshacer');
  // ajustar los platos que ya llevaban las cantidades de los dos
  await p.click('nav >> text=Menú'); const pl0 = await p.textContent('#plato-comida-0'); const g0 = gramos(pl0.match(/Pechuga de pollo ([\d,.]+) g/)[1] + ' g');
  await p.click('nav >> text=Ajustes'); await p.click('#aj-hogar'); await p.click('#hogar-ajustar'); await p.locator('.sheet').last().locator('header .btn:not(.plain)').click(); await p.waitForTimeout(300);
  await p.click('nav >> text=Menú'); const g1 = gramos((await p.textContent('#plato-comida-0')).match(/Pechuga de pollo ([\d,.]+) g/)[1] + ' g');
  const esperado = g0 / (1 + 0.7); ok(Math.abs(g1 - esperado) < 1.1, `Ajustar mis platos: ${g0} g pasa a ${g1} g (tuya = total ÷ 1,7)`);
  await p.click('.toast-undo'); await p.waitForTimeout(250); ok(gramos((await p.textContent('#plato-comida-0')).match(/Pechuga de pollo ([\d,.]+) g/)[1] + ' g') === g0, 'Y se puede deshacer');
  // la ventana de confirmación (título largo) deja siempre el botón al alcance, también en pantallas estrechas
  await p.setViewportSize({ width: 340, height: 700 }); await p.click('nav >> text=Ajustes'); await p.click('#aj-hogar'); await p.click('#hogar-ajustar'); await p.waitForTimeout(400);
  const alcance = await p.evaluate(() => { const b = [...document.querySelectorAll('.sheet header .btn')].filter((x) => !x.classList.contains('plain')).pop(), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { dentro: r.left >= 0 && r.right <= innerWidth, encima: !!(e && b.contains(e)), txt: b.textContent }; });
  ok(alcance.dentro && alcance.encima && alcance.txt === 'Ajustar', 'El botón "Ajustar" se ve y se puede pulsar en una pantalla de 340 px'); await p.keyboard.press('Escape'); await p.setViewportSize({ width: 390, height: 844 });
  // datos viejos: "personas en casa = 2" -> todo para dos
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('stub')); delete d.perfil.hogar; d.perfil.personas = 2; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); });
  await p.reload(); await p.waitForSelector('h1.title'); await p.evaluate(() => localStorage.removeItem('congelar')); await p.click('nav >> text=Compra'); await p.waitForSelector('#compra-hogar');
  const polloV = gramos(await p.locator('.shop .item:has-text("Pechuga de pollo") .q').textContent()); ok(Math.abs(+polloV - 2 * +pollo0) <= 2 && (await p.textContent('#compra-hogar')).includes('Persona 2'), `Datos viejos (2 personas): sigue saliendo el doble (${polloV} g) y aparece "Persona 2" para ajustarla`);
  ok(errs.length === 0, 'Sin errores JS ' + errs.join('|'));
  await p.screenshot({ path: SHOTS + '/hogar.png' }); await b.close();
})();
