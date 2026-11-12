import { normalize } from './template.js';
import { store } from './store.js';
import { buscarActualizacion } from './update.js';
import * as Nube from './cloud.js';
import * as Sync from './sync.js';
import { h, icon, toast, sheets } from './ui.js';
import { data, S, root, setData } from './core.js';
import { viewCompra, viewSemana, viewEntreno } from './vistas.js';
import { viewHoy } from './hoy.js';
import { viewAjustes } from './ajustes.js';
import { viewAuth, mostrarInicio, viewInicio, bannerUpdate, conflictoSheet, textoEstado, trasEntrar, mensajeVolver } from './cuenta.js';
import { bienvenida } from './editores.js';

window.addEventListener('beforeunload', () => store.save(data));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheets.length) { const top = sheets[sheets.length - 1]; if (top.dismissible !== false) { top.close(); return; } } if (e.key === 'Escape' && !S.auth && !sheets.length && S.tab === 'ajustes' && S.aj) { S.aj = null; S.animar = true; render(); return; } if (e.key === 'Escape' && S.auth && !sheets.length) { const a = document.getElementById('auth-atras'); if (a) a.click(); return; } if (e.key === 'Escape' && sheets.length && sheets[sheets.length - 1].el.querySelector('header .btn.plain')) sheets[sheets.length - 1].close(); });
/* ---------- estructura ---------- */
const TABS = [['compra', 'Compra', viewCompra], ['semana', 'Menú', viewSemana], ['hoy', 'Hoy', viewHoy], ['entreno', 'Entreno', viewEntreno], ['ajustes', 'Ajustes', viewAjustes]];
export function go(tab) { if (tab === 'ajustes') S.aj = null; S.tab = tab; S.animar = true; render(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; }
function chipUsuario() {
  const u = Nube.usuario(), nombre = data.perfil.nombre || (u ? u.email.split('@')[0] : 'Invitado');
  return h('button', { class: 'chip', onclick: () => go('ajustes'), 'aria-label': 'Tu cuenta' },
    h('span', { class: 'avatar', 'aria-hidden': 'true' }, nombre.trim().charAt(0).toUpperCase() || '?'),
    h('span', { class: 'chip-txt' }, h('b', {}, nombre), h('small', {}, u ? u.email : 'Solo en este ordenador')));
}
let appEl = null, navEl = null, mainEl = null;   // la barra y el contenedor se crean una sola vez y se reutilizan: así la barra no parpadea al cambiar de pestaña
function construirApp() {
  navEl = h('nav', { class: 'side', 'aria-label': 'Secciones' }, h('div', { class: 'brand' }, 'Rutina'),
    TABS.map(([id, nombre]) => [id === 'ajustes' ? h('div', { class: 'spacer' }) : null, h('button', { class: 'nav' + (id === 'hoy' ? ' principal' : ''), 'data-tab': id, onclick: () => go(id) }, h('span', { class: 'ico' }, icon(id)), h('span', { class: 'nl' }, nombre))]),
    h('div', { class: 'chip-slot' }));
  mainEl = h('main', { class: 'main' }); appEl = h('div', { class: 'app' }, navEl, mainEl);
}
export function render() {
  document.body.classList.toggle('mac', store.platform() === 'darwin');
  if (S.auth) { root.replaceChildren(viewAuth()); return; }
  if (mostrarInicio()) { root.replaceChildren(viewInicio()); return; }
  const view = TABS.find((t) => t[0] === S.tab)[2];
  if (!appEl || appEl.parentNode !== root) { construirApp(); root.replaceChildren(appEl); }
  for (const b of navEl.querySelectorAll('.nav')) { if (b.dataset.tab === S.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  navEl.querySelector('.chip-slot').replaceChildren(...(Nube.nubeActiva() ? [chipUsuario()] : []));
  const top = mainEl.scrollTop, animar = S.animar; S.animar = false;
  mainEl.className = 'main' + (animar ? ' enter' : '');
  mainEl.replaceChildren(...[bannerUpdate(), view()].filter(Boolean));
  mainEl.scrollTop = top;
}
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || sheets.length || S.auth || mostrarInicio()) return;
  const t = TABS[+e.key - 1]; if (t) { e.preventDefault(); go(t[0]); }
});
/* ---------- arranque ---------- */
(async () => {
  const raw = await store.load();
  setData(normalize(raw));
  if (Nube.nubeActiva()) { await Nube.cargarSesion(); try { if (await Nube.completarGoogleWeb()) S.vuelveDeGoogle = true; } catch (e) { S.errorInicio = e.message; } }
  if (raw && raw.menu && !raw.perfil) data.perfil.listo = true;
  if (window.rutina && window.rutina.version) window.rutina.version().then((v) => { S.version = v; });
  render();
  if (!data.perfil.listo && !mostrarInicio()) bienvenida();
  if (Nube.nubeActiva()) {
    Sync.init({ getData: () => data, setData: (d) => { setData(d); if (S.bienvenida) { S.bienvenida.close(); S.bienvenida = null; } }, guardar: () => store.save(data), render, onConflicto: conflictoSheet,
      onEstado: (e) => { S.nube = { ...(S.nube || {}), ...e }; const el = document.getElementById('estado-nube'); if (el) el.textContent = textoEstado(); },
      onSesionCaducada: () => { S.nube = null; render(); toast('Tu sesión ha caducado. Vuelve a entrar en Ajustes.'); } });
    if (S.errorInicio) toast(S.errorInicio);
    if (S.vuelveDeGoogle) { await trasEntrar(); if (window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) mensajeVolver(); } else if (Nube.haySesion()) Sync.sincronizar();
    // Web instalada: si la sesión se inicia en otra ventana (la de Google en el iPhone), esta pantalla la recoge sola
    let recogiendo = false;
    const recogerSesion = async () => { if (recogiendo) return; recogiendo = true; try { if (await Nube.sesionNuevaEnAlmacen()) await trasEntrar(); } finally { recogiendo = false; } };
    window.addEventListener('storage', (e) => { if (e.key === Nube.claveSesion()) recogerSesion(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recogerSesion(); });
    window.addEventListener('pageshow', recogerSesion);
    setInterval(() => { if (!Nube.haySesion()) recogerSesion(); }, 1500);
    let ultimoFoco = 0;
    window.addEventListener('focus', () => { if (Date.now() - ultimoFoco > 30000) { ultimoFoco = Date.now(); Sync.sincronizar(); } });
    setInterval(Sync.sincronizar, 5 * 60 * 1000);
  }
  const comprobar = async () => { const u = await buscarActualizacion(); if (u && (!S.update || S.update.version !== u.version)) { S.update = u; S.updateOculto = false; render(); } };
  if (window.rutina && window.rutina.autoUpdate) {
    S.autoUpdate = await window.rutina.autoUpdate();
    window.rutina.onUpdate((e) => { S.upd = { ...(S.upd || {}), ...e }; render(); });
  }
  comprobar(); setInterval(comprobar, 6 * 3600 * 1000);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.instalarEvento = e; if (S.tab === 'hoy') render(); });
  if ('serviceWorker' in navigator && !window.rutina && /^https?:$/.test(location.protocol)) {   // modo sin conexión (web y móvil)
    const teniaControl = !!navigator.serviceWorker.controller; let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (teniaControl && !recargando) { recargando = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const nueva = (w) => { if (w && navigator.serviceWorker.controller) { S.swNueva = w; render(); } };
      if (reg.waiting) nueva(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') nueva(w); }); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  }
  setInterval(() => { if (S.tab === 'hoy' && !document.hidden && !sheets.length && !/^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement || {}).tagName)) render(); }, 60000);
})();
