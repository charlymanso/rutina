// Cliente mínimo de Supabase (Auth + base de datos) con fetch, sin librerías.
import { NUBE } from './config.js';

export const nubeActiva = () => !!(NUBE.url && NUBE.anonKey);
const base = () => NUBE.url.replace(/\/$/, '');
const puente = () => (typeof window !== 'undefined' ? window.rutina : null);
const KEY = 'rutina-sesion-v1';
let sesion = null;

export const haySesion = () => !!sesion;
export const usuario = () => (sesion ? sesion.user : null);
const esWeb = () => !puente() && typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
export const puedeGoogle = () => !!(NUBE.google && ((puente() && puente().oauth) || esWeb()));
const KEY_PKCE = 'rutina-pkce-v1';

// ---- errores en lenguaje normal ----
function amigable(status, j) {
  const m = String((j && (j.msg || j.message || j.error_description || j.error)) || '');
  const e = new Error(
    /invalid login/i.test(m) ? 'Correo o contraseña incorrectos.' :
    /already registered|already been registered/i.test(m) ? 'Ese correo ya tiene una cuenta. Prueba a entrar.' :
    /not confirmed/i.test(m) ? 'Confirma tu correo antes de entrar. Te enviamos un mensaje.' :
    /at least \d+ char|weak/i.test(m) ? 'La contraseña es demasiado corta o débil.' :
    /valid email|invalid format|email address.*invalid/i.test(m) ? 'Ese correo no parece válido.' :
    status === 429 || /rate limit|too many/i.test(m) ? 'Demasiados intentos. Espera un momento y vuelve a probar.' :
    status === 401 || status === 403 ? 'Tu sesión ha caducado. Vuelve a entrar.' :
    m || 'Algo ha fallado. Inténtalo de nuevo.');
  e.status = status; e.auth = status === 401 || status === 403; return e;
}

async function api(path, { method = 'GET', body, token, headers } = {}) {
  let r;
  try {
    r = await fetch(base() + path, { method, headers: { apikey: NUBE.anonKey, 'Content-Type': 'application/json', Authorization: `Bearer ${token || NUBE.anonKey}`, ...headers }, body: body ? JSON.stringify(body) : undefined });
  } catch { const e = new Error('No hay conexión con internet.'); e.offline = true; throw e; }
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch { /* sin JSON */ }
  if (!r.ok) throw amigable(r.status, j);
  return j;
}

// ---- sesión (en la app de escritorio se guarda cifrada con el llavero del sistema) ----
async function guardarSesion(s) {
  sesion = s;
  if (puente() && puente().sesion) return puente().sesion.guardar(s);
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
}
// Web instalada en iPhone: Google abre una ventanita encima y la sesión se inicia en ella; la app de debajo debe darse cuenta.
// Devuelve true si ahora hay una sesión que esta pantalla aún no conocía.
export async function sesionNuevaEnAlmacen() {
  if (sesion || !nubeActiva() || puente()) return false;
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch { s = null; }
  if (!s || !s.access_token) return false;
  sesion = s; return true;
}
export const claveSesion = () => KEY;
export async function cargarSesion() {
  if (!nubeActiva()) return null;
  try { sesion = puente() && puente().sesion ? await puente().sesion.cargar() : JSON.parse(localStorage.getItem(KEY)); } catch { sesion = null; }
  return sesion;
}
function aSesion(j) {
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: j.user.id, email: j.user.email } };
}
async function tokenValido() {
  if (!sesion) { const e = new Error('Sin sesión'); e.auth = true; throw e; }
  if (sesion.expires_at - Math.floor(Date.now() / 1000) > 60) return sesion.access_token;
  try { await guardarSesion(aSesion(await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: sesion.refresh_token } }))); }
  catch (e) { if (e.offline) throw e; await guardarSesion(null); const x = new Error('Tu sesión ha caducado. Vuelve a entrar.'); x.auth = true; throw x; }
  return sesion.access_token;
}

// ---- cuenta ----
export async function registrar(email, password) {
  const j = await api('/auth/v1/signup', { method: 'POST', body: { email, password } });
  if (j && j.access_token) { await guardarSesion(aSesion(j)); return { confirmar: false }; }
  return { confirmar: true };
}
export async function entrar(email, password) {
  await guardarSesion(aSesion(await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })));
}
export const reenviar = (email) => api('/auth/v1/resend', { method: 'POST', body: { type: 'signup', email } });
export const recuperar = (email) => api('/auth/v1/recover', { method: 'POST', body: { email } });
export async function salir() {
  const t = sesion && sesion.access_token; await guardarSesion(null);
  if (t) { try { await api('/auth/v1/logout', { method: 'POST', token: t }); } catch { /* ya está cerrada localmente */ } }
}

// ---- Google (solo app de escritorio): PKCE + navegador del sistema ----
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function entrarConGoogle() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const enlace = (retorno) => `${base()}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(retorno)}&code_challenge=${challenge}&code_challenge_method=s256`;
  if (puente() && puente().oauth) {
    const code = await puente().oauth(enlace('http://127.0.0.1:53682/callback'));
    await guardarSesion(aSesion(await api('/auth/v1/token?grant_type=pkce', { method: 'POST', body: { auth_code: code, code_verifier: verifier } })));
    return;
  }
  // Web / móvil: se va a Google y vuelve con ?code=. Vuelve a la raíz del sitio (la dirección permitida en Supabase), que reenvía a la app.
  try { localStorage.setItem(KEY_PKCE, verifier); } catch { throw new Error('Tu navegador bloquea el almacenamiento y no se puede iniciar sesión con Google.'); }
  location.assign(enlace(new URL('../', location.href).href));
  return new Promise(() => {}); // la página se va; no se resuelve
}
// Al volver de Google (solo web): canjea el código por la sesión. Devuelve true si inició sesión.
export async function completarGoogleWeb() {
  if (!esWeb() || !nubeActiva()) return false;
  const q = new URLSearchParams(location.search), code = q.get('code'), err = q.get('error_description') || q.get('error');
  if (!code && !err) return false;
  history.replaceState(null, '', location.pathname + location.hash);
  let v = null; try { v = localStorage.getItem(KEY_PKCE); localStorage.removeItem(KEY_PKCE); } catch { /* sin almacenamiento */ }
  if (err) throw new Error(err);
  if (!v) throw new Error('No se pudo completar el inicio de sesión. Inténtalo de nuevo.');
  await guardarSesion(aSesion(await api('/auth/v1/token?grant_type=pkce', { method: 'POST', body: { auth_code: code, code_verifier: v } })));
  return true;
}

// ---- datos (una fila por persona) ----
export async function bajar() {
  const t = await tokenValido();
  const rows = await api(`/rest/v1/datos?select=contenido,actualizado&user_id=eq.${sesion.user.id}`, { token: t });
  return rows && rows[0] ? rows[0] : null;
}
// baseTs = marca de la última versión que conocíamos; si en la nube ya hay otra, lanza conflicto.
export async function subir(contenido, baseTs) {
  const t = await tokenValido(), id = sesion.user.id, prefer = { Prefer: 'return=representation' };
  try {
    const rows = baseTs
      ? await api(`/rest/v1/datos?user_id=eq.${id}&actualizado=eq.${encodeURIComponent(baseTs)}`, { method: 'PATCH', token: t, headers: prefer, body: { contenido } })
      : await api('/rest/v1/datos', { method: 'POST', token: t, headers: prefer, body: { user_id: id, contenido } });
    if (!rows || !rows[0]) { const e = new Error('conflicto'); e.conflicto = true; throw e; }
    return rows[0];
  } catch (e) { if (e.status === 409) e.conflicto = true; throw e; }
}
export async function borrarNube() {
  const t = await tokenValido(); await api(`/rest/v1/datos?user_id=eq.${sesion.user.id}`, { method: 'DELETE', token: t });
}
