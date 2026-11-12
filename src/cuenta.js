// Logo, pantalla de inicio, aviso de actualización, cuenta y sincronización.
import * as L from './logic.js';
import { normalize } from './template.js';
import * as Nube from './cloud.js';
import * as Sync from './sync.js';
import { h, NS, toast, sheets, sheet, confirmSheet, rowOf } from './ui.js';
import { data, S, setData, commit } from './core.js';
import { bienvenida } from './editores.js';
import { tapRow } from './ajustes.js';
import { render } from './app.js';

/* ---------- logo ---------- */
export function logo(px = 88) {
  const e = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
  const svg = e('svg', { viewBox: '0 0 1024 1024', width: px, height: px, 'aria-hidden': 'true' });
  const defs = e('defs', {}), g = e('linearGradient', { id: 'lg', x1: 0, y1: 0, x2: 0, y2: 1 });
  g.append(e('stop', { offset: 0, 'stop-color': '#3aa0ff' }), e('stop', { offset: 1, 'stop-color': '#0066d6' })); defs.append(g);
  svg.append(defs, e('rect', { x: 64, y: 64, width: 896, height: 896, rx: 200, fill: 'url(#lg)' }),
    e('circle', { cx: 512, cy: 512, r: 262, fill: 'none', stroke: '#fff', 'stroke-opacity': '.28', 'stroke-width': 56 }),
    e('path', { d: 'M512 250a262 262 0 0 1 247 175', fill: 'none', stroke: '#fff', 'stroke-width': 56, 'stroke-linecap': 'round' }),
    e('path', { d: 'M390 520l86 86 170-190', fill: 'none', stroke: '#fff', 'stroke-width': 72, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return svg;
}
/* ---------- pantalla de inicio ---------- */
export const mostrarInicio = () => Nube.nubeActiva() && !data.perfil.listo && !Nube.haySesion() && !S.saltarInicio;
// Después de entrar: si la cuenta ya tenía plan se carga solo; si es nueva, se pasa a la bienvenida.
// En el iPhone, tras Google queda una ventanita encima: se avisa de cómo volver a la app
export function mensajeVolver() {
  sheet({ title: 'Sesión iniciada', save: 'Entendido', body: [h('p', {}, 'Ya has entrado con Google. Si ves arriba una barra con «Hecho», púlsala para volver a Rutina: te estará esperando con la sesión iniciada.')], onSave: () => {} });
}
export async function trasEntrar() {
  S.nube = null; S.auth = null; await Sync.sincronizar(); S.saltarInicio = true; render();
  if (!data.perfil.listo) bienvenida(); else toast('Sesión iniciada.');
}
export function viewInicio() {
  const err = h('div', { class: 'err', role: 'alert', style: 'text-align:center' }), msg = h('div', { class: 'mute small', style: 'text-align:center' });
  const bloquear = (on) => document.querySelectorAll('.gate button').forEach((b) => { b.disabled = on; });
  const google = async () => {
    err.textContent = ''; msg.textContent = 'Se ha abierto tu navegador. Elige tu cuenta de Google y vuelve aquí.'; bloquear(true);
    try { await Nube.entrarConGoogle(); msg.textContent = ''; await trasEntrar(); } catch (e) { msg.textContent = ''; err.textContent = e.message; } finally { bloquear(false); }
  };
  return h('div', { class: 'gate' }, h('div', { class: 'gate-card' },
    h('div', { class: 'gate-logo' }, logo(96)), h('h1', { class: 'gate-title' }, 'Rutina'), h('p', { class: 'gate-sub' }, 'Tus comidas, tu compra y tus entrenos.\nTu día, claro.'),
    h('div', { class: 'gate-actions' },
      Nube.puedeGoogle() ? botonGoogle(google) : null,
      h('button', { class: 'btn big', id: 'gate-correo', onclick: () => irAuth('entrar') }, 'Continuar con correo'),
      h('button', { class: 'btn plain big', id: 'gate-invitado', onclick: () => { S.saltarInicio = true; render(); bienvenida(); } }, 'Continuar como invitado'), msg, err),
    h('p', { class: 'gate-note' }, 'Como invitado, tus datos se guardan solo en este ordenador. Con una cuenta puedes usarla también en otros. ',
      h('a', { href: 'https://rutina-fitness.netlify.app/privacidad.html', target: '_blank', rel: 'noopener' }, 'Privacidad'))));
}
/* ---------- aviso de actualización ---------- */
export function bannerUpdate() {
  if (S.swNueva && !S.updateOculto) return h('div', { class: 'banner banner-flota', role: 'status' }, h('span', { class: 'grow' }, 'Hay una versión nueva de Rutina.'), h('button', { class: 'btn', id: 'sw-actualizar', onclick: () => S.swNueva.postMessage('ACTUALIZAR') }, 'Actualizar'), h('button', { class: 'btn plain', id: 'sw-ahora-no', onclick: () => { S.updateOculto = true; render(); } }, 'Ahora no'));
  const u = S.upd; // actualización automática (Windows)
  if (u && u.fase === 'descargando') return h('div', { class: 'banner banner-flota', role: 'status' }, h('span', { class: 'grow' }, `Descargando la versión nueva${u.porcentaje != null ? ` (${u.porcentaje} %)` : ''}…`));
  if (u && u.fase === 'listo') return h('div', { class: 'banner banner-flota', role: 'status' }, h('span', { class: 'grow' }, `La versión ${u.version} está lista.`),
    h('button', { class: 'btn', onclick: () => window.rutina.instalarUpdate() }, 'Reiniciar y actualizar'));
  if (S.update && !S.updateOculto && (!S.autoUpdate || (u && u.fase === 'error'))) return h('div', { class: 'banner banner-flota', role: 'status' }, h('span', { class: 'grow' }, `Hay una versión nueva de Rutina (${S.update.version}).`),
    h('a', { class: 'btn', href: S.update.url, target: '_blank', rel: 'noopener' }, 'Descargar'), h('button', { class: 'btn plain', onclick: () => { S.updateOculto = true; render(); } }, 'Ahora no'));
  return null;
}
/* ---------- cuenta y sincronización ---------- */
export const hace = (ms) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'ahora mismo' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
export function textoEstado() {
  const n = S.nube || {};
  if (n.estado === 'sincronizando') return 'Sincronizando…';
  if (n.estado === 'offline') return 'Sin conexión. Se sincronizará cuando vuelvas a tener internet.';
  if (n.estado === 'error') return n.msg || 'No se pudo sincronizar.';
  const ult = n.ultima || (data.meta || {}).ultima;
  return ult ? `Sincronizado ${hace(ult)}` : 'Aún no sincronizado';
}
export function cuentaGrupo() {
  const u = Nube.usuario();
  return h('section', { class: 'stack', style: 'gap:8px' },
    h('div', { class: 'group' }, u ? [
      rowOf(u.email, h('button', { class: 'btn plain', onclick: async () => { await Nube.salir(); Sync.olvidar(); S.nube = null; render(); toast('Has cerrado la sesión. Tus datos siguen en este ordenador.'); } }, 'Cerrar sesión')),
      h('div', { class: 'row' }, h('div', { class: 'grow' }, 'Estado', h('div', { class: 'sub', id: 'estado-nube' }, textoEstado())), h('button', { class: 'btn sec', onclick: () => Sync.sincronizar() }, 'Sincronizar ahora'))
    ] : [
      h('div', { class: 'row' }, h('div', { class: 'grow' }, 'Usa Rutina en otro ordenador', h('div', { class: 'sub' }, 'Con una cuenta, tu plan se guarda también en la nube y se sincroniza.')),
        h('button', { class: 'btn', onclick: () => irAuth('entrar') }, 'Entrar o crear cuenta'))]));
}
/* Pantallas de cuenta (a pantalla completa, como en una app de verdad): entrar, crear, recuperar y confirmar. */
export const G = (px = 18) => {
  const e = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
  const svg = e('svg', { viewBox: '0 0 48 48', width: px, height: px, 'aria-hidden': 'true' });
  svg.append(e('path', { fill: '#EA4335', d: 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z' }),
    e('path', { fill: '#4285F4', d: 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z' }),
    e('path', { fill: '#FBBC05', d: 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z' }),
    e('path', { fill: '#34A853', d: 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z' }));
  return svg;
};
export const botonGoogle = (onclick) => h('button', { class: 'gbtn', id: 'auth-google', type: 'button', onclick }, G(18), h('span', {}, 'Continuar con Google'));
export function irAuth(pantalla) { sheets.slice().forEach((x) => x.close()); S.bienvenida = null; S.auth = pantalla; S.authMsg = ''; render(); }
export function cerrarAuth() { S.auth = null; render(); if (!data.perfil.listo && !mostrarInicio() && !Nube.haySesion()) bienvenida(); }
export function viewAuth() {
  const f = S.authForm, p = S.auth, err = h('div', { class: 'err', role: 'alert' });
  let ocupado = false;
  const bloquear = (on) => document.querySelectorAll('.auth button, .auth input').forEach((x) => { x.disabled = on; });
  const run = async (fn) => {
    if (ocupado) return; err.textContent = ''; ocupado = true; bloquear(true);
    try { await fn(); } catch (e) { err.textContent = e.message; } finally { ocupado = false; bloquear(false); }
  };
  const mail = () => { if (!/^\S+@\S+\.\S+$/.test(f.correo.trim())) throw new Error('Escribe un correo válido.'); return f.correo.trim(); };
  const campo = (id, ph, tipo, clave, ac) => {
    const i = h('input', { id, type: tipo === 'clave' ? 'password' : 'text', inputmode: tipo === 'correo' ? 'email' : null, autocomplete: ac, placeholder: ph, value: f[clave] || '', oninput: (e) => { f[clave] = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') enviar(); } });
    if (tipo !== 'clave') return i;
    const ver = h('button', { type: 'button', class: 'ver', 'aria-label': 'Mostrar u ocultar la contraseña', onclick: () => { const on = i.type === 'password'; i.type = on ? 'text' : 'password'; ver.textContent = on ? 'Ocultar' : 'Mostrar'; } }, 'Mostrar');
    return h('div', { class: 'pass' }, i, ver);
  };
  const google = () => run(async () => { S.authMsg = 'Se ha abierto tu navegador. Elige tu cuenta de Google y vuelve aquí.'; info.textContent = S.authMsg; await Nube.entrarConGoogle(); S.authMsg = ''; await trasEntrar(); });
  const info = h('div', { class: 'mute small', style: 'text-align:center', role: 'status' }, S.authMsg || '');
  const separador = h('div', { class: 'or' }, h('span', {}, 'o'));
  let enviar, cuerpo, pie, titulo, sub, atras = () => cerrarAuth();

  if (p === 'entrar') {
    titulo = 'Entrar'; sub = 'Con tu cuenta, tu plan te acompaña en todos tus dispositivos.';
    enviar = () => run(async () => { const c = mail(); if (!f.clave) throw new Error('Escribe tu contraseña.'); await Nube.entrar(c, f.clave); f.clave = ''; await trasEntrar(); });
    cuerpo = [campo('auth-correo', 'Correo electrónico', 'correo', 'correo', 'email'), campo('auth-clave', 'Contraseña', 'clave', 'clave', 'current-password'),
      h('button', { class: 'link', id: 'auth-olvido', type: 'button', onclick: () => { S.auth = 'recuperar'; S.authMsg = ''; render(); } }, '¿Has olvidado tu contraseña?'),
      h('button', { class: 'btn big', id: 'auth-enviar', onclick: enviar }, 'Entrar'), Nube.puedeGoogle() ? [separador, botonGoogle(google)] : null];
    pie = ['¿No tienes cuenta? ', h('button', { class: 'link', id: 'auth-alt', onclick: () => { S.auth = 'crear'; S.authMsg = ''; render(); } }, 'Crear cuenta')];
  } else if (p === 'crear') {
    titulo = 'Crear cuenta'; sub = 'Guarda tu plan en la nube y úsalo en más de un ordenador.';
    atras = () => { S.auth = 'entrar'; S.authMsg = ''; render(); };
    enviar = () => run(async () => {
      const c = mail(); if (f.clave.length < 8) throw new Error('La contraseña necesita al menos 8 caracteres.'); if (f.clave !== f.clave2) throw new Error('Las contraseñas no coinciden.');
      const r = await Nube.registrar(c, f.clave); f.clave = ''; f.clave2 = '';
      if (r.confirmar) { S.auth = 'confirmar'; S.authMsg = ''; render(); } else await trasEntrar();
    });
    cuerpo = [campo('auth-correo', 'Correo electrónico', 'correo', 'correo', 'email'), campo('auth-clave', 'Contraseña (mínimo 8 caracteres)', 'clave', 'clave', 'new-password'), campo('auth-clave2', 'Repite la contraseña', 'clave', 'clave2', 'new-password'),
      h('button', { class: 'btn big', id: 'auth-enviar', onclick: enviar }, 'Crear cuenta'),
      h('p', { class: 'gate-note', style: 'margin:0' }, 'Al crear la cuenta aceptas la ', h('a', { href: 'https://rutina-fitness.netlify.app/privacidad.html', target: '_blank', rel: 'noopener' }, 'política de privacidad'), '.'),
      Nube.puedeGoogle() ? [separador, botonGoogle(google)] : null];
    pie = ['¿Ya tienes cuenta? ', h('button', { class: 'link', id: 'auth-alt', onclick: () => { S.auth = 'entrar'; S.authMsg = ''; render(); } }, 'Entrar')];
  } else if (p === 'recuperar') {
    titulo = 'Recuperar contraseña'; sub = 'Te enviaremos un enlace para elegir una nueva.';
    atras = () => { S.auth = 'entrar'; S.authMsg = ''; render(); };
    enviar = () => run(async () => { const c = mail(); await Nube.recuperar(c); S.authMsg = 'Si ese correo tiene cuenta, recibirás un mensaje con el enlace. Revisa también la carpeta de spam.'; render(); });
    cuerpo = [campo('auth-correo', 'Correo electrónico', 'correo', 'correo', 'email'), h('button', { class: 'btn big', id: 'auth-enviar', onclick: enviar }, 'Enviar enlace')];
  } else { // confirmar
    titulo = 'Revisa tu correo'; sub = `Hemos enviado un mensaje a ${f.correo.trim()}. Pulsa el enlace para confirmar tu cuenta y después vuelve aquí.`;
    atras = () => { S.auth = 'crear'; S.authMsg = ''; render(); };
    enviar = () => { S.auth = 'entrar'; S.authMsg = ''; render(); };
    cuerpo = [h('button', { class: 'btn big', id: 'auth-enviar', onclick: enviar }, 'Ya lo he confirmado, entrar'),
      h('button', { class: 'btn plain big', id: 'auth-reenviar', onclick: () => run(async () => { await Nube.reenviar(f.correo.trim()); info.textContent = 'Te lo hemos vuelto a enviar.'; }) }, 'Reenviar el correo')];
  }
  return h('div', { class: 'gate auth' }, h('button', { class: 'back', id: 'auth-atras', onclick: atras }, '‹ Atrás'),
    h('div', { class: 'gate-card' }, h('div', { class: 'gate-logo' }, logo(64)), h('h1', { class: 'auth-title' }, titulo), h('p', { class: 'gate-sub', style: 'margin:2px 0 18px;white-space:normal' }, sub),
      h('div', { class: 'gate-actions' }, cuerpo, info, err), pie ? h('p', { class: 'auth-pie' }, pie) : null));
}
/* Copias automáticas de la cuenta: una por día (cómo estaba todo antes del primer cambio de ese día). */
export async function abrirCopias() {
  const lista = h('div', { class: 'group', id: 'copias-lista' }, h('p', { class: 'mute small', style: 'padding:14px' }, 'Buscando copias…')), sh = sheet({ title: 'Copias automáticas', cancel: 'Cerrar', body: [lista, h('p', { class: 'mute small' }, 'Cada copia es como estaba todo al empezar ese día. Al recuperar una se sustituye lo actual.')] });
  try {
    const cs = await Nube.copias();
    lista.replaceChildren(...(cs.length ? cs.map((c) => tapRow(L.parseISO(c.dia).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }), null, () => confirmSheet('¿Recuperar esta copia?', 'Se sustituirán tu plan y tus registros actuales por los de ese día.', 'Recuperar', async () => {
      try { const raw = await Nube.copia(c.dia); if (!raw || !raw.menu) return toast('Esa copia no se puede leer.'); setData(normalize(raw)); data.perfil.listo = true; commit(); sh.close(); toast('Copia recuperada.'); } catch (e) { toast(e.message || 'No se pudo recuperar la copia.'); } })))
      : [h('p', { class: 'mute small', id: 'copias-vacio', style: 'padding:14px' }, 'Todavía no hay copias. La primera se crea la próxima vez que cambies algo.')]));
  } catch (e) { lista.replaceChildren(h('p', { class: 'mute small', style: 'padding:14px' }, e.offline ? 'No hay conexión con internet.' : 'No se pudieron cargar las copias.')); }
}
export function conflictoSheet({ remoto, partes }) {
  if (S.conflicto) return; S.conflicto = true;
  const fecha = new Date(remoto.actualizado).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' });
  const elegir = async (c) => { S.conflicto = false; sh.close(); await Sync.resolver(c, remoto); toast(c === 'nube' ? 'Se ha cargado lo guardado en tu cuenta.' : 'Se ha guardado lo de este ordenador en tu cuenta.'); };
  const sh = sheet({ title: 'Tienes datos en dos sitios', dismissible: false, body: [
    partes && partes.length ? h('p', { class: 'mute', id: 'conflicto-partes' }, `Has cambiado lo mismo en dos dispositivos: ${partes.slice(0, 4).map((x) => (/^Día (\d{4}-\d\d-\d\d)$/.test(x) ? 'el ' + L.fechaCorta(L.parseISO(x.slice(4))) : x)).join(', ')}${partes.length > 4 ? ` y ${partes.length - 4} más` : ''}. Elige qué versión conservar de eso; todo lo demás se junta solo.`)
      : h('p', { class: 'mute' }, `Tu cuenta ya tiene un plan guardado (${fecha}) y este ordenador también tiene datos distintos. Elige cuál conservar. El otro se sustituirá.`),
    h('button', { class: 'btn wide', onclick: () => elegir('nube') }, 'Usar los de mi cuenta'),
    h('button', { class: 'btn sec wide', onclick: () => elegir('local') }, 'Usar los de este ordenador')] });
}
