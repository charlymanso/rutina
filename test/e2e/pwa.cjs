const { chromium } = require('playwright'); const crypto = require('crypto');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
async function ctxMovil(b, { google = false, esquema = 'light', w = 390, h = 844, ua = UA_IPHONE } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: ua, colorScheme: esquema, serviceWorkers: 'allow' });
  await ctx.route(`${BASE}/config.js`, (r) => r.fulfill({ contentType: 'text/javascript', body: `export const NUBE={url:'https://fake.supabase.co',anonKey:'a',google:${google}};` }));
  await ctx.route(/open-meteo|api\.github/, (r) => r.abort()); return ctx;
}
(async () => {
  const b = await chromium.launch();
  // ---------- 1) Instalable: manifiesto, iconos, service worker, sin conexión ----------
  let ctx = await ctxMovil(b); await ctx.route('https://fake.supabase.co/**', (r) => r.abort()); let p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE + '/index.html'); await p.waitForSelector('.gate');
  const m = await p.evaluate(async () => { const r = await fetch(document.querySelector('link[rel=manifest]').href); return r.json(); });
  ok(m.display === 'standalone' && m.name === 'Rutina' && m.icons.length === 3 && m.icons.some((i) => i.purpose === 'maskable'), 'Manifiesto: standalone, nombre, 3 iconos (uno maskable)');
  for (const i of m.icons) ok((await p.evaluate(async (u) => (await fetch(u)).status, new URL(i.src, BASE + '/').href)) === 200, 'Icono ' + i.src + ' existe');
  ok((await p.getAttribute('link[rel=apple-touch-icon]', 'href')) === 'icons/apple-touch-icon.png' && (await p.evaluate(async () => (await fetch('icons/apple-touch-icon.png')).status)) === 200, 'Icono de iPhone (apple-touch-icon) presente');
  ok((await p.getAttribute('meta[name=apple-mobile-web-app-capable]', 'content')) === 'yes' && (await p.getAttribute('meta[name=viewport]', 'content')).includes('viewport-fit=cover'), 'Etiquetas de iPhone: pantalla completa y viewport-fit=cover');
  await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForFunction(() => !!navigator.serviceWorker.controller || true); await p.reload(); await p.waitForSelector('.gate');
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'Service worker activo y controlando la página');
  ok(await p.evaluate(async () => (await caches.keys()).some((k) => k.startsWith('rutina-')) && (await (await caches.open((await caches.keys())[0])).keys()).length >= 15), 'La app se guardó en el dispositivo (≥15 archivos)');
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.gate', { timeout: 8000 }); ok(true, 'SIN CONEXIÓN: la app abre igualmente');
  await p.click('#gate-invitado'); await p.waitForSelector('.sheet'); await p.fill('input[placeholder="Tu nombre"]', 'Ana'); await p.click('text=Empezar con un plan de ejemplo'); await p.waitForSelector('.slot'); ok(true, 'SIN CONEXIÓN: se puede usar (crear plan, ver el día)');
  await p.click('.slot >> nth=0 >> .chk'); await p.reload(); await p.waitForSelector('.slot'); ok((await p.getAttribute('.slot >> nth=0 >> .chk', 'aria-pressed')) === 'true', 'SIN CONEXIÓN: lo marcado se guarda al reabrir');
  await ctx.setOffline(false);
  // ---------- 2) Aviso para instalar en iPhone ----------
  ok(await p.locator('#aviso-instalar').count() === 1 && (await p.textContent('#aviso-instalar')).includes('Añadir a pantalla de inicio'), 'iPhone en Safari: avisa cómo instalarla ("Añadir a pantalla de inicio")');
  await p.click('#aviso-instalar button'); ok(await p.locator('#aviso-instalar').count() === 0, 'El aviso se puede cerrar'); await p.reload(); await p.waitForSelector('.slot'); ok(await p.locator('#aviso-instalar').count() === 0, 'Y no vuelve');
  // ---------- 3) Aviso de versión nueva ----------
  const swFile = require('fs').readFileSync(process.env.WEB + '/sw.js', 'utf8'); require('fs').writeFileSync(process.env.WEB + '/sw.js', swFile.replace("rutina-__BUILD__", 'rutina-nueva'));   // copia temporal, no el código real
  const yAntes = await p.evaluate(() => document.querySelector('.slot').getBoundingClientRect().top);
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); }); await p.waitForSelector('#sw-actualizar', { timeout: 8000 }); ok(true, 'Versión nueva: aparece "Hay una versión nueva… Actualizar"');
  await p.waitForTimeout(400); const yDespues = await p.evaluate(() => document.querySelector('.slot').getBoundingClientRect().top);
  ok(Math.abs(yAntes - yDespues) < 1, `El aviso flota y NO empuja el contenido (antes ${Math.round(yAntes)} px, después ${Math.round(yDespues)} px)`);
  ok(await p.evaluate(() => { const b = document.querySelector('#sw-actualizar').closest('.banner').getBoundingClientRect(); return b.top >= 0 && b.bottom <= 140 && b.left >= 0 && b.right <= innerWidth; }), 'Y se ve entero, arriba de la pantalla');
  await p.click('#sw-ahora-no'); ok(await p.locator('#sw-actualizar').count() === 0, '"Ahora no" oculta el aviso');
  await p.reload(); await p.waitForSelector('#sw-actualizar', { timeout: 8000 }); ok(true, 'Y vuelve a avisar en el siguiente arranque');
  await Promise.all([p.waitForEvent('load'), p.click('#sw-actualizar')]); await p.waitForSelector('.slot');
  let limpio = false; try { await p.waitForFunction(async () => { const k = await caches.keys(); return k.length === 1 && k[0] === 'rutina-nueva'; }, null, { timeout: 10000 }); limpio = true; } catch { /* se informa abajo */ }
  ok(limpio && await p.locator('#sw-actualizar').count() === 0, 'Al actualizar recarga con la versión nueva y borra la copia vieja (' + (await p.evaluate(async () => (await caches.keys()).join())) + ')');
  // ---------- 4) Diseño de móvil ----------
  for (const tab of ['Hoy', 'Menú', 'Compra', 'Entreno', 'Ajustes']) { await p.click(`nav >> text=${tab}`); await p.waitForTimeout(200); ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `Sin desbordes laterales en "${tab}"`); }
  const nav = await p.evaluate(() => { const n = document.querySelector('.side').getBoundingClientRect(); return { abajo: Math.round(innerHeight - n.bottom), alto: Math.round(n.height), botones: [...document.querySelectorAll('.nav')].map((x) => Math.round(x.getBoundingClientRect().height)) }; });
  ok(nav.abajo <= 1 && nav.botones.every((x) => x >= 44), `Barra inferior pegada al borde y botones táctiles ≥44 px (${nav.botones.join(',')})`);
  await p.click('nav >> text=Menú'); await p.click('#recomendar'); await p.waitForSelector('#rec-lista .row'); await p.waitForTimeout(400);
  const sh = await p.evaluate(() => { const s = document.querySelector('.sheet').getBoundingClientRect(); return { abajo: Math.round(innerHeight - s.bottom), ancho: Math.round(s.width), vw: innerWidth, radio: getComputedStyle(document.querySelector('.sheet')).borderTopLeftRadius }; });
  ok(sh.abajo <= 1 && sh.ancho === sh.vw && sh.radio !== '0px', `Los cuadros suben desde abajo a todo el ancho (${JSON.stringify(sh)})`);
  const alto = await p.evaluate(() => { const b = document.querySelector('.sheet .body'); b.scrollTop = 9999; return { contenido: b.scrollHeight, visible: b.clientHeight, top: b.scrollTop }; }); ok(alto.top > 0, 'El cuadro de móvil se desplaza (' + JSON.stringify(alto) + ')');
  await p.screenshot({ path: SHOTS + '/m-sheet.png' }); await p.keyboard.press('Escape');
  await p.click('nav >> text=Ajustes'); await p.click('#aj-perfil'); await p.waitForTimeout(150); const fs = await p.evaluate(() => [...document.querySelectorAll('input,select')].map((x) => parseFloat(getComputedStyle(x).fontSize))); ok(fs.every((x) => x >= 16), `Campos ≥16 px (no hace zoom el iPhone): mínimo ${Math.min(...fs)} px`);
  await p.click('nav >> text=Hoy'); await p.waitForTimeout(250); await p.screenshot({ path: SHOTS + '/m-hoy.png' });
  ok(errs.length === 0, 'Sin errores JS: ' + JSON.stringify(errs)); await ctx.close();
  // ---------- 5) Google en la web (redirección + PKCE) ----------
  ctx = await ctxMovil(b, { google: true }); let tokenBody = null, authUrl = null;
  await ctx.route('https://fake.supabase.co/**', async (r) => {
    const u = new URL(r.request().url()); const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
    if (u.pathname === '/auth/v1/authorize') { authUrl = u; return r.fulfill({ status: 302, headers: { location: u.searchParams.get('redirect_to') + '?code=abc123' } }); }
    if (u.pathname === '/auth/v1/token') { tokenBody = JSON.parse(r.request().postData()); return r.fulfill({ status: 200, headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ access_token: 't', refresh_token: 'r', expires_in: 3600, user: { id: 'u1', email: 'ana@gmail.com' } }) }); }
    if (u.pathname === '/rest/v1/datos') return r.fulfill({ status: 200, headers: { ...H, 'content-type': 'application/json' }, body: '[]' });
    return r.fulfill({ status: 404, headers: H, body: '{}' });
  });
  p = await ctx.newPage(); const e2 = []; p.on('pageerror', (e) => e2.push(e.message)); await p.goto(BASE + '/index.html'); await p.waitForSelector('#auth-google, .gate');
  ok(await p.locator('#auth-google').count() === 1, 'Web: aparece el botón oficial de Google'); await p.click('#auth-google'); await p.waitForSelector('.sheet:has-text("Bienvenido")', { timeout: 10000 });
  ok(authUrl && authUrl.searchParams.get('provider') === 'google' && authUrl.searchParams.get('code_challenge_method') === 's256', 'Se envía a Google con PKCE (s256)');
  ok(authUrl.searchParams.get('redirect_to') === BASE + '/', 'Vuelve a la raíz del sitio (la dirección ya permitida en Supabase): ' + authUrl.searchParams.get('redirect_to'));
  const reto = crypto.createHash('sha256').update(tokenBody.code_verifier).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  ok(tokenBody.auth_code === 'abc123' && reto === authUrl.searchParams.get('code_challenge'), 'El canje del código demuestra el PKCE (el verificador coincide con el reto)');
  ok(!(await p.url()).includes('code='), 'La dirección queda limpia (sin el código)'); ok(await p.locator('#gate-correo').count() === 0, 'Tras volver ya no se ve la pantalla de inicio');
  ok(e2.length === 0, 'Sin errores JS: ' + JSON.stringify(e2));
  // un error devuelto por Google se muestra
  const q = await ctx.newPage(); await q.goto(BASE + '/index.html?error=access_denied&error_description=Cancelado'); await q.waitForSelector('.toast'); ok((await q.textContent('.toast')).includes('Cancelado'), 'Si cancelas en Google, avisa en vez de quedarse en blanco');
  await ctx.close();
  // ---------- 6) Modo oscuro ----------
  ctx = await ctxMovil(b, { esquema: 'dark' }); await ctx.route('https://fake.supabase.co/**', (r) => r.abort()); p = await ctx.newPage(); await p.goto(BASE + '/index.html'); await p.waitForSelector('.gate'); await p.screenshot({ path: SHOTS + '/m-gate-oscuro.png' }); await ctx.close();
  await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 4).join(' | ')); process.exit(1); });
