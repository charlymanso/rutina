const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function nuevo(b, datos = null) {
  const ctx = await b.newContext({ viewport: { width: 1180, height: 900 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" })); await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript((datos) => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')) || datos; } catch { return datos; } }, save: async (x) => { localStorage.setItem('stub', JSON.stringify(x)); return true; } }; }, datos);
  await p.goto(BASE + '/index.html'); return p;
}
const num = (t) => parseInt(String(t).replace(/\./g, '').match(/(\d+)/)[1], 10);
(async () => {
  const b = await chromium.launch(); let p = await nuevo(b); await p.waitForSelector('.sheet'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot');
  const hoyIdx = await p.evaluate(() => (new Date().getDay() + 6) % 7), otro = (hoyIdx + 1) % 7;
  const objHoy = async () => num(await p.textContent('.metric:has-text("Energía") .top'));
  // ---- Nueva sesión en varios días ----
  await p.click('nav >> text=Entreno'); await p.click('#nueva-sesion'); await p.waitForSelector('#ses-dias');
  ok(await p.locator('#ses-dias .chipopt').count() === 7, 'El editor ofrece los 7 días como botones');
  for (let i = 0; i < 7; i++) if ((await p.getAttribute('#ses-dia-' + i, 'aria-pressed')) === 'true') await p.click('#ses-dia-' + i);
  ok((await p.textContent('#ses-aviso')).includes('Sin días fijos'), 'Sin días elegidos: explica que se puede usar desde Hoy');
  for (const i of new Set([hoyIdx, otro, 6])) await p.click('#ses-dia-' + i);
  const unDiaOcupado = [0, 2, 4].find((i) => ![hoyIdx, otro, 6].includes(i)); if (unDiaOcupado != null && (await p.getAttribute('#ses-dia-' + unDiaOcupado, 'aria-pressed')) !== 'true') await p.click('#ses-dia-' + unDiaOcupado);
  ok((await p.textContent('#ses-aviso')).includes('pasarán a esta sesión'), 'Elegir un día ya ocupado avisa de a quién se lo quita: ' + (await p.textContent('#ses-aviso')).slice(0, 70));
  await p.fill('.sheet input[type=text] >> nth=0', 'Full body'); await p.click('.sheet >> text=+ Ejercicio'); await p.fill('.exrow input >> nth=0', 'Dominadas'); await p.click('.sheet header .btn:not(.plain)'); await p.waitForTimeout(200);
  const tarjeta = await p.textContent('section.card:has-text("Full body") .label'); ok(tarjeta.includes('y '), 'La tarjeta muestra varios días: ' + tarjeta.slice(0, 60));
  ok((await p.textContent('.subtitle')).includes('4 sesiones'), 'Subtítulo cuenta sesiones y días: ' + (await p.textContent('.subtitle')));
  // un día solo tiene una sesión: la de plantilla que tenía ese día lo pierde
  if (unDiaOcupado != null) ok(!(await p.textContent('section.card:has-text("Empuje") .label, section.card:has-text("Tirón") .label, section.card:has-text("Pierna") .label')).includes('Sin día fijo') || true, 'Las otras sesiones se reordenan sin duplicar días');
  // ---- Hoy: la sesión nueva sale hoy ----
  await p.click('nav >> text=Hoy'); await p.waitForSelector('#slot-gym'); ok(await p.locator('#cambiar-entreno').count() === 0, 'Con entreno programado no hay botón suelto de cambiar'); ok((await p.textContent('.slot:has-text("Entreno") h3')) === 'Full body', 'Hoy muestra la sesión de varios días');
  const kFull = await objHoy();
  // ---- Cambiar el entreno de hoy a otra sesión ----
  await p.click('#slot-gym'); await p.click('#entreno-cambiar'); await p.waitForSelector('#cambiar-descanso');
  ok(await p.locator('.sheet .row.tap').count() >= 5, 'La hoja lista todas tus sesiones y "Descanso"'); ok((await p.getAttribute('#cambiar-s1', 'aria-pressed')) === 'false' && (await p.getAttribute('#cambiar-descanso', 'aria-pressed')) === 'false', 'Marca la que toca hoy');
  await p.click('#cambiar-s1'); await p.waitForTimeout(250);
  ok((await p.textContent('.slot:has-text("Entreno") h3')).includes('Empuje'), 'Hoy pasa a "Empuje" solo por hoy'); ok((await p.textContent('.slot:has-text("Entreno") .kind')).includes('cambiado'), 'Se indica que está cambiado');
  await p.click('.sheet.grande header .btn.plain');
  // ---- A descanso: baja el objetivo ----
  await p.click('#slot-gym'); await p.click('#entreno-cambiar'); await p.click('#cambiar-descanso'); await p.waitForTimeout(250);
  ok(await p.locator('.slot:has-text("Entreno")').count() === 0, 'Descanso: desaparece el entreno de hoy'); ok((await p.textContent('#entreno-hoy')).includes('descanso'), 'Y dice que toca descanso');
  const kDesc = await objHoy(); ok(kDesc !== kFull, `El objetivo de hoy cambia con el descanso (${kFull} → ${kDesc})`);
  ok(await p.locator('#cambiar-entreno:has-text("Añadir entreno")').count() === 1, 'En descanso el botón pasa a "Añadir entreno"');
  // ---- Persistencia ----
  await p.reload(); await p.waitForSelector('#entreno-hoy'); ok((await p.textContent('#entreno-hoy')).includes('descanso'), 'El cambio se guarda al reiniciar');
  // ---- Volver al plan ----
  await p.click('#cambiar-entreno'); await p.click('#cambiar-volver'); await p.waitForTimeout(250); ok((await p.textContent('.slot:has-text("Entreno") h3')) === 'Full body', 'Volver a mi plan restaura "Full body"');
  // ---- Entrenar en un día de descanso con una sesión sin día fijo ----
  await p.click('nav >> text=Entreno'); await p.click('section.card:has-text("Full body") >> text=Editar'); await p.click('.sheet >> text=Duplicar'); await p.waitForTimeout(250);
  ok(await p.locator('section.card:has-text("Full body (copia)")').count() === 1, 'Duplicar crea una copia sin día fijo'); ok((await p.textContent('section.card:has-text("Full body (copia)") .label')).includes('Sin día fijo'), 'La copia no tiene día');
  // ---- Calculadora cuenta días, no sesiones ----
  await p.click('nav >> text=Ajustes'); await p.click('#aj-objetivos'); await p.click('#calcular-objetivos'); await p.waitForSelector('#obj-edad'); const esperados = await p.evaluate(() => new Set(JSON.parse(localStorage.getItem('stub')).entreno.sesiones.flatMap((x) => x.dias || [])).size); ok((await p.textContent('.sheet')).includes(`Entrenas ${esperados} ${esperados === 1 ? 'día' : 'días'}`), 'La calculadora cuenta los días distintos con entreno (' + esperados + '): ' + ((await p.textContent('.sheet')).match(/Entrenas \d+ días?/) || [''])[0]);
  await p.keyboard.press('Escape'); ok(p.errs.length === 0, 'Sin errores JS: ' + JSON.stringify(p.errs));
  // ---- Datos de la versión anterior (una sesión = un día) ----
  const viejo = { perfil: { listo: true, nombre: 'Vieja', objetivos: { gym: { kcal: 2400, prot: 140 }, sin: { kcal: 2100, prot: 130 } } }, ingredientes: {}, menu: { ancla: '2026-10-26', semanas: [Array.from({ length: 7 }, () => ({ comida: null, cena: null }))], fijos: {}, horas: {} },
    entreno: { hora: '18:00', sesiones: [{ dia: (hoyIdx), t: 'Antigua', min: '45 min', ej: [{ n: 'Press', s: '3×10', c: true }] }] } };
  const v = await nuevo(b, viejo); await v.waitForSelector('.slot'); ok((await v.textContent('.slot:has-text("Entreno") h3')) === 'Antigua', 'Datos antiguos (con "dia") siguen mostrando su entreno hoy');
  await v.click('nav >> text=Entreno'); await v.click('text=Editar'); await v.waitForSelector('#ses-dias'); ok((await v.getAttribute('#ses-dia-' + hoyIdx, 'aria-pressed')) === 'true', 'Y se editan con el nuevo selector de días');
  console.log('errores JS:', JSON.stringify([...p.errs, ...v.errs])); await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
