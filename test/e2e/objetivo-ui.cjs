const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function nuevo(b) {
  const ctx = await b.newContext({ viewport: { width: 1180, height: 900 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" })); await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { localStorage.setItem('stub', JSON.stringify(x)); return true; } }; });
  await p.goto(BASE + '/index.html'); return p;
}
const kc = (t) => parseInt(t.replace(/\./g, '').match(/(\d+)\s*kcal/)[1], 10);
(async () => {
  const b = await chromium.launch(); let p = await nuevo(b);
  await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Carlos'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot');
  // ---- Calculadora desde Ajustes ----
  await p.click('nav >> text=Ajustes'); await p.click('#aj-objetivos'); await p.click('#calcular-objetivos'); await p.waitForSelector('#obj-edad');
  ok((await p.textContent('#obj-ayuda')).includes('Rellena tus datos'), 'Calculadora vacía: pide los datos');
  await p.fill('#obj-edad', '10'); await p.fill('#obj-altura', '180'); await p.fill('#obj-peso', '80'); ok((await p.textContent('#obj-ayuda')).includes('entre 16 y 90'), 'Edad fuera de rango: mensaje claro');
  await p.fill('#obj-edad', '30'); await p.selectOption('#obj-meta', 'def'); await p.waitForSelector('#obj-kcal');
  ok((await p.textContent('#obj-kcal')).replace(/\./g, '') === '2210 kcal', 'Hombre 30 a, 180 cm, 80 kg, moderada, perder grasa = 2.210 kcal (igual que Macrómetro)');
  ok((await p.textContent('#obj-dias')).includes('2.310') && (await p.textContent('#obj-dias')).includes('2.130'), 'Reparte entre días de entreno (2.310) y descanso (2.130) con tus 3 sesiones');
  ok((await p.textContent('.sheet')).includes('160 g'), 'Proteína 160 g (2 g/kg)'); ok(await p.locator('.sheet .stackbar').count() === 1, 'Muestra el reparto de macros');
  ok((await p.textContent('.sheet')).includes('no un consejo médico'), 'Incluye el aviso de que es orientativo');
  await p.selectOption('#obj-meta', 'vol'); const vol = kc(await p.textContent('#obj-kcal')); await p.selectOption('#obj-meta', 'man'); const man = kc(await p.textContent('#obj-kcal')); ok(vol > man, `Ganar músculo (${vol}) > mantener (${man})`);
  await p.selectOption('#obj-meta', 'def'); await p.click('.sheet header .btn:not(.plain)'); await p.waitForTimeout(150);
  ok(await p.locator('.row:has-text("Día con entreno · calorías") input').inputValue() === '2310', 'Aplicado: día con entreno = 2310 kcal en Ajustes');
  ok(await p.locator('.row:has-text("Día sin entreno · calorías") input').inputValue() === '2130', 'Aplicado: día sin entreno = 2130 kcal');
  ok(await p.locator('.row:has-text("Día con entreno · proteína") input').inputValue() === '160', 'Aplicado: proteína 160 g');
  await p.click('nav >> text=Hoy'); const hoy = await p.textContent('.metric:has-text("Energía") .top'); ok(/2\.(310|130)/.test(hoy), 'Hoy usa el objetivo nuevo: ' + hoy.trim().slice(-22));
  await p.click('nav >> text=Ajustes'); await p.click('#aj-objetivos'); await p.click('#calcular-objetivos'); await p.waitForSelector('#obj-edad'); ok((await p.inputValue('#obj-peso')) === '80', 'Recuerda tus datos la próxima vez');
  await p.keyboard.press('Escape');
  // ---- Recomendar menú ----
  await p.click('nav >> text=Menú'); await p.click('#recomendar'); await p.waitForSelector('#rec-lista .row');
  ok(await p.locator('#rec-lista .row').count() === 7, 'Propuesta de 7 días');
  const total = async () => (await p.locator('#rec-lista .row').allTextContents()).map(kc);
  const t0 = await total(); ok(t0.every((k) => k > 1800 && k < 2600), 'Cada día ronda tu objetivo: ' + t0.join(', ') + ' kcal');
  const antes = await p.textContent('#rec-lista'); await p.click('#rec-otra'); ok((await p.textContent('#rec-lista')) !== antes, '"Otra propuesta" cambia el menú');
  await p.selectOption('#rec-dieta', 'vegana'); let txt = await p.textContent('#rec-lista'); ok(!/Pollo|Ternera|Salmón|Merluza|Atún|Huevo|Tortilla|Pavo|Gambas|Dorada|Bacalao|Yogur|Revuelto|Hamburguesa|Sardinas/.test(txt), 'Dieta vegana: sin carne, pescado, huevo ni lácteos en los nombres');
  await p.click('#rec-ex-gluten'); txt = await p.textContent('#rec-lista'); ok(!/Pasta|Macarrones|Cuscús|Sándwich|Pan |tostadas|Tostadas/.test(txt) && (await p.getAttribute('#rec-ex-gluten', 'aria-pressed')) === 'true', 'Vegana + sin gluten: sin pasta ni cuscús ni pan');
  await p.selectOption('#rec-dieta', 'omnivora'); await p.click('#rec-ex-gluten');
  await p.click('#rec-ex-pescado'); txt = await p.textContent('#rec-lista'); ok(!/Salmón|Merluza|Atún|Gambas|Dorada|Bacalao|Sardinas/.test(txt), 'Sin pescado ni marisco: ninguno en el menú');
  await p.click('#rec-ex-pescado'); await p.click('#rec-calc'); await p.waitForSelector('#obj-edad'); ok(true, 'Desde aquí se puede abrir la calculadora'); await p.locator('.sheet header .btn.plain').last().click();
  const elegido = (await p.locator('#rec-lista .row >> nth=0').textContent());
  await p.click('.sheet header .btn:not(.plain)'); await p.waitForTimeout(250);
  const primera = (await p.textContent('.plato >> nth=0')); ok(elegido.includes((primera.match(/Comida(.+?)\d/) || [])[1]?.trim().slice(0, 12) || '#'), 'Al usarlo, el menú de la semana cambia a la propuesta');
  const media = kc(await p.textContent('#media-kcal')); ok(media > 2000 && media < 2400, `Media diaria del menú = ${media} kcal (objetivo medio ~2.210)`);
  // ---- La compra refleja el nuevo menú ----
  await p.click('nav >> text=Compra'); ok(await p.locator('.item').count() > 10, 'La lista de la compra se genera desde el menú nuevo');
  ok(p.errs.length === 0, 'Sin errores JS: ' + JSON.stringify(p.errs));
  // ---- Bienvenida con cálculo ----
  const w = await nuevo(b); await w.waitForSelector('.sheet'); await w.click('#bienv-calc'); await w.waitForSelector('#obj-edad');
  await w.click('.sheet >> text=Mujer'); await w.fill('#obj-edad', '28'); await w.fill('#obj-altura', '165'); await w.fill('#obj-peso', '60'); await w.selectOption('#obj-actividad', '1.375'); await w.waitForSelector('#obj-kcal');
  ok((await w.textContent('#obj-kcal')).replace(/\./g, '') === '1830 kcal', 'Mujer 28 a, 165 cm, 60 kg, ligera, mantener = 1.830 kcal');
  ok(await w.locator('#obj-dias').count() === 0, 'Sin sesiones de entreno no separa días de entreno y descanso');
  await w.click('.sheet header .btn:not(.plain)'); await w.waitForTimeout(100); ok((await w.inputValue('.sheet >> nth=-1 >> input[type=number] >> nth=0')) === '1830', 'La bienvenida recibe las calorías calculadas');
  await w.click('text=Empezar con un plan de ejemplo'); await w.waitForSelector('.slot'); await w.click('nav >> text=Ajustes'); await w.click('#aj-objetivos');
  ok(await w.locator('.row:has-text("Día con entreno · calorías") input').inputValue() === '1830', 'Y se guardan como objetivo');
  // ---- Aviso de seguridad ----
  await w.click('#calcular-objetivos'); await w.fill('#obj-edad', '30'); await w.fill('#obj-altura', '155'); await w.fill('#obj-peso', '45'); await w.selectOption('#obj-actividad', '1.2'); await w.selectOption('#obj-meta', 'def'); await w.waitForSelector('.sheet p[role=alert]');
  ok((await w.textContent('.sheet')).includes('mínimo') || (await w.textContent('.sheet')).includes('no suele ser recomendable'), 'Peso bajo + perder grasa: avisa y no recomienda por debajo del mínimo');
  console.log('errores JS:', JSON.stringify([...p.errs, ...w.errs])); await p.screenshot({ path: SHOTS + '/obj-menu.png' }); await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
