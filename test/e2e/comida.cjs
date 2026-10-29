const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
const HITS = [
  { code: '18429350', product_name: 'Oikos Yogur Griego Natural No Endulzado', brands: ['Danone'], quantity: null, nutriments: { 'energy-kcal_100g': 98, proteins_100g: 4.6, carbohydrates_100g: null, fat_100g: 6 } },
  { code: '7501040092879', product_name: 'Yogur Griego Frambuesa Yoplait', brands: ['Yoplait'], quantity: '220 g', nutriments: { 'energy-kcal_100g': null, proteins_100g: 4.68, carbohydrates_100g: 12, fat_100g: 0.818 } },
  { code: '7703616007151', product_name: 'Griego Natural', brands: ['Cuisine & Co'], quantity: '900 g', nutriments: { 'energy-kcal_100g': 66.7, proteins_100g: 7.33, carbohydrates_100g: 8.67, fat_100g: 0 } }];
async function nuevo(b, { escritorio = true, datos = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1180, height: 900 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" }));
  await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(({ escritorio, datos }) => { let d = datos;
    window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')) || d; } catch { return d; } }, save: async (x) => { localStorage.setItem('stub', JSON.stringify(x)); return true; } };
    if (escritorio) { window.rutina.buscarAlimentos = async (q) => { window.__ultima = q; if (q === 'caida') throw new Error('sin red'); return window.__hits || []; }; window.rutina.alimentoPorCodigo = async (c) => (c === '3017620422003' ? { code: c, product_name: 'Nutella', brands: 'Ferrero', quantity: '400 g', nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 } } : null); }
    else delete window.rutina; }, { escritorio, datos });
  await p.addInitScript((h) => { window.__hits = h; }, HITS);
  await p.goto(BASE + '/index.html'); return p;
}
const parseKcal = (t) => parseInt(t.replace(/\./g, '').match(/(\d+)\s*kcal/)[1], 10);
(async () => {
  const b = await chromium.launch();
  let p = await nuevo(b); await p.waitForSelector('.sheet'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot');
  // ---- Menú: calorías por plato, por día y media semanal ----
  await p.click('nav >> text=Menú'); await p.waitForSelector('#media-kcal');
  const media = parseKcal(await p.textContent('#media-kcal')); ok(media > 1000 && media < 2500, `Menú: media diaria visible (${media} kcal)`);
  ok(await p.locator('.plato .kc').first().isVisible() && (await p.textContent('.plato .kc >> nth=0')).includes('kcal'), 'Cada plato muestra sus kcal y proteína');
  ok(await p.locator('.dtot').count() >= 5, 'Cada día muestra su total con barra frente al objetivo');
  // ---- Editar plato: calorías en vivo ----
  await p.click('.plato >> nth=0'); await p.waitForSelector('#plato-total');
  const t0 = parseKcal(await p.textContent('#plato-total')); ok(t0 > 300, `Plato: total en vivo al abrir (${t0} kcal)`);
  await p.fill('.sheet .itemrow input >> nth=0', '300'); const t1 = parseKcal(await p.textContent('#plato-total')); ok(t1 > t0, `Subir la cantidad sube el total (${t0} → ${t1})`);
  ok((await p.textContent('.sheet .sub-line >> nth=0')).includes('kcal'), 'Cada ingrediente muestra sus kcal y macros');
  // ---- Buscar alimento: base propia ----
  await p.click('#anadir-alimento'); await p.waitForSelector('#buscar-alimento'); await p.fill('#buscar-alimento', 'salmon'); await p.waitForSelector('text=Usados antes'); ok(await p.locator('text=Base de alimentos').count() === 0, 'Lo que ya tienes sale como "Mis ingredientes" y no se duplica en la base');
  await p.fill('#buscar-alimento', 'quinoa'); await p.waitForSelector('text=Base de alimentos'); ok((await p.textContent('.res >> nth=0')).includes('Quinoa'), 'Base propia: encuentra Quinoa');
  await p.fill('#buscar-alimento', 'MOZARELA'); await p.waitForTimeout(200); await p.fill('#buscar-alimento', 'mozzarella'); await p.waitForSelector('.res:has-text("Mozzarella")'); ok(true, 'Búsqueda sin importar mayúsculas');
  await p.fill('#buscar-alimento', 'quinoa'); await p.waitForSelector('.res:has-text("Quinoa")');
  const antes = await p.locator('.itemblock').count(); await p.click('.res >> text=Quinoa >> nth=0');
  await p.waitForFunction(() => document.querySelectorAll('#plato-total').length === 1);
  const t2 = parseKcal(await p.textContent('#plato-total')); ok(t2 > t1 && (await p.locator('.itemblock').count()) === antes + 1, `Añadir Quinoa lo incluye con su cantidad habitual y suma (${t1} → ${t2})`);
  // ---- Reutilizar plato ----
  ok(await p.locator('#plato-reusar').count() === 0 && await p.locator('#plato-elegir').count() === 1, 'Ya no hay desplegable: botón "Cambiar plato"');
  await p.click('#plato-elegir'); ok((await p.locator('.sheet').last().locator('.res').first().textContent()).includes('Gestionar platos'), 'El selector abre una lista con "Gestionar platos" la primera');
  await p.click('.res:has-text("Lentejas con verduras")'); ok((await p.textContent('#plato-nombre')) === 'Lentejas con verduras', 'Elegir un plato copia nombre e ingredientes');
  await p.click('.sheet header .btn:not(.plain)'); await p.waitForTimeout(150);
  ok((await p.textContent('.plato >> nth=0')).includes('Lentejas con verduras'), 'Al guardar, el plato cambia en el menú');
  const media2 = parseKcal(await p.textContent('#media-kcal')); ok(media2 !== media, `La media semanal se recalcula (${media} → ${media2})`);
  // ---- Productos online (app de escritorio), con filtro de datos malos ----
  await p.click('.plato >> nth=1'); await p.click('#anadir-alimento'); await p.fill('#buscar-alimento', 'yogur griego');
  await p.waitForSelector('text=Productos de supermercado'); await p.waitForFunction(() => /Oikos/.test(document.body.textContent), null, { timeout: 5000 });
  const txt = await p.textContent('.sheet >> nth=-1');
  ok(txt.includes('Oikos') && txt.includes('Griego Natural (Cuisine & Co)'), 'Online: aparecen productos con datos útiles');
  ok(!txt.includes('Frambuesa'), 'Online: se descarta el producto sin calorías');
  ok(txt.includes('Open Food Facts'), 'Online: se cita la fuente');
  await p.click('.res >> text=Cuisine'); await p.waitForTimeout(100);
  ok(await p.locator('.itemrow .nm >> text=Griego Natural (Cuisine & Co)').count() >= 1, 'Un producto online se guarda como ingrediente propio y se añade');
  // ---- Código de barras ----
  await p.click('#anadir-alimento'); await p.fill('#buscar-alimento', '3017620422003'); await p.waitForSelector('.res:has-text("Nutella")', { timeout: 5000 }); ok(true, 'Código de barras: encuentra Nutella');
  await p.fill('#buscar-alimento', '9999999999999'); await p.waitForSelector('text=No hay ningún producto con ese código'); ok(true, 'Código inexistente: mensaje claro');
  // ---- Fallo de red ----
  await p.fill('#buscar-alimento', 'caida'); await p.waitForSelector('text=No se pudo consultar la base online'); ok(true, 'Sin conexión: avisa y deja usar la base propia');
  // ---- Crear a mano con el nombre ya puesto ----
  await p.fill('#buscar-alimento', 'Mi tarta casera'); await p.click('#crear-alimento'); await p.waitForSelector('text=Nuevo ingrediente');
  ok((await p.inputValue('.sheet >> nth=-1 >> input[type=text] >> nth=0')) === 'Mi tarta casera', 'Crear nuevo: el nombre buscado ya viene escrito');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  while (await p.locator('.sheet').count()) { await p.locator('.sheet header .btn.plain').last().click(); await p.waitForTimeout(80); }
  // ---- Hoy: extras ----
  await p.click('nav >> text=Hoy'); await p.waitForSelector('#add-extra');
  const kHoy = parseKcal(await p.textContent('.metric:has-text("Energía") b'));
  await p.click('#add-extra'); await p.fill('#buscar-alimento', 'chocolate'); await p.click('.res >> text=Chocolate negro'); await p.waitForSelector('#extra-cant');
  await p.fill('#extra-cant', '50'); ok((await p.textContent('.macros-live')).includes('300 kcal'), 'Extra: 50 g de chocolate negro = 300 kcal en la vista previa');
  await p.click('.sheet header .btn:not(.plain)'); await p.waitForSelector('text=Chocolate negro 70 %');
  const kDespues = parseKcal(await p.textContent('.metric:has-text("Energía") b')); ok(kDespues - kHoy === 300, `Nutrición de hoy suma el extra (${kHoy} → ${kDespues})`);
  ok(await p.locator('.stackbar').count() === 1 && (await p.textContent('.legend')).includes('Hidratos'), 'Aparece el reparto de energía (proteína / hidratos / grasa)');
  await p.reload(); await p.waitForSelector('#add-extra'); ok(await p.locator('text=Chocolate negro 70 %').count() >= 1, 'Los extras se guardan al reiniciar');
  await p.click('[aria-label="Quitar Chocolate negro 70 %"]'); ok(await p.locator('.row:has-text("Chocolate negro")').count() === 0, 'Se puede quitar un extra');
  // ---- Menú no cuenta los extras ----
  // ---- Ajustes: ingredientes con macros ----
  await p.click('nav >> text=Ajustes'); ok(await p.locator('#aj-ingredientes').count() === 0, 'Ajustes: sin lista de ingredientes');
  ok(p.errs.length === 0, 'Sin errores JS: ' + JSON.stringify(p.errs));
  // ---- Navegador sin la app de escritorio ----
  const w = await nuevo(b, { escritorio: false }); await w.waitForSelector('.sheet'); await w.click('text=Empezar con un plan de ejemplo'); await w.waitForSelector('.slot');
  await w.click('nav >> text=Menú'); await w.click('.plato >> nth=0'); await w.click('#anadir-alimento'); await w.fill('#buscar-alimento', 'arroz');
  await w.waitForSelector('text=necesita conexión'); ok(true, 'Navegador: la base propia funciona y avisa de que los productos son de la app de escritorio');
  ok(await w.locator('.res:has-text("Arroz integral")').count() === 1, 'Navegador: sigue encontrando alimentos de la base');
  // ---- Datos de una versión antigua (sin hidratos/grasa) ----
  const viejo = { perfil: { listo: true, nombre: 'Vieja' }, ingredientes: { pollo: { n: 'Pechuga de pollo', u: 'g', k: 120, p: 23, s: 'carne' }, cosa: { n: 'Cosa propia', u: 'g', k: 200, p: 5, s: 'despensa' } },
    menu: { ancla: '2026-10-26', semanas: [Array.from({ length: 7 }, () => ({ comida: { t: 'Prueba', items: [['pollo', 100], ['cosa', 50]] }, cena: null }))], fijos: {}, horas: {} }, entreno: { sesiones: [] } };
  const v = await nuevo(b, { datos: viejo }); await v.waitForSelector('.slot'); await v.click('nav >> text=Menú'); await v.click('.plato >> nth=0'); await v.click('#anadir-alimento'); await v.fill('#buscar-alimento', 'pollo'); await v.waitForSelector('.res:has-text("Pechuga de pollo")');
  ok((await v.textContent('.res:has-text("Pechuga de pollo")')).includes('G 2.6'), 'Datos antiguos: el pollo recupera hidratos/grasa de la base');
  await v.fill('#buscar-alimento', 'cosa'); await v.waitForSelector('.res:has-text("Cosa propia")'); ok(!(await v.textContent('.res:has-text("Cosa propia")')).includes(' C '), 'Datos antiguos: un ingrediente propio sin macros no inventa valores');
  await v.click('.sheet >> text=Cancelar >> nth=-1'); await v.click('.sheet >> text=Cancelar'); await v.click('nav >> text=Hoy'); ok(await v.locator('.stackbar').count() === 0, 'Sin macros completos no se muestra un reparto engañoso');
  console.log('errores JS:', JSON.stringify([...p.errs, ...w.errs, ...v.errs])); await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
