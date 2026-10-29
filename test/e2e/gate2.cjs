const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE, SHOTS = process.env.SHOTS || require('os').tmpdir();
const crypto = require('crypto');
// ---- Supabase simulado ----
const users = new Map(), tokens = new Map(), rows = new Map(); let tick = 0; const subidas = [];
const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const json = (r, status, body) => r.fulfill({ status, headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const sesion = (u) => { const t = crypto.randomUUID(); tokens.set(t, u.id); return { access_token: t, refresh_token: 'r' + t, expires_in: 3600, user: { id: u.id, email: u.email } }; };
async function fake(route) {
  const req = route.request(); if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: H });
  const u = new URL(req.url()), p = u.pathname, body = req.postData() ? JSON.parse(req.postData()) : null;
  const uid = tokens.get((req.headers().authorization || '').replace('Bearer ', ''));
  if (p === '/auth/v1/resend' || p === '/auth/v1/recover') return json(route, 200, {});
  if (p === '/auth/v1/signup' && body.email.startsWith('confirma')) { users.set(body.email, { id: crypto.randomUUID(), email: body.email, pw: body.password }); return json(route, 200, { id: 'x', email: body.email }); }
  if (p === '/auth/v1/signup') { if (users.has(body.email)) return json(route, 422, { msg: 'User already registered' }); const us = { id: crypto.randomUUID(), email: body.email, pw: body.password }; users.set(body.email, us); return json(route, 200, sesion(us)); }
  if (p === '/auth/v1/token') { const us = users.get(body.email); if (!us || us.pw !== body.password) return json(route, 400, { error_description: 'Invalid login credentials' }); return json(route, 200, sesion(us)); }
  if (p === '/auth/v1/logout') return route.fulfill({ status: 204, headers: H });
  if (p === '/rest/v1/datos') {
    if (!uid) return json(route, 401, { message: 'JWT' });
    const stamp = () => new Date(Date.UTC(2026, 9, 28, 12, 0, ++tick)).toISOString().replace('Z', '000+00:00');
    const m = req.method();
    if (m === 'GET') return json(route, 200, rows.has(uid) ? [rows.get(uid)] : []);
    if (m === 'POST') { if (rows.has(uid)) return json(route, 409, { message: 'duplicate' }); const r = { contenido: body.contenido, actualizado: stamp() }; rows.set(uid, r); subidas.push(body.contenido); return json(route, 201, [r]); }
    if (m === 'PATCH') { const base = decodeURIComponent((u.search.match(/actualizado=eq\.([^&]+)/) || [])[1] || ''); const r = rows.get(uid); if (!r || r.actualizado !== base) return json(route, 200, []); r.contenido = body.contenido; r.actualizado = stamp(); subidas.push(body.contenido); return json(route, 200, [r]); }
    if (m === 'DELETE') { rows.delete(uid); return route.fulfill({ status: 204, headers: H }); }
  }
  return json(route, 404, { message: 'no' });
}
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
async function dispositivo(b) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 760 } }); const errs = [];
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'https://fake.supabase.co',anonKey:'anon'};" }));
  await ctx.route('https://fake.supabase.co/**', fake); await ctx.route(/open-meteo|api\.github/, (r) => r.abort());
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs; await p.goto(BASE + '/index.html'); return p;
}
(async () => {
  const b = await chromium.launch();
  const A = await dispositivo(b); await A.waitForSelector('.gate');
  ok(await A.locator('#gate-correo').count() === 1 && await A.locator('#gate-invitado').count() === 1, 'Inicio: correo e invitado visibles');
  // ---- Entrar → Crear cuenta en SU PROPIA pantalla ----
  await A.click('#gate-correo'); await A.waitForSelector('h1.auth-title:has-text("Entrar")');
  ok(await A.locator('#auth-clave2').count() === 0, 'Pantalla "Entrar": solo correo y contraseña');
  await A.click('#auth-alt'); await A.waitForSelector('h1.auth-title:has-text("Crear cuenta")');
  ok(await A.locator('#auth-clave2').count() === 1, 'Crear cuenta es otra pantalla (con repetir contraseña)');
  await A.fill('#auth-correo', 'ana@ejemplo.com'); await A.fill('#auth-clave', 'corta'); await A.fill('#auth-clave2', 'corta'); await A.click('#auth-enviar');
  ok((await A.textContent('.err')).includes('8 caracteres'), 'Contraseña corta: mensaje claro');
  await A.fill('#auth-clave', 'clave-larga-1'); await A.fill('#auth-clave2', 'clave-distinta'); await A.click('#auth-enviar');
  ok((await A.textContent('.err')).includes('no coinciden'), 'Contraseñas distintas: "no coinciden"');
  await A.click('#auth-atras'); ok(await A.locator('h1.auth-title:has-text("Entrar")').count() === 1, 'Atrás desde Crear cuenta vuelve a Entrar');
  await A.keyboard.press('Escape'); await A.waitForSelector('#gate-correo'); ok(true, 'Esc desde Entrar vuelve al inicio');
  // ---- Mostrar/ocultar contraseña ----
  await A.click('#gate-correo'); await A.click('.ver'); ok((await A.getAttribute('#auth-clave', 'type')) === 'text', 'Botón Mostrar enseña la contraseña');
  // ---- Recuperar contraseña ----
  await A.click('#auth-olvido'); await A.waitForSelector('h1.auth-title:has-text("Recuperar")'); await A.fill('#auth-correo', 'ana@ejemplo.com'); await A.click('#auth-enviar');
  await A.waitForSelector('text=recibirás un mensaje'); ok(true, 'Recuperar contraseña: aviso de envío');
  // ---- Crear cuenta de verdad ----
  await A.click('#auth-atras'); await A.click('#auth-alt'); await A.fill('#auth-correo', 'ana@ejemplo.com'); await A.fill('#auth-clave', 'clave-larga-1'); await A.fill('#auth-clave2', 'clave-larga-1'); await A.click('#auth-enviar');
  await A.waitForSelector('.sheet:has-text("Bienvenido a Rutina")', { timeout: 8000 }); ok(true, 'Cuenta nueva → bienvenida');
  await A.fill('input[placeholder="Tu nombre"]', 'Ana'); await A.click('text=Empezar con un plan de ejemplo'); await A.waitForSelector('.slot'); await A.waitForTimeout(5500);
  ok(subidas.length >= 1 && subidas[subidas.length - 1].perfil.nombre === 'Ana', 'El plan llegó a la nube');
  // ---- Otro ordenador entra (Enter envía el formulario) ----
  const B = await dispositivo(b); await B.waitForSelector('.gate'); await B.click('#gate-correo'); await B.fill('#auth-correo', 'ana@ejemplo.com'); await B.fill('#auth-clave', 'mala-1234'); await B.press('#auth-clave', 'Enter');
  await B.waitForSelector('.err:has-text("incorrectos")'); ok(true, 'Contraseña incorrecta: mensaje en español');
  await B.fill('#auth-clave', 'clave-larga-1'); await B.press('#auth-clave', 'Enter'); await B.waitForSelector('h1.title:has-text(", Ana")', { timeout: 9000 }); ok(true, 'Otro ordenador: entra con Enter y recibe el plan');
  // ---- Cuenta que necesita confirmar el correo ----
  const C = await dispositivo(b); await C.waitForSelector('.gate'); await C.click('#gate-correo'); await C.click('#auth-alt');
  await C.fill('#auth-correo', 'confirma@ejemplo.com'); await C.fill('#auth-clave', 'clave-larga-1'); await C.fill('#auth-clave2', 'clave-larga-1'); await C.click('#auth-enviar');
  await C.waitForSelector('h1.auth-title:has-text("Revisa tu correo")'); ok((await C.textContent('.gate-sub')).includes('confirma@ejemplo.com'), 'Pantalla "Revisa tu correo" con la dirección');
  await C.click('#auth-reenviar'); await C.waitForSelector('text=vuelto a enviar'); ok(true, 'Reenviar el correo funciona');
  await C.click('#auth-enviar'); ok(await C.locator('h1.auth-title:has-text("Entrar")').count() === 1, '"Ya lo he confirmado" lleva a Entrar');
  // ---- Invitado → crea cuenta desde Ajustes (también pantalla completa) ----
  const D = await dispositivo(b); await D.waitForSelector('.gate'); await D.click('#gate-invitado'); await D.waitForSelector('.sheet:has-text("Bienvenido")');
  await D.fill('input[placeholder="Tu nombre"]', 'Luis'); await D.click('text=Empezar en blanco'); await D.waitForSelector('h1.title');
  await D.click('.banner >> text=Crear cuenta'); await D.waitForSelector('h1.auth-title:has-text("Crear cuenta")'); ok(true, 'Desde el recordatorio abre directamente "Crear cuenta"');
  await D.fill('#auth-correo', 'luis@ejemplo.com'); await D.fill('#auth-clave', 'otra-clave-22'); await D.fill('#auth-clave2', 'otra-clave-22'); await D.click('#auth-enviar');
  await D.waitForSelector('h1.title', { timeout: 9000 }); await D.waitForTimeout(6000); ok(subidas.some((x) => x.perfil && x.perfil.nombre === 'Luis'), 'Invitado que crea cuenta: sus datos suben');
  // ---- Botón de Google: estilo oficial (solo app de escritorio con Google activado) ----
  for (const esquema of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 900, height: 700 }, colorScheme: esquema });
    await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'https://fake.supabase.co',anonKey:'a',google:true};" })); await ctx.route(/fake\.supabase|open-meteo|api\.github/, (r) => r.abort());
    const g = await ctx.newPage(); await g.addInitScript(() => { let d = null; window.rutina = { platform: 'win32', load: async () => d, save: async (x) => { d = x; return true; }, sesion: { cargar: async () => null, guardar: async () => true }, oauth: async () => 'c' }; });
    await g.goto(BASE + '/index.html'); await g.waitForSelector('#auth-google');
    const st = await g.evaluate(() => { const e = document.getElementById('auth-google'), c = getComputedStyle(e); return { fondo: c.backgroundColor, borde: c.borderTopWidth + ' ' + c.borderTopColor, texto: e.textContent, logos: e.querySelectorAll('svg path').length, alto: Math.round(e.getBoundingClientRect().height) }; });
    console.log(esquema.padEnd(5), JSON.stringify(st)); ok(st.logos === 4 && st.texto === 'Continuar con Google' && st.alto === 44, `Botón Google (${esquema}): logo de 4 colores, texto oficial y 44 px`);
    await g.click('#gate-correo'); ok(await g.locator('#auth-google').count() === 1, 'También en la pantalla Entrar'); await g.screenshot({ path: SHOTS + `/auth-${esquema}.png` }); await ctx.close();
  }
  console.log('errores JS:', JSON.stringify([...A.errs, ...B.errs, ...C.errs, ...D.errs])); await b.close();
})().catch((e) => { console.error('FALLO', e.message.split('\n').slice(0, 3).join(' | ')); process.exit(1); });
