const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function nuevo(b, mobile = false) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1180, height: 900 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" })); await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { localStorage.setItem('stub', JSON.stringify(x)); return true; } }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Carlos'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot'); return p;
}
(async () => {
  const b = await chromium.launch(); let p = await nuevo(b);
  await p.click('nav >> text=Ajustes');
  // ---- centro ----
  const filas = await p.locator('.row.aj .grow').allTextContents(); ok(filas.length === 6, 'El centro de Ajustes son 6 secciones: ' + filas.map((f) => f.split(/\d|Tu |Copia|Versión/)[0].trim()).join(' · '));
  ok(await p.locator('.page input, .page select').count() === 0, 'Sin campos sueltos: todo está dentro de submenús');
  const todo = await p.textContent('.page'); ok(!/Desayuno|Horarios|Ciclo del menú|Media mañana|Merienda/.test(todo), 'El desayuno, la merienda y los horarios ya no están en Ajustes');
  ok((await p.textContent('#aj-objetivos')).includes('1.700 / 1.564 kcal'), 'Objetivos diarios muestra un resumen: ' + (await p.textContent('#aj-objetivos')).replace(/\s+/g, ' ').slice(-48));
  // ---- perfil y volver ----
  await p.click('#aj-perfil'); await p.waitForSelector('#aj-atras'); ok((await p.textContent('h1.title')) === 'Perfil', 'Perfil abre su propia pantalla'); await p.fill('input[placeholder="Tu nombre"]', 'Carlos M.'); await p.press('input[placeholder="Tu nombre"]', 'Tab');
  await p.click('#aj-atras'); await p.waitForSelector('#aj-perfil'); ok((await p.textContent('#aj-perfil')).includes('Carlos M.'), 'Volver con ‹ Ajustes muestra el cambio en el resumen');
  await p.click('#aj-perfil'); await p.keyboard.press('Escape'); await p.waitForSelector('#aj-perfil'); ok(true, 'Esc también vuelve al centro');
  // ---- objetivos ----
  await p.click('#aj-objetivos'); ok(await p.locator('#calcular-objetivos').count() === 1 && await p.locator('.row:has-text("Día con entreno · calorías") input').count() === 1, 'Objetivos: botón de calcular y los campos a mano');
  await p.fill('.row:has-text("Día con entreno · calorías") input', '2500'); await p.press('.row:has-text("Día con entreno · calorías") input', 'Tab'); await p.click('#aj-atras'); ok((await p.textContent('#aj-objetivos')).includes('2.500'), 'Cambiar las calorías se refleja en el resumen');
  // ---- los ingredientes ya no se ven en Ajustes ----
  ok(await p.locator('#aj-ingredientes').count() === 1 && await p.locator('#ing-lista').count() === 0, 'Ajustes: Ingredientes es una sección aparte, la lista no está en el centro');
  while (await p.locator('.sheet').count()) { await p.locator('.sheet header .btn.plain').last().click(); await p.waitForTimeout(80); }
  // ---- datos y acerca ----
  await p.click('#aj-datos'); ok((await p.textContent('.page')).includes('Guardar una copia') && (await p.textContent('.page')).includes('Borrar todos mis datos'), 'Datos y copias: copia, recuperar, plantilla y borrar'); await p.click('text=Borrar todos mis datos'); await p.waitForSelector('.sheet:has-text("¿Borrar todo?")'); ok(true, 'Borrar pide confirmación'); await p.locator('.sheet header .btn.plain').click();
  await p.click('#aj-atras'); await p.click('#aj-acerca'); ok((await p.textContent('.page')).includes('Política de privacidad'), 'Acerca de: versión y enlaces');
  // ---- al cambiar de pestaña y volver, el centro ----
  await p.click('nav >> text=Hoy'); await p.click('nav >> text=Ajustes'); ok(await p.locator('#aj-perfil').count() === 1, 'Volver a la pestaña Ajustes lleva siempre al centro');
  // ---- móvil ----
  const m = await nuevo(b, true); await m.click('nav >> text=Ajustes'); await m.waitForSelector('#aj-perfil');
  const alto = await m.evaluate(() => [...document.querySelectorAll('.row.aj')].map((x) => Math.round(x.getBoundingClientRect().height))); ok(alto.every((x) => x >= 52), 'Móvil: filas cómodas de tocar (' + alto.join(',') + ' px)');
  ok(!(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'Móvil: sin desbordes'); await m.screenshot({ path: SHOTS + '/aj-movil.png' });
  console.log('errores JS:', JSON.stringify([...p.errs, ...m.errs])); await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
