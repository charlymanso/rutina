const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
// Deja el plan con (o sin) entreno programado para HOY, sea cual sea el día de la semana en que se ejecute la prueba.
async function fijarEntreno(p, conEntreno) {
  await p.waitForTimeout(600);
  await p.evaluate((con) => { const d = JSON.parse(localStorage.getItem('stub')), hoy = (new Date().getDay() + 6) % 7; d.entreno.sesiones.forEach((x) => { x.dias = []; }); if (con) d.entreno.sesiones[0].dias = [hoy]; d.dias = {}; localStorage.setItem('congelar', '1'); localStorage.setItem('stub', JSON.stringify(d)); }, conEntreno);
  await p.reload(); await p.waitForSelector('.slot, .empty'); await p.evaluate(() => localStorage.removeItem('congelar'));
  if (conEntreno) await p.waitForSelector('#slot-gym');
}
async function nuevo(b, mobile) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1180, height: 900 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'',anonKey:'',google:false};" })); await ctx.route(/open-meteo|api\.github|supabase/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
  await p.addInitScript(() => { window.rutina = { platform: 'win32', load: async () => { try { return JSON.parse(localStorage.getItem('stub')); } catch { return null; } }, save: async (x) => { if (localStorage.getItem('congelar')) return true; localStorage.setItem('stub', JSON.stringify(x)); return true; } }; });
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('h1.title'); await fijarEntreno(p, true); return p;
}
(async () => {
  const b = await chromium.launch();
  for (const mobile of [false, true]) {
    const p = await nuevo(b, mobile), etiqueta = mobile ? 'Móvil' : 'Escritorio';
    await p.evaluate(() => { document.querySelector('nav.side').dataset.marca = 'misma'; document.querySelector('.nav.principal').dataset.marca = 'mismo'; });
    for (const t of ['Compra', 'Menú', 'Hoy', 'Entreno', 'Ajustes', 'Hoy']) await p.click(`nav >> text=${t}`);
    const persiste = await p.evaluate(() => ({ nav: document.querySelector('nav.side').dataset.marca, hoy: document.querySelector('.nav.principal').dataset.marca, navs: document.querySelectorAll('nav.side').length }));
    ok(persiste.nav === 'misma' && persiste.hoy === 'mismo' && persiste.navs === 1, `${etiqueta}: la barra y el botón de Hoy son los mismos elementos tras 6 cambios de pestaña (no se reconstruyen)`);
    await p.click('.slot >> nth=0 >> .chk'); await p.click('nav >> text=Menú'); await p.click('nav >> text=Hoy'); await p.click('#slot-gym'); await p.waitForSelector('.sheet'); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok((await p.evaluate(() => document.querySelector('.nav.principal').dataset.marca)) === 'mismo', `${etiqueta}: tampoco se reconstruye al marcar cosas ni al abrir y cerrar cuadros`);
    ok((await p.evaluate(() => document.querySelectorAll('.nav[aria-current=page]').length)) === 1 && (await p.getAttribute('.nav.principal', 'aria-current')) === 'page', `${etiqueta}: solo una pestaña marcada (Hoy)`);
    if (mobile) {
      // muestreo fotograma a fotograma tras pulsar cada pestaña: el botón redondo debe quedar siempre encima, quieto y entero
      for (const t of ['Menú', 'Compra', 'Entreno', 'Ajustes', 'Hoy']) {
        const r = await p.evaluate(async (nombre) => {
          const ico = () => document.querySelector('.nav.principal .ico').getBoundingClientRect(), ini = ico(); const muestras = [];
          [...document.querySelectorAll('nav .nav')].find((x) => x.textContent.trim() === nombre).click();
          await new Promise((res) => { let n = 0; const paso = () => { const r = ico(), cx = r.left + r.width / 2;
            const puntos = [[cx, r.top + 5], [cx, r.top + r.height / 2], [r.left + 12, r.top + r.height / 2], [r.right - 12, r.top + r.height / 2]].map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest('.nav.principal')); });
            muestras.push({ encima: puntos.every(Boolean), quieto: Math.abs(r.top - ini.top) < 0.5 && Math.abs(r.width - ini.width) < 0.5 }); if (++n < 45) requestAnimationFrame(paso); else res(); }; requestAnimationFrame(paso); });
          return { frames: muestras.length, tapado: muestras.filter((m) => !m.encima).length, movido: muestras.filter((m) => !m.quieto).length }; }, t);
        ok(r.tapado === 0 && r.movido === 0, `Móvil → "${t}": en ${r.frames} fotogramas el botón de Hoy nunca se tapó (${r.tapado}) ni se movió (${r.movido})`);
      }
      const css = await p.evaluate(() => ({ lado: getComputedStyle(document.querySelector('nav.side')).backdropFilter, antes: getComputedStyle(document.querySelector('nav.side'), '::before').backdropFilter, z: getComputedStyle(document.querySelector('nav.side')).zIndex }));
      ok(css.lado === 'none' && css.antes.includes('blur') && css.z === '5', `Móvil: el difuminado va en una capa aparte (barra: ${css.lado}, capa: blur) y la barra queda por encima del contenido (z=${css.z})`);
    }
    if (!mobile) {
      ok(!(await p.textContent('.slot:has(#slot-gym)')).includes('Ver y registrar'), 'La tarjeta de entreno ya no dice "Ver y registrar"');
      // ---- duración ----
      await fijarEntreno(p, false);
      await p.click('nav >> text=Entreno'); await p.click('#nueva-sesion'); await p.waitForSelector('#ses-dur');
      ok((await p.inputValue('#ses-dur')) === '60' && (await p.inputValue('#ses-dur-unidad')) === 'min', 'Duración nueva: 60 y "minutos" por defecto');
      const hoyIdx = await p.evaluate(() => (new Date().getDay() + 6) % 7); for (let i = 0; i < 7; i++) if ((await p.getAttribute('#ses-dia-' + i, 'aria-pressed')) === 'true') await p.click('#ses-dia-' + i); await p.click('#ses-dia-' + hoyIdx);
      await p.fill('.sheet input[type=text] >> nth=0', 'Cardio'); await p.fill('#ses-dur', 'abc'); await p.click('.sheet header .btn:not(.plain)'); ok((await p.textContent('.sheet .err')).includes('con números'), 'Si no son números, lo dice');
      await p.fill('#ses-dur', '700'); await p.click('.sheet header .btn:not(.plain)'); ok((await p.textContent('.sheet .err')).includes('más de 10 horas'), '700 minutos: sugiere cambiar a horas');
      await p.fill('#ses-dur', '1,5'); await p.selectOption('#ses-dur-unidad', 'h'); await p.click('.sheet header .btn:not(.plain)'); await p.waitForTimeout(250);
      ok((await p.textContent('section.card:has-text("Cardio") .label')).includes('1,5 h'), 'Se guarda "1,5 h": ' + (await p.textContent('section.card:has-text("Cardio") .label')).slice(0, 50));
      await p.click('nav >> text=Hoy'); ok((await p.textContent('#slot-gym')).includes('Cardio') || (await p.textContent('.slot:has-text("Entreno")')).includes('1,5 h'), 'Hoy muestra la duración: ' + (await p.textContent('.slot:has-text("Entreno") .kind')));
      await p.click('nav >> text=Entreno'); await p.click('section.card:has-text("Cardio") >> text=Editar'); await p.waitForSelector('#ses-dur'); ok((await p.inputValue('#ses-dur')) === '1,5' && (await p.inputValue('#ses-dur-unidad')) === 'h', 'Al editar vuelve a mostrar 1,5 y "horas"');
      await p.fill('#ses-dur', '45'); await p.selectOption('#ses-dur-unidad', 'min'); await p.click('.sheet header .btn:not(.plain)'); await p.waitForTimeout(250); ok((await p.textContent('section.card:has-text("Cardio") .label')).includes('45 min'), 'Cambiar a 45 minutos funciona');
      await p.click('section.card:has-text("Cardio") >> text=Editar'); await p.fill('#ses-dur', ''); await p.click('.sheet header .btn:not(.plain)'); await p.waitForTimeout(250); ok(!/\d\s*(min|h)\b/.test(await p.textContent('section.card:has-text("Cardio") .label')), 'La duración se puede dejar vacía');
      await p.click('section.card:has-text("Empuje") >> text=Editar'); ok((await p.inputValue('#ses-dur')) === '60' && (await p.inputValue('#ses-dur-unidad')) === 'min', 'Las sesiones de antes ("60 min") se leen bien');
    }
    ok(p.errs.length === 0, `${etiqueta}: sin errores JS ${JSON.stringify(p.errs)}`);
  }
  await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
