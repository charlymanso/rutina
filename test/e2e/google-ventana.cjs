const { chromium } = require('playwright');
// Prueba de interfaz (Playwright). La lanza `npm run test:e2e` (test/e2e/run.cjs), que sirve la app y fija BASE.
const BASE = process.env.BASE;
const ok = (c, t) => { console.log(c ? 'OK  ' : 'FALLO', t); if (!c) process.exitCode = 1; };
// iPhone con la app instalada: Google abre una ventanita encima. La sesión se inicia en ella (mismo almacenamiento) y la app de debajo debe enterarse sola.
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(BASE + '/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const NUBE={url:'https://fake.supabase.co',anonKey:'a',google:true};" }));
  await ctx.route('https://fake.supabase.co/**', async (r) => {
    const u = new URL(r.request().url()); const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: H });
    if (u.pathname === '/auth/v1/token') return r.fulfill({ status: 200, headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify({ access_token: 't', refresh_token: 'r', expires_in: 3600, user: { id: 'u1', email: 'ana@gmail.com' } }) });
    if (u.pathname === '/rest/v1/datos') return r.fulfill({ status: 200, headers: { ...H, 'content-type': 'application/json' }, body: '[]' });
    return r.fulfill({ status: 404, headers: H, body: '{}' });
  });
  await ctx.route(/api\.github/, (r) => r.abort());
  const errs = [], A = await ctx.newPage(); A.on('pageerror', (e) => errs.push(e.message));
  await A.goto(BASE + '/index.html'); await A.waitForSelector('#gate-correo');
  ok(await A.locator('#auth-google').count() === 1, 'La app (ventana de debajo) está en la pantalla de inicio');
  // la ventanita de Google vuelve a la app con ?code= y termina el inicio de sesión en su propia página
  await A.evaluate(() => localStorage.setItem('rutina-pkce-v1', 'verificador-de-prueba'));
  const B = await ctx.newPage(); B.on('pageerror', (e) => errs.push(e.message)); await B.goto(BASE + '/index.html?code=abc123');
  await B.waitForSelector('.sheet:has-text("Bienvenido"), .slot', { timeout: 10000 }); ok(await B.locator('#gate-correo').count() === 0, 'La ventanita ha iniciado la sesión');
  // la de debajo se entera sola, sin tocar nada
  await A.waitForFunction(() => !document.querySelector('#gate-correo'), null, { timeout: 8000 }).catch(() => {});
  ok(await A.locator('#gate-correo').count() === 0, 'La app principal deja la pantalla de inicio sola');
  ok(await A.locator('.sheet:has-text("Bienvenido"), .slot, h1.title').count() > 0, 'Y muestra la app con la sesión iniciada');
  const guardada = await A.evaluate(() => JSON.parse(localStorage.getItem('rutina-sesion-v1') || 'null')); ok(guardada && guardada.user.email === 'ana@gmail.com', 'La sesión es la misma en las dos');
  ok(errs.length === 0, 'Sin errores JS ' + errs.join('|'));
  await b.close();
})();
