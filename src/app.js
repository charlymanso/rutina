import * as L from './logic.js';
import { makeTemplate, emptyData, normalize } from './template.js';
import { store } from './store.js';
import { BASE, buscarLocal, normalizar } from './alimentos.js';
import { buscarOnline, porCodigo, esCodigoDeBarras } from './off.js';
import { calcularObjetivo, ACTIVIDADES, METAS, SEXOS } from './objetivo.js';
import { generarSemana, DIETAS, EXCLUSIONES } from './recetas.js';
import { buscarActualizacion } from './update.js';
import * as Nube from './cloud.js';
import * as Sync from './sync.js';

/* ---------- utilidades de DOM ---------- */
function h(tag, props, ...kids) {
  const el = document.createElement(tag); let value;
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') value = v;
    else if (k === 'checked') el.checked = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  if (value !== undefined) el.value = value;
  return el;
}
const NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  hoy: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4' }]],
  semana: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 3 }], ['path', { d: 'M3 10h18M8 3v4M16 3v4' }]],
  compra: [['path', { d: 'M3 4h2l2.4 11h10.2L20 8H6.2' }], ['circle', { cx: 9, cy: 19.5, r: 1.3 }], ['circle', { cx: 17, cy: 19.5, r: 1.3 }]],
  entreno: [['path', { d: 'M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11' }]],
  ajustes: [['path', { d: 'M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0' }], ['circle', { cx: 15, cy: 6, r: 2.2 }], ['circle', { cx: 9, cy: 12, r: 2.2 }], ['circle', { cx: 17, cy: 18, r: 2.2 }]],
  check: [['path', { d: 'M3 8.5l3.2 3.2L13 4.8' }]],
  cuenta: [['circle', { cx: 12, cy: 8, r: 4 }], ['path', { d: 'M4.5 20c0-3.8 3.4-6 7.5-6s7.5 2.2 7.5 6' }]],
  perfil: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 3 }], ['circle', { cx: 9, cy: 11, r: 2 }], ['path', { d: 'M6.5 16c.4-1.4 1.4-2 2.5-2s2.1.6 2.5 2M14 10h4M14 14h3' }]],
  objetivos: [['circle', { cx: 12, cy: 12, r: 9 }], ['circle', { cx: 12, cy: 12, r: 5 }], ['circle', { cx: 12, cy: 12, r: 1.3 }]],
  ingredientes: [['path', { d: 'M4.5 11h15l-1.6 8a2 2 0 0 1-2 1.6H8.1a2 2 0 0 1-2-1.6L4.5 11z' }], ['path', { d: 'M8 11c0-3 1.6-5 4-5s4 2 4 5' }]],
  datos: [['ellipse', { cx: 12, cy: 6, rx: 7, ry: 3 }], ['path', { d: 'M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6' }]],
  barcode: [['path', { d: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 9v6M11 9v6M14 9v6M17 9v6' }]],
  hogar: [['circle', { cx: 9, cy: 8, r: 3.2 }], ['path', { d: 'M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5' }], ['circle', { cx: 17, cy: 9, r: 2.5 }], ['path', { d: 'M16 14.2c2.6-.3 4.5 1.3 5 4.3' }]],
  platos: [['path', { d: 'M6 3v6a2 2 0 0 0 4 0V3M8 3v18M17 21V3c-2 1-3.5 3.5-3.5 7 0 1.5 1 2.5 3.5 2.5' }]],
  acerca: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 11v5.5' }], ['circle', { cx: 12, cy: 7.8, r: .7 }]],
};
function icon(name) {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', name === 'check' ? '0 0 16 16' : '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  for (const [t, a] of ICONS[name]) { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); s.append(e); }
  return s;
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v, def = 0) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : def; };

/* ---------- estado ---------- */
let data = emptyData();
const S = { tab: 'hoy', semSel: 0, compSel: 2, update: null, updateOculto: false, upd: null, autoUpdate: false, saltarInicio: false, animar: false, version: '', aj: null, ajBuscar: '', auth: null, authMsg: '', authForm: { correo: '', clave: '', clave2: '' } };
const root = document.getElementById('root');
let saveTimer;
function commit() {
  data.meta = data.meta || {}; data.meta.sucio = true; data.meta.modificado = Date.now();
  clearTimeout(saveTimer); saveTimer = setTimeout(() => store.save(data), 200); render(); Sync.programar();
}
function guardarLocal() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.save(data), 200); render(); } // cambios que no son del usuario (p. ej. el tiempo): no se sincronizan
window.addEventListener('beforeunload', () => store.save(data));

function toast(msg, deshacer) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg, deshacer ? h('button', { class: 'toast-undo', type: 'button', onclick: () => { t.remove(); deshacer(); } }, 'Deshacer') : null);
  document.body.append(t); setTimeout(() => t.remove(), deshacer ? 6000 : 3200);
}
// Quita un elemento de una lista y ofrece deshacerlo.
function sacar(lista, i, nombre, despues) {
  const [x] = lista.splice(i, 1); despues();
  toast(`“${nombre}” quitado.`, () => { lista.splice(Math.min(i, lista.length), 0, x); despues(); });
}

/* Deslizar hacia la izquierda (móvil) para descubrir "Borrar". Con ratón se sigue usando la × de cada fila. */
let swipeAbierto = null;
function deslizable(contenido, onBorrar, etiqueta = 'Borrar', clase = '') {
  const ANCHO = 88; let x0 = null, y0 = null, dx = 0, mov = false, abierto = false, suprimir = false;
  const del = h('button', { type: 'button', class: 'swipe-del', tabindex: '-1', 'aria-hidden': 'true', onclick: () => onBorrar() }, etiqueta), dentro = h('div', { class: 'swipe-in' }, contenido), w = h('div', { class: 'swipe' + (clase ? ' ' + clase : '') }, del, dentro);
  const poner = (v, anim) => { if (v) w.classList.add('abierto'); else setTimeout(() => { if (!dentro.style.transform) w.classList.remove('abierto'); }, 240); dentro.style.transition = anim ? 'transform .2s ease' : 'none'; dentro.style.transform = v ? `translateX(${v}px)` : ''; };
  const cerrar = () => { abierto = false; poner(0, true); if (swipeAbierto === api) swipeAbierto = null; };
  const api = { cerrar };
  dentro.addEventListener('touchstart', (e) => { if (swipeAbierto && swipeAbierto !== api) swipeAbierto.cerrar(); const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; mov = false; }, { passive: true });
  dentro.addEventListener('touchmove', (e) => {
    if (x0 == null) return; const t = e.touches[0], ax = t.clientX - x0, ay = t.clientY - y0;
    if (!mov) { if (Math.abs(ay) > Math.abs(ax) && Math.abs(ay) > 6) { x0 = null; return; } if (Math.abs(ax) < 8) return; mov = true; }
    dx = Math.max(-ANCHO * 2.2, Math.min(0, (abierto ? -ANCHO : 0) + ax)); poner(dx, false);
  }, { passive: true });
  dentro.addEventListener('touchend', () => {
    if (x0 == null) return; x0 = null; if (!mov) return; suprimir = true; setTimeout(() => { suprimir = false; }, 350);
    if (dx < -ANCHO * 1.6) { poner(-ANCHO, true); abierto = true; swipeAbierto = api; setTimeout(onBorrar, 120); return; }   // deslizar hasta el final borra
    abierto = dx < -ANCHO / 2; poner(abierto ? -ANCHO : 0, true); swipeAbierto = abierto ? api : null;
  });
  dentro.addEventListener('touchcancel', () => { x0 = null; if (mov) cerrar(); });
  dentro.addEventListener('click', (e) => { if (suprimir) { e.stopPropagation(); e.preventDefault(); } else if (abierto) { e.stopPropagation(); e.preventDefault(); cerrar(); } }, true);
  w.deslizar = (v) => { abierto = v < 0; poner(v, true); };   // para pruebas
  return w;
}

/* ---------- hojas modales ---------- */
const sheets = [];
function sheet({ title, body, save = 'Guardar', onSave, extra, cancel = 'Cancelar', dismissible = true, clase = '' }) {
  const err = h('div', { class: 'err', role: 'alert' });
  const api = { close() { veil.remove(); const i = sheets.indexOf(api); if (i >= 0) sheets.splice(i, 1); } };
  const doSave = () => { const r = onSave && onSave(); if (typeof r === 'string') { err.textContent = r; return; } if (r !== false) api.close(); };
  const veil = h('div', { class: 'veil', onmousedown: (e) => { if (e.target === veil && dismissible) api.close(); } },
    h('div', { class: 'sheet' + (clase ? ' ' + clase : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', {}, dismissible ? h('button', { class: 'btn plain', onclick: api.close }, cancel) : h('span'), h('h3', {}, title), onSave ? h('button', { class: 'btn', onclick: doSave }, save) : h('span')),
      h('div', { class: 'body' }, body, err),
      extra ? h('footer', {}, extra) : null));
  api.el = veil; api.err = err; api.dismissible = dismissible; sheets.push(api); document.body.append(veil);
  const first = veil.querySelector('input[type=text]'); if (first) first.focus();
  return api;
}
function confirmSheet(title, msg, okLabel, onOk) {
  const s = sheet({ title, body: h('p', { class: 'mute' }, msg), save: okLabel, onSave: () => { onOk(); } });
  return s;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheets.length) { const top = sheets[sheets.length - 1]; if (top.dismissible !== false) { top.close(); return; } } if (e.key === 'Escape' && !S.auth && !sheets.length && S.tab === 'ajustes' && S.aj) { S.aj = null; S.animar = true; render(); return; } if (e.key === 'Escape' && S.auth && !sheets.length) { const a = document.getElementById('auth-atras'); if (a) a.click(); return; } if (e.key === 'Escape' && sheets.length && sheets[sheets.length - 1].el.querySelector('header .btn.plain')) sheets[sheets.length - 1].close(); });

/* ---------- campos reutilizables ---------- */
const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);
const swt = (on, onclick, label) => h('button', { class: 'switch', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label, onclick });
const seg = (opts, current, onpick) => h('div', { class: 'seg', role: 'group' }, opts.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(current === v), onclick: () => onpick(v) }, t)));
const rowOf = (label, control, sub) => h('div', { class: 'row' }, h('div', { class: 'grow' }, label, sub ? h('div', { class: 'sub' }, sub) : null), control);
const numField = (value, onchange, w = '6rem') => h('input', { type: 'number', min: 0, step: 'any', value: String(value), style: `width:${w};text-align:right`, onchange: (e) => onchange(Math.max(0, num(e.target.value))) });
const itemsText = (items) => (items || []).map((it) => L.linea(data, it)).join(' · ');
const ingOptions = () => Object.entries(data.ingredientes).sort((a, b) => a[1].n.localeCompare(b[1].n, 'es'));
const usoIngrediente = (id) => {
  let n = 0;
  data.menu.semanas.forEach((w) => w.forEach((d) => ['comida', 'cena', ...L.FIJAS].forEach((m) => { if (d[m] && (d[m].items || []).some((i) => i[0] === id)) n++; })));
  Object.values(data.menu.fijos).forEach((f) => { if ((f.items || []).some((i) => i[0] === id)) n++; });
  return n;
};

const r1 = (n) => Math.round(n * 10) / 10;
const f1 = (n) => r1(n).toLocaleString('es-ES', { maximumFractionDigits: 1 });
const macroTxt = (t) => `${L.miles(t.k)} kcal · P ${f1(t.p)} g` + (t.completo ? ` · C ${f1(t.c)} g · G ${f1(t.f)} g` : '');
const macroPor100 = (g) => `${g.k} kcal · P ${g.p}` + (g.c != null && g.f != null ? ` · C ${g.c} · G ${g.f}` : '') + (g.u === 'ud' ? ' · por unidad' : ` · por 100 ${g.u}`);
const cantidadPorDefecto = (g) => g.por || (g.u === 'ud' ? 1 : 100);

/* Buscador de alimentos: tus ingredientes, la base incluida y (en la app de escritorio) productos de supermercado. */
function buscarAlimento({ titulo = 'Añadir alimento', onPick }) {
  const q = h('input', { type: 'text', id: 'buscar-alimento', placeholder: 'Busca un alimento o escribe un código', autocomplete: 'off' });
  const lista = h('div', { class: 'stack', style: 'gap:16px' });
  let timer = null, seq = 0, online = { estado: 'idle', items: [] };
  const elegir = (a) => {
    let id = a.id;
    if (!id) { const base = L.slug(a.n) || 'alimento'; id = base; let c = 2; while (data.ingredientes[id]) id = `${base}-${c++}`; const { origen, ...ing } = a; data.ingredientes[id] = ing; }
    data.ingredientes[id].uso = Date.now(); commit();
    sh.close(); onPick(id, cantidadPorDefecto(data.ingredientes[id]));
  };
  const fila = (a) => h('button', { class: 'row tap res', type: 'button', onclick: () => elegir(a) }, h('div', { class: 'grow' }, a.n, h('div', { class: 'sub num' }, macroPor100(a))), h('span', { class: 'chev' }, '+'));
  const seccion = (titulo, ...hijos) => h('section', { class: 'stack', style: 'gap:6px' }, h('div', { class: 'label', style: 'padding-left:4px' }, titulo), ...hijos);
  function pintar() {
    const t = q.value.trim(), mios = ingOptions().map(([id, g]) => ({ ...g, id }));
    const porUso = (x, y) => (y.uso || 0) - (x.uso || 0), mis = (t ? buscarLocal(t, mios, 200).sort(porUso) : mios.slice().sort(porUso)).slice(0, 8), nombresMios = new Set(mios.map((m) => normalizar(m.n)));
    const base = t ? buscarLocal(t, BASE, 12).filter((a) => !nombresMios.has(normalizar(a.n))) : [];
    const out = [];
    if (mis.length) out.push(seccion(t ? 'Usados antes' : 'Usados recientemente', h('div', { class: 'group' }, mis.map(fila))));
    if (base.length) out.push(seccion('Base de alimentos', h('div', { class: 'group' }, base.map(fila))));
    if (t.length >= 3) {
      let cuerpo;
      if (online.estado === 'cargando') cuerpo = h('p', { class: 'mute small', style: 'padding-left:4px' }, 'Buscando productos…');
      else if (online.estado === 'noapp') cuerpo = h('p', { class: 'mute small', style: 'padding-left:4px' }, 'La búsqueda de productos de marca necesita conexión. Puedes usar la base incluida o escribir el código de barras.');
      else if (online.estado === 'error') cuerpo = h('p', { class: 'mute small', style: 'padding-left:4px' }, 'No se pudo consultar la base online. Revisa tu conexión; puedes usar tus ingredientes y la base incluida.');
      else if (online.estado === 'ok') cuerpo = online.items.filter((a) => !a.code || !mios.some((m) => m.code === a.code)).length ? h('div', { class: 'group' }, online.items.filter((a) => !a.code || !mios.some((m) => m.code === a.code)).map(fila)) : h('p', { class: 'mute small', style: 'padding-left:4px' }, esCodigoDeBarras(t) ? 'No hay ningún producto con ese código.' : 'Sin resultados de productos.');
      if (cuerpo) out.push(seccion('Productos de supermercado', cuerpo, h('p', { class: 'mute', style: 'font-size:12px;padding-left:4px' }, 'Datos de Open Food Facts, aportados por usuarios. Pueden contener errores.')));
    }
    if (!out.length) out.push(h('p', { class: 'mute small', style: 'text-align:center;padding:18px 0' }, t ? 'No hay coincidencias. Prueba con otra palabra o crea el alimento a mano.' : 'Escribe para buscar.'));
    lista.replaceChildren(...out);
  }
  async function consultar() {
    const t = q.value.trim(), mi = ++seq; if (t.length < 3) { online = { estado: 'idle', items: [] }; return pintar(); }
    online = { estado: 'cargando', items: [] }; pintar();
    try {
      const r = esCodigoDeBarras(t) ? [await porCodigo(t)].filter(Boolean) : await buscarOnline(t);
      if (mi !== seq) return; online = r === null ? { estado: 'noapp', items: [] } : { estado: 'ok', items: r };
    } catch { if (mi !== seq) return; online = { estado: 'error', items: [] }; }
    pintar();
  }
  q.addEventListener('input', () => { pintar(); clearTimeout(timer); timer = setTimeout(consultar, 450); });
  const escanear = () => {
    let parar = null, abierto = true; const video = h('video', { class: 'scan-video', autoplay: '', playsinline: '', muted: '' }), msg = h('p', { class: 'mute small', id: 'scan-msg', style: 'text-align:center' }, 'Apunta al código de barras del producto.');
    const cerrar = () => { abierto = false; if (parar) parar(); clearInterval(vig); };
    const sc = sheet({ title: 'Escanear código', body: [h('div', { class: 'scan' }, video, h('div', { class: 'scan-guia' })), msg] });
    const vig = setInterval(() => { if (!sc.el.isConnected) cerrar(); }, 250);
    import('./scanner.js').then(async (M) => {
      if (!M.hayCamara()) { msg.textContent = 'Este dispositivo no permite usar la cámara aquí. Escribe el código a mano.'; return; }
      try { const p = await M.iniciar(video, (cod) => { sc.close(); q.value = cod; pintar(); consultar(); }); if (abierto) parar = p; else p(); }
      catch (e) { msg.textContent = e && e.name === 'NotAllowedError' ? 'No hay permiso para usar la cámara. Actívalo en los ajustes del dispositivo o escribe el código a mano.' : 'No se pudo abrir la cámara. Escribe el código a mano.'; }
    });
  };
  const sh = sheet({ title: titulo, body: [h('div', { class: 'buscar-fila' }, q, h('button', { type: 'button', class: 'btn sec', id: 'escanear', 'aria-label': 'Escanear código de barras', onclick: escanear }, icon('barcode'))), lista], extra: h('button', { class: 'btn plain', id: 'crear-alimento', onclick: () => editIngrediente(null, (id) => { sh.close(); onPick(id, cantidadPorDefecto(data.ingredientes[id])); }, { n: q.value.trim() }) }, 'Crear uno nuevo…') });
  pintar();
}

/* Editor de lista de ingredientes con cantidades (para platos y comidas fijas). */
function itemsEditor(items, onChange = () => {}) {
  const box = h('div', { class: 'stack', style: 'gap:10px' });
  function draw() {
    box.replaceChildren();
    items.forEach((it, i) => {
      const sub = h('div', { class: 'sub-line num' }, macroTxt(L.sumaItems(data, [it])));
      const sel = h('span', { class: 'nm' }, L.ing(data, it[0]).n);
      box.append(deslizable(h('div', { class: 'itemblock' }, h('div', { class: 'itemrow' }, sel,
        h('input', { type: 'number', min: 0, step: 'any', value: String(it[1]), 'aria-label': 'Cantidad', oninput: (e) => { it[1] = num(e.target.value); sub.textContent = macroTxt(L.sumaItems(data, [it])); onChange(); } }),
        h('span', { class: 'u' }, L.ing(data, it[0]).u), h('button', { class: 'x', 'aria-label': 'Quitar', onclick: () => sacar(items, i, L.ing(data, it[0]).n, () => { draw(); onChange(); }) }, '×')), sub), () => sacar(items, i, L.ing(data, it[0]).n, () => { draw(); onChange(); })));
    });
    box.append(h('button', { class: 'btn sec', id: 'anadir-alimento', style: 'align-self:flex-start', onclick: () => buscarAlimento({ onPick: (id, q) => { items.push([id, q]); draw(); onChange(); } }) }, '+ Añadir alimento'));
  }
  draw(); box.redraw = draw; return box;
}


/* ---------- calculadora de objetivo ---------- */
function abrirObjetivo({ onApply = null, guardar = true } = {}) {
  const c0 = data.perfil.cuerpo || {}, entrenos = L.diasEntrenoSemana(data);
  const st = { sexo: c0.sexo || 'h', edad: c0.edad || '', peso: c0.peso || '', altura: c0.altura || '', actividad: c0.actividad || 1.55, meta: c0.meta || 'man' };
  const res = h('div', { class: 'stack', id: 'obj-resultado', style: 'gap:12px' });
  const num0 = (id, ph, clave) => h('input', { id, type: 'number', inputmode: 'decimal', step: 'any', placeholder: ph, value: st[clave] === '' ? '' : String(st[clave]), oninput: (e) => { st[clave] = e.target.value; pintar(); } });
  const sexo = h('div', { class: 'seg', role: 'group', 'aria-label': 'Sexo' });
  const pintarSexo = () => sexo.replaceChildren(...SEXOS.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(st.sexo === v), onclick: () => { st.sexo = v; pintarSexo(); pintar(); } }, t)));
  const actividad = h('select', { id: 'obj-actividad', value: String(st.actividad), onchange: (e) => { st.actividad = +e.target.value; pintar(); } }, ACTIVIDADES.map(([v, t, d]) => h('option', { value: String(v) }, `${t} · ${d}`)));
  const meta = h('select', { id: 'obj-meta', value: st.meta, onchange: (e) => { st.meta = e.target.value; pintar(); } }, METAS.map(([v, t, d]) => h('option', { value: v }, `${t} · ${d}`)));
  const fila = (a, b) => h('div', { class: 'row', style: 'min-height:40px;padding:6px 0' }, h('div', { class: 'grow mute' }, a), h('b', { class: 'num' }, b));
  let ultimo = null;
  function pintar() {
    const r = calcularObjetivo({ ...st, entrenos }); ultimo = r;
    if (r.error) { res.replaceChildren(h('p', { class: 'mute small', id: 'obj-ayuda' }, st.edad === '' || st.peso === '' || st.altura === '' ? 'Rellena tus datos y verás aquí tu objetivo.' : r.error)); return; }
    const pk = r.prot * 4, ck = r.carb * 4, fk = r.grasa * 9, tot = pk + ck + fk, pc = (x) => Math.round((x / tot) * 100);
    res.replaceChildren(
      h('div', { class: 'card', style: 'gap:6px;background:var(--accent-soft);box-shadow:none;text-align:center' }, h('div', { class: 'label' }, 'Tu objetivo diario'), h('div', { id: 'obj-kcal', class: 'num', style: 'font-size:40px;font-weight:700;letter-spacing:-.03em' }, `${L.miles(r.kcal)} kcal`),
        entrenos > 0 && entrenos < 7 ? h('div', { class: 'mute small num', id: 'obj-dias' }, `${L.miles(r.gym)} kcal los días de entreno · ${L.miles(r.sin)} kcal los de descanso`) : null),
      h('div', { class: 'row', style: 'gap:8px;padding:0' }, ...[['Proteína', r.prot, `${(r.prot / st.peso).toFixed(1).replace('.', ',')} g/kg`], ['Hidratos', r.carb, `${pc(ck)} %`], ['Grasa', r.grasa, `${pc(fk)} %`]].map(([n, g, x]) => h('div', { class: 'grow metric', style: 'text-align:center' }, h('span', { class: 'label' }, n), h('b', { class: 'num', style: 'font-size:22px' }, `${g} g`), h('span', { class: 'mute small num' }, x)))),
      h('div', { class: 'stackbar', role: 'img', 'aria-label': `Proteína ${pc(pk)} %, hidratos ${pc(ck)} %, grasa ${pc(fk)} %` }, h('i', { class: 'sp', style: `width:${pc(pk)}%` }), h('i', { class: 'sc', style: `width:${pc(ck)}%` }), h('i', { class: 'sf', style: `width:${pc(fk)}%` })),
      h('div', { class: 'group', style: 'box-shadow:none;background:var(--bg);padding:2px 14px' }, fila('Metabolismo basal', `${L.miles(r.bmr)} kcal`), fila('Mantenimiento (con tu actividad)', `${L.miles(r.tdee)} kcal`)),
      ...r.avisos.map((a) => h('p', { class: 'small', style: 'color:var(--orange)', role: 'alert' }, '⚠ ' + a)),
      h('p', { class: 'mute', style: 'font-size:12px' }, 'Es una estimación orientativa (fórmula de Mifflin-St Jeor), no un consejo médico. Si estás embarazada, das el pecho o tienes alguna enfermedad, consulta con un profesional.'));
  }
  pintarSexo();
  sheet({ title: 'Calcular mi objetivo', save: 'Usar estos objetivos', body: [field('Sexo', sexo), h('div', { class: 'pair' }, field('Edad (años)', num0('obj-edad', '30', 'edad')), field('Altura (cm)', num0('obj-altura', '175', 'altura'))), field('Peso (kg)', num0('obj-peso', '70', 'peso')),
    field('Actividad', actividad), field('Objetivo', meta), entrenos ? h('p', { class: 'mute small' }, `Entrenas ${entrenos} ${entrenos === 1 ? 'día' : 'días'} a la semana: esos días comes algo más y los de descanso algo menos, y la media semanal es tu objetivo.`) : null, res],
    onSave: () => {
      const r = calcularObjetivo({ ...st, entrenos }); if (r.error) return r.error;
      if (guardar) { data.perfil.cuerpo = { ...st }; data.perfil.objetivos = { gym: { kcal: r.gym, prot: r.prot }, sin: { kcal: r.sin, prot: r.prot } }; commit(); toast('Objetivos actualizados.'); }
      if (onApply) onApply(r, { ...st });
    } });
  pintar();
}

/* ---------- recomendar menú ---------- */
function idDeBase(nombre) { // reutiliza tu ingrediente si ya lo tienes; si no, lo crea desde la base
  const n = normalizar(nombre), ya = Object.entries(data.ingredientes).find(([, g]) => normalizar(g.n) === n); if (ya) return ya[0];
  const a = BASE.find((x) => normalizar(x.n) === n), { origen, ...ing } = a; let id = L.slug(a.n), c = 2; const b = id; while (data.ingredientes[id]) id = `${b}-${c++}`; data.ingredientes[id] = ing; return id;
}
function recomendarMenu(lun, semana) {
  const opc = { dieta: 'omnivora', excluir: new Set(), semilla: Math.floor(Math.random() * 1e6) };
  const lista = h('div', { class: 'group', id: 'rec-lista' }), nota = h('p', { class: 'mute small', id: 'rec-nota' });
  const fijos = (i) => L.FIJAS.reduce((a, c) => { const f = L.fijoDia(data, L.addDays(lun, i), c); if (!f) return a; const t = L.sumaItems(data, f.items, c); return { k: a.k + t.k, p: a.p + t.p }; }, { k: 0, p: 0 });
  let prop = null;
  function pintar() {
    const dias = Array.from({ length: 7 }, (_, i) => { const o = L.objetivo(data, L.addDays(lun, i)), fj = fijos(i); return { k: Math.max(600, o.kcal - fj.k), p: Math.max(30, o.prot - fj.p) }; });
    prop = generarSemana({ dias, dieta: opc.dieta, excluir: [...opc.excluir], semilla: opc.semilla });
    if (!prop) { lista.replaceChildren(h('p', { class: 'mute small', style: 'padding:14px' }, 'Con esas opciones no hay recetas suficientes. Prueba a quitar alguna restricción.')); nota.textContent = ''; return; }
    lista.replaceChildren(...prop.map((d, i) => { const o = L.objetivo(data, L.addDays(lun, i)), fj = fijos(i), k = d.k + fj.k, desv = Math.abs(k - o.kcal) / o.kcal;
      return h('div', { class: 'row', style: 'align-items:flex-start;gap:10px' }, h('div', { style: 'width:5.2rem;font-weight:600' }, L.DIAS[i].slice(0, 3)), h('div', { class: 'grow' }, d.comida.t, h('div', { class: 'sub' }, d.cena.t)),
        h('div', { class: 'num small', style: 'text-align:right;white-space:nowrap' }, h('div', { style: desv > 0.1 ? 'color:var(--orange);font-weight:600' : 'font-weight:600' }, `${L.miles(k)} kcal`), h('div', { class: 'mute' }, `P ${L.miles(d.p + fj.p)} g`))); }));
    const media = prop.reduce((a, d, i) => a + d.k + fijos(i).k, 0) / 7, obj = [0, 1, 2, 3, 4, 5, 6].reduce((a, i) => a + L.objetivo(data, L.addDays(lun, i)).kcal, 0) / 7;
    nota.textContent = `Media de la propuesta: ${L.miles(media)} kcal al día (tu objetivo medio: ${L.miles(obj)}).` + (media < obj * 0.92 ? ' Si te quedas corto, añade una merienda o una media mañana en Ajustes.' : '');
  }
  const dieta = h('select', { id: 'rec-dieta', onchange: (e) => { opc.dieta = e.target.value; pintar(); } }, DIETAS.map(([v, t]) => h('option', { value: v }, t)));
  const chips = h('div', { class: 'chips' }, EXCLUSIONES.map(([v, t]) => { const b = h('button', { type: 'button', class: 'chipopt', id: 'rec-ex-' + v, 'aria-pressed': 'false', onclick: () => { opc.excluir.has(v) ? opc.excluir.delete(v) : opc.excluir.add(v); b.setAttribute('aria-pressed', String(opc.excluir.has(v))); pintar(); } }, t); return b; }));
  const sh = sheet({ title: 'Recomendar menú', save: 'Usar menú', body: [
    h('p', { class: 'mute small' }, 'Propongo una comida y una cena para cada día, con cantidades ajustadas a tus objetivos y a lo que ya comes en el desayuno y la media mañana.'),
    field('Tipo de alimentación', dieta), h('div', {}, h('div', { class: 'label', style: 'margin-bottom:6px' }, 'Evitar'), chips), lista, nota,
    h('button', { class: 'btn plain', style: 'align-self:flex-start;padding-left:0', id: 'rec-calc', onclick: () => abrirObjetivo({ onApply: () => pintar() }) }, '¿No sabes cuántas calorías necesitas? Calcúlalas')],
    extra: h('button', { class: 'btn sec', id: 'rec-otra', onclick: () => { opc.semilla = (opc.semilla + 7919) % 1000003; pintar(); } }, 'Otra propuesta'),
    onSave: () => {
      if (!prop) return 'No hay propuesta que aplicar.';
      prop.forEach((d, i) => { for (const m of ['comida', 'cena']) semana[i][m] = { t: d[m].t, items: d[m].items.map(([n, q]) => { const id = idDeBase(n); return [id, L.cantidadTotal(data, id, q, m)]; }) }; });
      commit(); toast('Menú actualizado. Puedes cambiar cualquier plato tocándolo.');
    } });
  pintar();
}

/* ---------- editores ---------- */
function editIngrediente(id, onDone, relleno = {}) {
  const g = id ? clone(data.ingredientes[id]) : { n: '', u: 'g', k: 0, p: 0, s: 'despensa', pl: '', ...relleno };
  const nombre = h('input', { type: 'text', value: g.n, placeholder: 'Ej. Pechuga de pollo' });
  const unidad = h('select', { value: g.u, onchange: () => { for (const [campo, txt] of etiquetas) campo.firstChild.textContent = txt(); pl.hidden = unidad.value !== 'ud'; } }, [['g', 'Gramos (g)'], ['ml', 'Mililitros (ml)'], ['ud', 'Unidades']].map(([v, t]) => h('option', { value: v }, t)));
  const por = () => (unidad.value === 'ud' ? 'por unidad' : `por 100 ${unidad.value}`);
  const num0 = (v) => h('input', { type: 'number', min: 0, step: 'any', value: v == null ? '' : String(v), placeholder: '—' });
  const kcal = num0(g.k), prot = num0(g.p), carb = num0(g.c), grasa = num0(g.f);
  const campos = [field(`Calorías ${por()}`, kcal), field(`Proteína ${por()} (g)`, prot), field(`Hidratos ${por()} (g)`, carb), field(`Grasa ${por()} (g)`, grasa)];
  const etiquetas = [[campos[0], () => `Calorías ${por()}`], [campos[1], () => `Proteína ${por()} (g)`], [campos[2], () => `Hidratos ${por()} (g)`], [campos[3], () => `Grasa ${por()} (g)`]];
  const seccion = h('select', { value: g.s }, L.SECC.map(([v, t]) => h('option', { value: v }, t)));
  const plural = h('input', { type: 'text', value: g.pl || '', placeholder: 'Ej. huevos' });
  const pl = field('Plural (para la lista)', plural); pl.hidden = g.u !== 'ud';
  sheet({ title: id ? 'Editar ingrediente' : 'Nuevo ingrediente',
    body: [field('Nombre', nombre), field('Se mide en', unidad), h('div', { class: 'pair' }, campos[0], campos[1]), h('div', { class: 'pair' }, campos[2], campos[3]),
      h('p', { class: 'mute small' }, 'Hidratos y grasa son opcionales; sin ellos no se calcula el reparto de macros.'), pl, field('Sección del súper', seccion)],
    onSave: () => {
      const n = nombre.value.trim(); if (!n) return 'Escribe un nombre.';
      let nid = id; if (!nid) { const base = L.slug(n) || 'ingrediente'; nid = base; let c = 2; while (data.ingredientes[nid]) nid = `${base}-${c++}`; }
      const opc = (i) => (i.value.trim() === '' ? {} : null);
      data.ingredientes[nid] = { n, u: unidad.value, k: num(kcal.value), p: num(prot.value), ...(carb.value.trim() !== '' ? { c: num(carb.value) } : {}), ...(grasa.value.trim() !== '' ? { f: num(grasa.value) } : {}),
        s: seccion.value, ...(g.por ? { por: g.por } : {}), ...(unidad.value === 'ud' && plural.value.trim() ? { pl: plural.value.trim() } : {}) };
      commit(); onDone && onDone(nid);
    },
    extra: id ? h('button', { class: 'btn danger', onclick: () => {
      const n = usoIngrediente(id); if (n) { toast(`Se usa en ${n} ${n === 1 ? 'plato' : 'platos'}. Quítalo de ahí primero.`); return; }
      confirmSheet('¿Borrar ingrediente?', `Se eliminará “${g.n}”.`, 'Borrar', () => { delete data.ingredientes[id]; commit(); sheets.slice().forEach((s) => s.close()); });
    } }, 'Borrar') : null });
}

const NOMBRE_COMIDA = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
function platosGuardados(m = 'comida') { // platos distintos que ya usas, para reutilizarlos
  const mapa = new Map(), esFija = L.FIJAS.includes(m), claves = esFija ? [m] : ['comida', 'cena'];
  data.platosPropios.forEach((p) => mapa.set(p.t, p));
  if (esFija) { const f = data.menu.fijos[m]; if (f && (f.items || []).length) mapa.set(f.texto, { t: f.texto, items: f.items }); }
  data.menu.semanas.forEach((wk) => wk.forEach((d) => claves.forEach((k) => { const pl = d[k]; if (pl && !pl.libre && pl.items && pl.items.length && !mapa.has(pl.t)) mapa.set(pl.t, pl); })));
  return [...mapa.values()].sort((x, y) => x.t.localeCompare(y.t, 'es'));
}

/* Selector de platos (lista, no desplegable): Gestionar platos arriba, luego los tuyos y los que ya usas en el menú. */
function elegirPlato({ titulo = 'Elegir plato', m = 'comida', actual = '', libre = false, quitar = null, onPick, onLibre }) {
  const gs = platosGuardados(m), nombresPropios = new Set(data.platosPropios.map((x) => x.t)), propios = gs.filter((x) => nombresPropios.has(x.t)), delMenu = gs.filter((x) => !nombresPropios.has(x.t));
  const fila = (txt, sub, fn, id) => h('button', { class: 'row tap res', type: 'button', id, onclick: fn }, h('div', { class: 'grow' }, txt, sub ? h('div', { class: 'sub num' }, sub) : null), h('span', { class: 'chev' }, actual && actual === txt ? '✓' : '›'));
  const plato = (x) => fila(x.t, macroTxt(L.sumaItems(data, x.items, 'comida')), () => { sh.close(); onPick(x); });
  const seccion = (t, rows) => h('section', { class: 'stack', style: 'gap:6px' }, h('div', { class: 'label', style: 'padding-left:4px' }, t), h('div', { class: 'group' }, rows));
  const sh = sheet({ title: titulo, cancel: 'Cerrar', body: [
    h('div', { class: 'group' }, fila('Gestionar platos', 'Crea y edita tus platos', () => { sheets.slice().forEach((x) => x.close()); go('ajustes'); irAj('platos'); }, 'elegir-gestionar')),
    libre || quitar ? h('div', { class: 'group' }, libre ? fila('Comida libre', `Cuenta unas ${L.miles(data.perfil.libre.kcal)} kcal`, () => { sh.close(); onLibre(); }, 'elegir-libre') : null, quitar ? fila(quitar.texto, quitar.sub, () => { sh.close(); quitar.fn(); }, 'elegir-quitar') : null) : null,
    propios.length ? seccion('Mis platos', propios.map(plato)) : null, delMenu.length ? seccion('En tu menú', delMenu.map(plato)) : null,
    !propios.length && !delMenu.length ? h('p', { class: 'mute small', style: 'text-align:center;padding:12px 0' }, 'Aún no tienes platos. Créalos en Gestionar platos.') : null] });
  return sh;
}

/* Con quién comes: personas que comparten algunas de tus comidas, con su ración respecto a la tuya. */
const nombresHogar = () => { const n = L.hogar(data).map((x) => x.n); return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}` : n[0] || ''; };
function editarPersona(x) {
  const w = x ? clone(x) : { id: 'h' + Date.now().toString(36), n: '', f: 0.7, comidas: ['comida', 'cena'] };
  const nom = h('input', { type: 'text', id: 'hogar-nombre', value: w.n, placeholder: 'Ej. Pareja', autocomplete: 'off' }), pct = h('span', { class: 'num', id: 'hogar-pct' }), chips = h('div', { class: 'chips', id: 'hogar-comidas', role: 'group', 'aria-label': 'Comidas que compartís' }), ejemplo = h('p', { class: 'mute small', id: 'hogar-ejemplo' });
  const mover = (d) => { w.f = Math.min(2, Math.max(0.1, Math.round((w.f + d) * 100) / 100)); pintar(); };
  function pintar() {
    pct.textContent = Math.round(w.f * 100) + ' %'; ejemplo.textContent = `Si el plato lleva 340 g en total, tú comes ${Math.round(340 / (1 + w.f))} g y ${w.n.trim() || 'esta persona'} ${Math.round(340 * w.f / (1 + w.f))} g. Por unidades se reparte en piezas enteras.`;
    chips.replaceChildren(...L.COMIDAS_HOGAR.map(([k, t]) => h('button', { type: 'button', class: 'chipopt', id: 'hogar-c-' + k, 'aria-pressed': String(w.comidas.includes(k)), onclick: () => { w.comidas = w.comidas.includes(k) ? w.comidas.filter((y) => y !== k) : [...w.comidas, k]; pintar(); } }, t)));
  }
  nom.addEventListener('input', () => { w.n = nom.value; pintar(); }); pintar();
  sheet({ title: x ? x.n || 'Persona' : 'Añadir persona', save: x ? 'Guardar' : 'Añadir', body: [field('Nombre', nom),
    h('div', { class: 'field' }, h('span', {}, 'Cuánto come, comparado contigo'), h('div', { class: 'stepper' }, h('button', { type: 'button', id: 'hogar-menos', 'aria-label': 'Menos', onclick: () => mover(-0.05) }, '−'), pct, h('button', { type: 'button', id: 'hogar-mas', 'aria-label': 'Más', onclick: () => mover(0.05) }, '+'))),
    ejemplo, h('div', { class: 'field' }, h('span', {}, 'Qué comidas compartís'), chips)],
  onSave: () => {
    const n = nom.value.trim(); if (!n) return 'Escribe un nombre.'; if (!w.comidas.length) return 'Marca al menos una comida que compartáis.';
    const nuevo = { id: w.id, n, f: w.f, comidas: L.COMIDAS_HOGAR.map(([k]) => k).filter((k) => w.comidas.includes(k)) }, lista = (data.perfil.hogar = L.hogar(data)), i = lista.findIndex((y) => y.id === w.id);
    if (i >= 0) lista[i] = nuevo; else lista.push(nuevo); commit();
  } });
}
/* Platos propios: se arman con ingredientes y quedan guardados para usarlos en cualquier comida. */
function borrarPlato(x) {
  confirmSheet('¿Borrar este plato?', `“${x.t}” dejará de salir en la lista. Los días del menú que ya lo usan no cambian.`, 'Borrar', () => { data.platosPropios = data.platosPropios.filter((y) => y.t !== x.t); commit(); sheets.slice().forEach((z) => z.close()); toast('Plato borrado.'); });
}
function crearPlato(onListo, existente = null) {
  const w = existente ? clone(existente) : { t: '', items: [] }, nombre = h('input', { type: 'text', id: 'nuevo-plato-nombre', value: w0(existente), placeholder: 'Ej. Bowl de pollo y arroz' }), total = h('div', { class: 'macros-live num', id: 'nuevo-plato-total', 'aria-live': 'polite' });
  const pintar = () => { total.textContent = L.comensales(data, 'comida').length || L.comensales(data, 'cena').length ? 'Plato completo: ' + macroTxt(L.sumaItems(data, w.items)) + ' · Para ti: ' + macroTxt(L.sumaItems(data, w.items, L.comensales(data, 'comida').length ? 'comida' : 'cena')) : 'Para ti: ' + macroTxt(L.sumaItems(data, w.items)); }, edit = itemsEditor(w.items, pintar); pintar();
  sheet({ title: existente ? 'Editar plato' : 'Nuevo plato', save: existente ? 'Guardar' : 'Guardar plato', body: [field('Nombre del plato', nombre), h('div', { class: 'label' }, (L.hogar(data).length ? 'Cantidades del plato (para todos)' : 'Tus cantidades')), edit, total, h('p', { class: 'mute small' }, 'Quedará guardado para elegirlo en cualquier comida.')],
    onSave: () => {
      const t = nombre.value.trim(); if (!t) return 'Escribe el nombre del plato.';
      const items = w.items.filter((it) => it[1] > 0 && data.ingredientes[it[0]]); if (!items.length) return 'Añade al menos un ingrediente con su cantidad.';
      const antes = existente ? data.platosPropios.findIndex((x) => x.t === existente.t) : -1, otro = data.platosPropios.findIndex((x, k) => x.t === t && k !== antes);
      if (otro >= 0) return 'Ya tienes un plato con ese nombre.';
      const pl = { t, items: clone(items) }; if (antes >= 0) data.platosPropios[antes] = pl; else data.platosPropios.push(pl);
      commit(); onListo && onListo(pl);
    },
    extra: existente ? h('button', { class: 'btn danger', id: 'plato-borrar', onclick: () => borrarPlato(existente) }, 'Borrar plato') : null });
}
const w0 = (e) => (e ? e.t : '');

/* Editor de un plato de cualquier comida del día, con la opción de repetirlo en otros días de la semana. */
function editPlato(semana, i, m) {
  const esFija = L.FIJAS.includes(m), def = esFija ? data.menu.fijos[m] : null, propio = semana[i][m];
  const orig = propio || null, w = clone(propio || (esFija && def ? { t: def.texto, items: def.items || [] } : { t: '', items: [] })); if (!w.items) w.items = [];
  if (w.libre) w.t = '';
  const cuerpo = h('div', { class: 'stack', style: 'gap:14px' });
  const total = h('div', { class: 'macros-live num', id: 'plato-total', 'aria-live': 'polite' });
  const pintarTotal = () => { const mio = L.sumaItems(data, w.items, m), todo = L.sumaItems(data, w.items); total.textContent = 'Para ti: ' + macroTxt(mio) + (L.comensales(data, m).length ? ` · el plato completo suma ${L.miles(todo.k)} kcal` : ''); };
  const edit = itemsEditor(w.items, pintarTotal);
  const nombreEl = h('div', { class: 'plato-fijo', id: 'plato-nombre' }), btnElegir = h('button', { type: 'button', class: 'btn sec', id: 'plato-elegir', onclick: () => elegirPlato({ m, actual: w.t, onPick: (pl) => { w.t = pl.t; w.items.splice(0, w.items.length, ...clone(pl.items)); edit.redraw(); pintarTotal(); draw(); } }) });
  const pintarNombre = () => { nombreEl.textContent = w.t || 'Ningún plato elegido'; nombreEl.classList.toggle('vacio', !w.t); btnElegir.textContent = w.t ? 'Cambiar plato' : 'Elegir plato'; };
  // Repetir en otros días de esta semana
  const rep = new Set([i]), repetir = h('div', { class: 'stack', style: 'gap:8px' });
  function pintarRep() {
    repetir.replaceChildren(h('div', { class: 'label' }, 'Repetir en'),
      h('div', { class: 'chips', id: 'rep-dias', role: 'group', 'aria-label': 'Repetir en estos días' }, L.DIAS.map((nom, j) => h('button', { type: 'button', class: 'chipopt', id: 'rep-dia-' + j, 'aria-pressed': String(rep.has(j)), disabled: j === i, 'aria-label': nom, onclick: () => { rep.has(j) ? rep.delete(j) : rep.add(j); pintarRep(); } }, nom.slice(0, 3)))),
      h('div', { class: 'chips' }, h('button', { type: 'button', class: 'btn plain', id: 'rep-todos', style: 'min-height:0;padding:4px 10px', onclick: () => { L.DIAS.forEach((_, j) => rep.add(j)); pintarRep(); } }, 'Toda la semana'),
        h('button', { type: 'button', class: 'btn plain', id: 'rep-laborables', style: 'min-height:0;padding:4px 10px', onclick: () => { rep.clear(); rep.add(i); [0, 1, 2, 3, 4].forEach((j) => rep.add(j)); pintarRep(); } }, 'Lunes a viernes'),
        h('button', { type: 'button', class: 'btn plain', id: 'rep-solo', style: 'min-height:0;padding:4px 10px', onclick: () => { rep.clear(); rep.add(i); pintarRep(); } }, 'Solo este día')),
      h('p', { class: 'mute small', id: 'rep-nota' }, rep.size > 1 ? `Se pondrá igual en: ${L.diasTexto([...rep].filter((j) => j !== i)).toLowerCase()}. Lo que tuvieran esos días se sustituye.` : `Solo cambia el ${L.DIAS[i].toLowerCase()}.`));
  }
  function draw() {
    pintarNombre(); cuerpo.replaceChildren(...[
      !esFija ? h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, 'Comida libre', h('div', { class: 'sub' }, 'Sin ingredientes: cuenta con tus calorías de comida libre.')), swt(w.libre, () => { w.libre = !w.libre; draw(); }, 'Comida libre')) : null,
      ...(w.libre ? [] : [h('div', { class: 'field' }, h('span', {}, 'Plato'), h('div', { class: 'plato-sel' }, nombreEl, btnElegir)), ...(w.t ? [h('div', { class: 'label' }, (L.hogar(data).length ? 'Cantidades del plato (para todos)' : 'Tus cantidades')), edit, total] : [])]), repetir].filter(Boolean));
  }
  pintarRep(); draw(); pintarTotal();
  sheet({ title: `${L.DIAS[i]} · ${NOMBRE_COMIDA[m]}`, body: cuerpo,
    onSave: () => {
      let plato;
      if (w.libre && !esFija) plato = { t: 'Comida libre', libre: true, items: [] };
      else { const t = w.t.trim(); if (!t) return 'Elige un plato.'; plato = { t, items: w.items.filter((it) => it[1] > 0 && data.ingredientes[it[0]]) }; }
      rep.forEach((j) => { semana[j][m] = clone(plato); }); commit();
      if (rep.size > 1) toast(`Guardado en ${rep.size} días.`);
    },
    extra: esFija ? (orig ? h('button', { class: 'btn danger', id: 'plato-predeterminado', onclick: () => { delete semana[i][m]; commit(); sheets.slice().forEach((x) => x.close()); toast('Vuelve al predeterminado.'); } }, 'Usar el predeterminado') : null)
      : (orig ? h('button', { class: 'btn danger', onclick: () => { semana[i][m] = null; commit(); sheets.slice().forEach((x) => x.close()); } }, 'Quitar plato') : null) });
}

/* Qué comidas haces cada día y a qué hora, y cuántas semanas distintas tiene el menú. Antes estaba en Ajustes. */
function abrirComidasHorarios() {
  const cuerpo = h('div', { class: 'stack', style: 'gap:14px' });
  function draw() {
    const hora = (valor, fn, etiqueta) => h('input', { type: 'time', value: valor, 'aria-label': 'Hora ' + etiqueta, style: 'width:7.2rem', onchange: (e) => { fn(e.target.value); commit(); } });
    const orden = ['desayuno', 'media', 'comida', 'merienda', 'cena'];
    cuerpo.replaceChildren(
      h('p', { class: 'mute small' }, 'Elige qué comidas haces y a qué hora. Los platos de cada día se cambian tocándolos en el menú.'),
      h('div', { class: 'group' }, orden.map((c) => {
        const fija = L.FIJAS.includes(c), f = fija ? data.menu.fijos[c] : null;
        return h('div', { class: 'row' }, h('div', { class: 'grow' }, NOMBRE_COMIDA[c], !fija ? h('div', { class: 'sub' }, 'Siempre') : null),
          (fija ? f.on : true) ? hora(fija ? f.hora : data.menu.horas[c], (v) => { if (!v) return; if (fija) f.hora = v; else data.menu.horas[c] = v; }, NOMBRE_COMIDA[c]) : null,
          fija ? swt(f.on, () => { f.on = !f.on; commit(); draw(); }, NOMBRE_COMIDA[c]) : null); })),
      h('div', { class: 'label', style: 'padding-left:4px' }, 'Ciclo del menú'),
      h('div', { class: 'group' }, h('div', { class: 'row' }, h('div', { class: 'grow' }, 'Semanas distintas', h('div', { class: 'sub' }, 'Con 2, el menú alterna entre dos semanas.')),
        h('div', { class: 'seg', role: 'group' }, [1, 2].map((v) => h('button', { type: 'button', id: 'ciclo-' + v, 'aria-pressed': String(data.menu.semanas.length === v), onclick: () => {
          if (v === data.menu.semanas.length) return; if (v === 2) data.menu.semanas.push(clone(data.menu.semanas[0])); else data.menu.semanas = data.menu.semanas.slice(0, 1); commit(); draw(); } }, String(v))))),
        data.menu.semanas.length > 1 ? h('button', { class: 'row tap', onclick: () => { data.menu.ancla = L.iso(L.lunesDe(L.hoy())); commit(); toast('Ciclo reiniciado.'); } }, h('div', { class: 'grow' }, 'Empezar el ciclo esta semana', h('div', { class: 'sub' }, 'La semana actual pasa a ser la 1.'))) : null));
  }
  draw(); sheet({ title: 'Comidas y horarios', save: 'Listo', body: cuerpo, onSave: () => {} });
}

function editSesion(id) {
  const orig = id ? L.sesionPorId(data, id) : null;
  const s = orig ? clone(orig) : { id: L.idSesionNueva(data), dias: [], t: '', min: '60 min', ej: [] };
  if (!orig) { const libre = [0, 2, 4, 1, 3, 5, 6].find((i) => !L.sesionGym(data, i)); if (libre != null) s.dias = [libre]; }
  const t = h('input', { type: 'text', value: s.t, placeholder: 'Ej. Pierna y core' });
  const dur0 = (() => { const txt = String(s.min || ''), m = txt.match(/(\d+(?:[.,]\d+)?)/); return { valor: m ? m[1].replace('.', ',') : '', unidad: /h/i.test(txt) && !/min/i.test(txt) ? 'h' : 'min' }; })();
  const durValor = h('input', { type: 'text', inputmode: 'decimal', id: 'ses-dur', value: dur0.valor, placeholder: '60', 'aria-label': 'Duración' });
  const durUnidad = h('select', { id: 'ses-dur-unidad', 'aria-label': 'Unidad de la duración', value: dur0.unidad }, h('option', { value: 'min' }, 'minutos'), h('option', { value: 'h' }, 'horas'));
  const dias = h('div', { class: 'chips', role: 'group', 'aria-label': 'Días de la semana', id: 'ses-dias' }), aviso = h('p', { class: 'mute small', id: 'ses-aviso' });
  function pintarDias() {
    dias.replaceChildren(...L.DIAS.map((nombre, i) => { const on = s.dias.includes(i);
      return h('button', { type: 'button', class: 'chipopt', id: 'ses-dia-' + i, 'aria-pressed': String(on), 'aria-label': nombre, onclick: () => { s.dias = on ? s.dias.filter((x) => x !== i) : [...s.dias, i].sort(); pintarDias(); } }, nombre.slice(0, 3)); }));
    const choques = s.dias.map((i) => ({ i, otra: L.sesionesGym(data, i).find((x) => x.id !== s.id) })).filter((x) => x.otra);
    aviso.textContent = !s.dias.length ? 'Sin días fijos: la sesión no se programa sola, pero podrás usarla cuando quieras desde Hoy.'
      : choques.length ? `${choques.map((x) => `El ${L.DIAS[x.i].toLowerCase()} ya tiene “${x.otra.t}”`).join('; ')}: se harán juntas, como un solo entreno.` : `Se repite ${L.diasTexto(s.dias).toLowerCase()}.`;
  }
  const lista = h('div', { class: 'stack', style: 'gap:10px' });
  function draw() {
    lista.replaceChildren(...s.ej.map((e, i) => deslizable(h('div', { class: 'exrow' },
      h('input', { type: 'text', value: e.n, placeholder: 'Ejercicio', 'aria-label': 'Ejercicio', oninput: (x) => { e.n = x.target.value; } }),
      h('input', { type: 'text', value: e.s, placeholder: '4×8', 'aria-label': 'Series y repeticiones', oninput: (x) => { e.s = x.target.value; } }),
      h('button', { class: 'btn ' + (e.c ? '' : 'sec'), style: 'padding:6px 10px;font-size:13px', title: 'Apuntar kilos', onclick: () => { e.c = !e.c; draw(); } }, e.c ? 'kg ✓' : 'kg'),
      h('button', { class: 'x', style: 'color:var(--faint);font-size:20px', 'aria-label': 'Quitar', onclick: () => sacar(s.ej, i, e.n || 'Ejercicio', draw) }, '×')), () => sacar(s.ej, i, e.n || 'Ejercicio', draw))),
      h('button', { class: 'btn sec', style: 'align-self:flex-start', onclick: () => { s.ej.push({ n: '', s: '3×10', c: true }); draw(); } }, '+ Ejercicio'));
  }
  draw(); pintarDias();
  sheet({ title: orig ? 'Editar sesión' : 'Nueva sesión', body: [field('Nombre', t), h('div', {}, h('div', { class: 'label', style: 'margin-bottom:6px' }, 'Días en que la haces'), dias, aviso), h('div', {}, h('div', { class: 'label', style: 'margin-bottom:6px' }, 'Duración'), h('div', { class: 'pair', style: 'grid-template-columns:1fr 1fr' }, durValor, durUnidad)), h('div', { class: 'label' }, 'Ejercicios'), lista],
    onSave: () => {
      if (!t.value.trim()) return 'Escribe el nombre de la sesión.';
      let min = '';
      if (durValor.value.trim() !== '') { const n = num(durValor.value, NaN); if (!(n > 0)) return 'Escribe la duración con números, por ejemplo 60 o 1,5.'; if (durUnidad.value === 'min' && n > 600) return 'Son más de 10 horas. Cambia la unidad a horas.'; if (durUnidad.value === 'h' && n > 10) return 'La duración máxima es de 10 horas.'; min = `${L.kgTxt(Math.round(n * 100) / 100)} ${durUnidad.value === 'h' ? 'h' : 'min'}`; }
      const nueva = { id: s.id, dias: [...s.dias].sort(), t: t.value.trim(), min, ej: s.ej.filter((e) => e.n.trim()).map((e) => ({ n: e.n.trim(), s: e.s.trim(), c: !!e.c })) };
      const otras = data.entreno.sesiones.filter((x) => x.id !== s.id);   // varias sesiones pueden compartir día
      const primero = (x) => (x.dias.length ? Math.min(...x.dias) : 9);
      data.entreno.sesiones = [...otras, nueva].sort((a, b) => primero(a) - primero(b)); commit();
    },
    extra: orig ? h('div', { class: 'row', style: 'padding:0;gap:4px' }, h('button', { class: 'btn danger', onclick: () => confirmSheet('¿Borrar sesión?', `Se eliminará “${orig.t}”. Tus kilos anotados se conservan.`, 'Borrar', () => { data.entreno.sesiones = data.entreno.sesiones.filter((x) => x.id !== s.id); commit(); sheets.slice().forEach((x) => x.close()); }) }, 'Borrar'),
      h('button', { class: 'btn plain', onclick: () => { const c = clone(orig); c.id = L.idSesionNueva(data); c.dias = []; c.t = `${orig.t} (copia)`; data.entreno.sesiones.push(c); commit(); sheets.slice().forEach((x) => x.close()); toast('Sesión duplicada. Cámbiale el nombre y los días.'); } }, 'Duplicar')) : null });
}

/* Cambiar el entreno de un día concreto sin tocar tu plan semanal */
function cambiarEntrenoDia(f, modo = 'cambiar') {
  const d = L.parseISO(f), actual = L.sesionDelDia(data, d), plan = L.sesionGym(data, L.idxDia(d)), cambiado = L.hayCambioDeEntreno(data, d), anadir = modo === 'anadir';
  const poner = (valor) => { const dr = diaReg(f); delete dr.bloques; delete dr.bloquesQuitar; if ((valor === 'descanso' && !plan) || (valor && plan && valor === plan.id)) delete dr.entreno; else dr.entreno = valor; sh.close(); commit(); if (S.entrenoGrande) S.entrenoGrande(); toast(valor === 'descanso' ? 'Hoy toca descanso.' : anadir ? 'Entreno añadido.' : 'Entreno cambiado.'); };
  const fila = (id, titulo, sub, activa) => h('button', { class: 'row tap', type: 'button', id: 'cambiar-' + id, 'aria-pressed': String(activa), onclick: () => poner(id) }, h('div', { class: 'grow' }, titulo, sub ? h('div', { class: 'sub' }, sub) : null), h('span', { class: 'chev', style: 'color:var(--accent);font-weight:700' }, activa ? '✓' : ''));
  const sh = sheet({ title: anadir ? 'Añadir entreno' : 'Entreno de hoy', body: [
    h('p', { class: 'mute small' }, anadir ? 'Elige la sesión que vas a hacer hoy. Solo cambia este día; tu plan semanal no se toca. Tu objetivo de calorías de hoy se ajusta.'
      : `Elige qué haces hoy. Solo cambia este día${plan ? `; tu plan sigue siendo “${plan.t}” los ${L.DIAS[L.idxDia(d)].toLowerCase()}s` : ''}. Tu objetivo de calorías de hoy se ajusta.`),
    h('div', { class: 'group' }, [...data.entreno.sesiones.map((x) => fila(x.id, x.t, `${L.diasTexto(x.dias, true)}${x.min ? ' · ' + x.min : ''}`, actual && actual.id === x.id)), anadir ? null : fila('descanso', 'Descanso', 'Sin entreno hoy', !actual),
      anadir ? h('button', { class: 'row tap', type: 'button', id: 'cambiar-nueva', onclick: () => { sh.close(); editSesion(null); } }, h('div', { class: 'grow', style: 'color:var(--accent);font-weight:500' }, 'Crear una sesión nueva…')) : null]),
    cambiado ? h('button', { class: 'btn plain', id: 'cambiar-volver', style: 'align-self:flex-start;padding-left:0', onclick: () => { delete diaReg(f).entreno; sh.close(); commit(); if (S.entrenoGrande) S.entrenoGrande(); toast('Vuelves a tu plan.'); } }, 'Volver a mi plan') : null] });
}
function anadirEntrenoHoy(f) { if (!data.entreno.sesiones.length) return editSesion(null); cambiarEntrenoDia(f, 'anadir'); }
function barraEntreno(d, f) {
  if (L.sesionDelDia(data, d)) return null;   // si hay entreno, se abre y se cambia desde su tarjeta
  return h('div', { class: 'row', style: 'padding:0 4px;min-height:0' }, h('div', { class: 'grow small mute', id: 'entreno-hoy' }, 'Hoy toca descanso'),
    h('button', { class: 'btn plain', id: 'cambiar-entreno', onclick: () => anadirEntrenoHoy(f) }, 'Añadir entreno'));
}

function bienvenida() {
  if (S.bienvenida && sheets.includes(S.bienvenida)) return;   // ya está abierta
  const T = makeTemplate();
  const nombre = h('input', { type: 'text', placeholder: 'Tu nombre' });
  const kcal = h('input', { type: 'number', value: String(T.perfil.objetivos.gym.kcal) }), prot = h('input', { type: 'number', value: String(T.perfil.objetivos.gym.prot) });
  let calcR = null, cuerpoR = null;
  const aplicar = (base) => {
    const k = Math.max(0, num(kcal.value)), p = Math.max(0, num(prot.value));
    data = base; data.perfil = { ...data.perfil, listo: true, nombre: nombre.value.trim(), objetivos: calcR ? { gym: { kcal: calcR.gym, prot: calcR.prot }, sin: { kcal: calcR.sin, prot: calcR.prot } } : { gym: { kcal: k, prot: p }, sin: { kcal: Math.round(k * 0.92), prot: p } }, ...(cuerpoR ? { cuerpo: cuerpoR } : {}) };
    sheets.slice().forEach((s) => s.close()); commit();
  };
  S.bienvenida = sheet({ title: 'Bienvenido a Rutina', dismissible: false,
    body: [h('div', { class: 'hero' }, h('div', { class: 'big' }, 'Tu día, claro y a tu ritmo'), h('p', { class: 'mute' }, 'Comidas, compra y entrenos en un solo sitio. Todo se guarda en este ordenador.')),
      field('¿Cómo te llamas?', nombre), h('div', { class: 'pair' }, field('Calorías al día', kcal), field('Proteína al día (g)', prot)),
      h('button', { class: 'btn plain', id: 'bienv-calc', style: 'align-self:flex-start;padding-left:0', onclick: () => abrirObjetivo({ guardar: false, onApply: (r, cuerpo) => { kcal.value = String(r.gym); prot.value = String(r.prot); calcR = r; cuerpoR = cuerpo; } }) }, 'Calcular mis objetivos por mí'),
      h('p', { class: 'mute small' }, 'Son solo una referencia. Puedes cambiarlos cuando quieras en Ajustes.'),
      h('button', { class: 'btn wide', onclick: () => aplicar(makeTemplate()) }, 'Empezar con un plan de ejemplo'),
      h('button', { class: 'btn sec wide', onclick: () => aplicar(emptyData()) }, 'Empezar en blanco'),
      Nube.nubeActiva() ? h('button', { class: 'btn plain wide', onclick: () => irAuth('entrar') }, 'Ya tengo una cuenta') : null] });
}

/* ---------- acciones ---------- */
function diaReg(f) { return (data.dias[f] ||= { hechos: {} }); }
function toggleHecho(f, k) { const d = diaReg(f); d.hechos = d.hechos || {}; if (d.hechos[k]) delete d.hechos[k]; else d.hechos[k] = true; commit(); }
function setEj(f, k, patch) { const d = diaReg(f); d.gym = d.gym || {}; d.gym[k] = { ...(d.gym[k] || {}), ...patch }; commit(); }

/* ---------- extras (comida fuera del plan) ---------- */
function anadirExtra(f) {
  buscarAlimento({ titulo: 'Añadir comida', onPick: (id, q0) => {
    const g = L.ing(data, id), cant = h('input', { type: 'number', id: 'extra-cant', min: 0, step: 'any', value: String(q0) });
    const tipo = h('select', { id: 'extra-tipo', value: 'snack' }, [['desayuno', 'Desayuno'], ['comida', 'Comida'], ['cena', 'Cena'], ['snack', 'Snack']].map(([v, t]) => h('option', { value: v }, t)));
    const vista = h('div', { class: 'macros-live num' }), calc = () => { vista.textContent = macroTxt(L.sumaItems(data, [[id, num(cant.value)]])); };
    cant.addEventListener('input', calc); calc();
    sheet({ title: g.n, save: 'Añadir', body: [field(`Cantidad (${g.u === 'ud' ? 'unidades' : g.u})`, cant), field('Comida', tipo), vista],
      onSave: () => {
        const q = num(cant.value); if (!(q > 0)) return 'Escribe una cantidad.';
        const sm = L.sumaItems(data, [[id, q]]), d = diaReg(f); d.extras = d.extras || [];
        d.extras.push({ n: g.n, q, u: g.u, k: Math.round(sm.k), p: r1(sm.p), c: r1(sm.c), f: r1(sm.f), tipo: tipo.value }); commit();
      } });
  } });
}
function extrasCard(f) {
  const ex = L.extrasDe(data, f);
  return h('section', { class: 'stack', style: 'gap:8px' },
    h('div', { class: 'row', style: 'padding:0 4px;min-height:0' }, h('div', { class: 'label grow' }, 'Extras de hoy'), h('button', { class: 'btn plain', id: 'add-extra', onclick: () => anadirExtra(f) }, '+ Añadir comida')),
    ex.length ? h('div', { class: 'group' }, ex.map((e, i) => deslizable(h('div', { class: 'row' }, h('div', { class: 'grow' }, e.n, h('div', { class: 'sub num' }, `${f1(e.q)} ${e.u === 'ud' ? 'ud' : e.u} · ${e.k} kcal · P ${f1(e.p)} g`)),
      h('button', { class: 'chev', 'aria-label': 'Quitar ' + e.n, onclick: () => sacar(ex, i, e.n, commit) }, '×')), () => sacar(ex, i, e.n, commit))))
      : h('p', { class: 'mute small', style: 'padding-left:4px' }, 'Lo que comas fuera del plan se suma a tu día.'));
}
function macroBar(t) {
  const r = L.repartoMacros(t); if (!r || !t.completo) return null;
  const punto = (c, txt) => h('span', { class: 'leg' }, h('b', { class: 'dot ' + c }), txt);
  return h('div', { class: 'metric' }, h('div', { class: 'top' }, h('span', { class: 'label' }, 'Reparto de energía'), h('span', { class: 'mute small num' }, `C ${f1(t.c)} g · G ${f1(t.f)} g`)),
    h('div', { class: 'stackbar', role: 'img', 'aria-label': `Proteína ${r.p} %, hidratos ${r.c} %, grasa ${r.f} %` }, h('i', { class: 'sp', style: `width:${r.p}%` }), h('i', { class: 'sc', style: `width:${r.c}%` }), h('i', { class: 'sf', style: `width:${r.f}%` })),
    h('div', { class: 'legend' }, punto('sp', `Proteína ${r.p} %`), punto('sc', `Hidratos ${r.c} %`), punto('sf', `Grasa ${r.f} %`)));
}

/* ---------- vistas ---------- */
function slotEl(s, f, ahora, hecho) {
  const contenido = [h('span', { class: 'kind' }, s.kind), h('h3', {}, s.title), s.det ? h('p', { class: 'det' }, s.det) : null,
    s.progreso != null ? h('div', { class: 'bar', style: 'margin-top:8px' }, h('i', { style: `width:${Math.round(s.progreso * 100)}%` })) : null];
  return h('div', { class: 'slot' + (hecho ? ' hecho' : '') + (s.k === ahora ? ' ahora' : '') },
    h('span', { class: 'hora' }, s.hora),
    s.accion ? h('div', { class: 'slot-col' }, h('button', { class: 'slot-main', id: 'slot-' + s.k, type: 'button', onclick: s.accion, 'aria-label': `${s.kind}: ${s.title}. ${s.aria || 'Abrir'}` }, ...contenido), s.extra || null)
      : h('div', {}, ...contenido, s.extra || null),
    h('button', { class: 'chk', 'aria-pressed': String(hecho), 'aria-label': (hecho ? 'Desmarcar: ' : 'Marcar como hecho: ') + s.kind, onclick: () => toggleHecho(f, s.k) }, icon('check')));
}
/* Para cocinar: las cantidades del plato de hoy para todos los que comen, con el reparto de cada uno y casillas para ir marcando. */
function cocinar(d, k) {
  const pl = L.platoDelDia(data, d, k); if (!pl || pl.libre) return;
  const quien = L.hogar(data).filter((x) => x.comidas.includes(k)).map((x) => x.n), marcados = new Set(), lista = h('div', { class: 'group cocinar', id: 'cocinar-lista' });
  const pintar = () => lista.replaceChildren(...pl.items.map(([id, q], i) => {
    const rep = L.repartoHogar(data, id, q, k), tot = q, on = marcados.has(i);
    return h('button', { type: 'button', class: 'item', 'aria-pressed': String(on), onclick: () => { on ? marcados.delete(i) : marcados.add(i); pintar(); } },
      h('span', { class: 'box', 'aria-hidden': 'true', 'aria-pressed': String(on) }, icon('check')),
      h('span', { class: 'nm' }, h('span', { class: 'nm-t' }, L.ing(data, id).n), rep.length > 1 ? h('small', { class: 'reparto' }, rep.map((x) => `${x.n} ${L.cantidadCompra(data, id, x.q)}`).join(' · ')) : null),
      h('span', { class: 'q' }, L.cantidadCompra(data, id, tot)));
  }));
  pintar();
  sheet({ title: 'Para cocinar', cancel: 'Cerrar', body: [h('div', {}, h('div', { class: 'label' }, `${NOMBRE_COMIDA[k]} · para ${[ 'ti', ...quien ].join(' y ')}`), h('h2', { class: 'grande-titulo', id: 'cocinar-titulo', style: 'font-size:24px' }, pl.t)),
    lista, h('p', { class: 'mute small' }, 'Las cantidades del plato, tal cual, y debajo de cada una lo que le toca a cada persona. Toca un ingrediente para ir marcándolo.')] });
}
/* Ajustar lo que comes hoy: otro plato y/o otras cantidades, solo para hoy (el plan no se toca). */
const PORCIONES = [[0.5, '½'], [0.75, '¾'], [1, '1×'], [1.25, '1¼'], [1.5, '1½'], [2, '2×']];
function cambiarComidaHoy(f, d, k) {
  const nombre = NOMBRE_COMIDA[k], cambiado = !!L.cambioDe(data, f, k), actual = L.platoDelDia(data, d, k), plan = L.platoDelDia(data, d, k, { cambios: false });
  // El plato guarda las cantidades de todos; aquí se editan solo las tuyas y al guardar se vuelve al total
  const mia = (id, q) => { const x = L.miCantidad(data, id, q, k); return L.ing(data, id).u === 'ud' ? x : Math.round(x); }, memoria = new Map();
  const suyas = (items) => (items || []).map(([id, q]) => [id, mia(id, q)]);
  const recordar = (items) => (items || []).forEach(([id, q]) => memoria.set(id, [mia(id, q), q]));
  const totales = (items) => items.map(([id, q]) => { const m = memoria.get(id); return [id, m && Math.abs(m[0] - q) < 1e-9 ? m[1] : L.cantidadTotal(data, id, q, k)]; });
  recordar(actual.items);
  const w = clone({ t: actual.libre ? 'Comida libre' : actual.t, items: suyas(actual.items), libre: !!actual.libre });
  let origen = clone(w.items), origenTot = new Map(memoria), factor = cambiado ? null : 1;
  const cuerpo = h('div', { class: 'stack', style: 'gap:14px' }), total = h('div', { class: 'macros-live num', id: 'hoy-total', 'aria-live': 'polite' }), chips = h('div', { class: 'chips', id: 'hoy-porciones', role: 'group', 'aria-label': 'Porción' });
  const pintarTotal = () => { total.textContent = w.libre ? `Comida libre: cuenta unas ${L.miles(data.perfil.libre.kcal)} kcal` : 'Hoy, para ti: ' + macroTxt(L.sumaItems(data, w.items)) + (L.comensales(data, k).length ? ` · plato completo ${L.miles(L.sumaItems(data, totales(w.items)).k)} kcal` : ''); };
  const pintarChips = () => chips.replaceChildren(...PORCIONES.map(([v, t]) => h('button', { type: 'button', class: 'chipopt', id: 'porcion-' + v, 'aria-pressed': String(factor === v), onclick: () => {
    factor = v; w.items.splice(0, w.items.length, ...origen.map(([id, q]) => { const ud = L.ing(data, id).u === 'ud', n = ud ? Math.round(q * v * 2) / 2 : Math.round(q * v), t = origenTot.get(id); if (t && !ud) memoria.set(id, [n, t[1] * v]); return [id, n]; })); edit.redraw(); pintarChips(); pintarTotal(); } }, t)));
  const edit = itemsEditor(w.items, () => { factor = null; pintarChips(); pintarTotal(); });
  const nombreEl = h('div', { class: 'plato-fijo', id: 'plato-nombre' }), btn = h('button', { type: 'button', class: 'btn sec', id: 'plato-elegir', onclick: () => elegirPlato({ titulo: `Hoy · ${nombre}`, m: k, actual: w.t, libre: !L.FIJAS.includes(k),
    onLibre: () => { w.libre = true; w.t = 'Comida libre'; w.items.splice(0); draw(); },
    onPick: (x) => { w.libre = false; w.t = x.t; recordar(x.items); w.items.splice(0, w.items.length, ...suyas(clone(x.items))); origen = clone(w.items); origenTot = new Map(memoria); factor = 1; edit.redraw(); draw(); } }) }, 'Cambiar plato');
  function draw() {
    nombreEl.textContent = w.t; pintarChips(); pintarTotal();
    cuerpo.replaceChildren(...[h('div', { class: 'field' }, h('span', {}, 'Plato'), h('div', { class: 'plato-sel' }, nombreEl, btn)),
      ...(w.libre ? [total] : [h('div', { class: 'field' }, h('span', {}, 'Porción'), chips), h('div', { class: 'label' }, 'Tus cantidades de hoy'), edit, total]),
      h('p', { class: 'mute small' }, 'Los cambios valen solo para hoy: el menú no se modifica.')]);
  }
  draw();
  sheet({ title: `Hoy · ${nombre}`, body: cuerpo, save: 'Guardar',
    onSave: () => {
      const r = diaReg(f), cl = w.libre ? { t: 'Comida libre', libre: true, items: [] } : { t: w.t, items: totales(w.items.filter((it) => it[1] > 0 && data.ingredientes[it[0]])) };
      const igual = plan && !!plan.libre === !!cl.libre && plan.t === cl.t && JSON.stringify((plan.items || []).map((x) => [x[0], x[1]])) === JSON.stringify(cl.items.map((x) => [x[0], x[1]]));
      r.cambios = r.cambios || {}; if (igual) delete r.cambios[k]; else r.cambios[k] = cl; if (!Object.keys(r.cambios).length) delete r.cambios; commit();
    },
    extra: cambiado ? h('button', { class: 'btn danger', id: 'hoy-volver', onclick: () => { const r = diaReg(f); delete r.cambios[k]; if (!Object.keys(r.cambios).length) delete r.cambios; commit(); sheets.slice().forEach((x) => x.close()); toast('Vuelve a lo del plan.'); } }, 'Volver al plan') : null });
}
/* Añadir un ejercicio solo a hoy (la sesión del plan no se modifica); se registra su peso como los demás. */
function anadirEjercicio(f) {
  const hist = new Set(); data.entreno.sesiones.forEach((x) => x.ej.forEach((e) => hist.add(e.n))); Object.values(data.dias).forEach((r) => (r.ejExtra || []).forEach((e) => hist.add(e.n)));
  const nom = h('input', { type: 'text', id: 'ej-nombre', list: 'ej-sugerencias', placeholder: 'Ej. Fondos en paralelas', autocomplete: 'off' }), lista = h('datalist', { id: 'ej-sugerencias' }, [...hist].map((n) => h('option', { value: n })));
  const series = h('input', { type: 'number', id: 'ej-series', min: 1, max: 20, step: 1, inputmode: 'numeric', value: '3' }), reps = h('input', { type: 'text', id: 'ej-reps', value: '10', placeholder: 'Ej. 8, 8-12 o 40 s' });
  const peso = swt(true, () => { peso.setAttribute('aria-checked', String(peso.getAttribute('aria-checked') !== 'true')); }, 'Lleva peso');
  sheet({ title: 'Añadir ejercicio', save: 'Añadir', body: [field('Ejercicio', nom), lista, h('div', { class: 'pair' }, field('Series', series), field('Repeticiones', reps)),
    h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, 'Lleva peso', h('div', { class: 'sub' }, 'Para registrar los kilos que usas.')), peso),
    h('p', { class: 'mute small' }, 'Solo se añade a hoy: tu sesión del plan no cambia.')],
  onSave: () => {
    const n = nom.value.trim(), sr = parseInt(series.value, 10), rp = reps.value.trim(); if (!n) return 'Escribe el nombre del ejercicio.'; if (!(sr >= 1)) return 'Escribe cuántas series.'; if (!rp) return 'Escribe las repeticiones.';
    if (L.ejerciciosDelDia(data, L.parseISO(f)).some((e) => L.slug(e.n) === L.slug(n))) return 'Ese ejercicio ya está en el entreno de hoy.';
    const r = diaReg(f); (r.ejExtra ||= []).push({ n, s: `${sr}×${rp}`, c: peso.getAttribute('aria-checked') === 'true' }); commit(); if (S.entrenoGrande) S.entrenoGrande();
  } });
}
/* Sumar otra sesión (un bloque: Brazo, Cardio…) al entreno de hoy: sale todo como un solo entreno y el plan no cambia. */
function anadirBloque(f) {
  const d = L.parseISO(f), ses = L.sesionDelDia(data, d); if (!ses) return;
  const ya = new Set([ses.id, ...L.bloquesDelDia(data, d).map((x) => x.id)]), opciones = data.entreno.sesiones.filter((x) => !ya.has(x.id));
  const sh = sheet({ title: 'Añadir otra sesión', cancel: 'Cerrar', body: [
    h('p', { class: 'mute small' }, `Se suma a “${ses.t}” y se apunta todo junto en un solo entreno. Solo vale para hoy: tus sesiones no cambian.`),
    opciones.length ? h('div', { class: 'group' }, opciones.map((x) => h('button', { type: 'button', class: 'row tap', id: 'sumar-' + x.id, onclick: () => {
      sh.close(); const r = diaReg(f); r.bloques = [...(r.bloques || []), x.id]; if (r.bloquesQuitar) { r.bloquesQuitar = r.bloquesQuitar.filter((id) => id !== x.id); if (!r.bloquesQuitar.length) delete r.bloquesQuitar; } commit(); if (S.entrenoGrande) S.entrenoGrande(); toast(`“${x.t}” sumada al entreno de hoy.`);
    } }, h('div', { class: 'grow' }, x.t, h('div', { class: 'sub' }, `${x.ej.length} ejercicio${x.ej.length === 1 ? '' : 's'}${x.min ? ' · ' + x.min : ''}`)), h('span', { class: 'chev' }, '+'))))
      : h('p', { class: 'mute small', id: 'bloque-vacio' }, 'No tienes más sesiones para sumar. Crea una, por ejemplo “Brazo” o “Cardio”, y aparecerá aquí.')],
    extra: h('button', { class: 'btn plain', id: 'bloque-nueva', onclick: () => { sh.close(); editSesion(null); } }, 'Crear una sesión nueva…') });
}
/* Vista grande del entreno de hoy: se abre al tocar la tarjeta. Recuerda el último peso de cada ejercicio. */
function abrirEntrenoHoy(f) {
  const d = L.parseISO(f), cuerpo = h('div', { class: 'stack', style: 'gap:18px' });
  const guardar = (k, patch) => { setEj(f, k, patch); pintar(); };
  // Series y repeticiones de hoy: se pueden cambiar solo para hoy o también en el plan
  const editarSeries = (ses, e, k, x) => {
    const actual = x.s || e.s, m = String(actual).match(/^\s*(\d+)\s*[×xX*]\s*(.+?)\s*$/);
    const series = h('input', { type: 'number', id: 'ser-series', min: 1, max: 20, step: 1, inputmode: 'numeric', value: m ? m[1] : '' }), reps = h('input', { type: 'text', id: 'ser-reps', value: m ? m[2] : String(actual), placeholder: 'Ej. 8, 8-12 o 40 s' });
    const plan = swt(false, () => { plan.setAttribute('aria-checked', String(plan.getAttribute('aria-checked') !== 'true')); }, 'Cambiar también en mi plan');
    sheet({ title: e.n, save: 'Guardar', body: [h('div', { class: 'pair' }, field('Series', series), field('Repeticiones', reps)),
      e.extra ? null : h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, 'Cambiar también en mi plan', h('div', { class: 'sub' }, `Si no, solo cambia hoy. Plan actual: ${e.s}.`)), plan)],
      onSave: () => {
        const sr = parseInt(series.value, 10), rp = reps.value.trim(); if (!(sr >= 1)) return 'Escribe cuántas series.'; if (!rp) return 'Escribe las repeticiones.';
        const nuevo = `${sr}×${rp}`;
        if (!e.extra && plan.getAttribute('aria-checked') === 'true') { const real = (e.bloque ? data.entreno.sesiones.find((y) => y.id === e.bloque) : ses).ej.find((y) => L.slug(y.n) === k); if (real) real.s = nuevo; guardar(k, { s: null }); commit(); toast('Cambiado en tu plan.'); } else guardar(k, { s: nuevo === e.s ? null : nuevo });
      },
      extra: x.s ? h('button', { class: 'btn danger', id: 'ser-volver', onclick: () => { guardar(k, { s: null }); sheets.slice(-1)[0].close(); } }, 'Volver al plan') : null });
  };
  const quitarEj = (e, k) => {
    const r = diaReg(f), antes = { extra: r.ejExtra ? clone(r.ejExtra) : undefined, quitar: r.ejQuitar ? [...r.ejQuitar] : undefined, reg: r.gym && r.gym[k] ? { ...r.gym[k] } : undefined };
    if (e.extra) { r.ejExtra = (r.ejExtra || []).filter((x) => L.slug(x.n) !== k); if (!r.ejExtra.length) delete r.ejExtra; } else r.ejQuitar = [...(r.ejQuitar || []), k];
    if (r.gym) delete r.gym[k]; commit(); pintar();
    toast(`“${e.n}” quitado de hoy.`, () => { const q = diaReg(f); if (antes.extra) q.ejExtra = antes.extra; else delete q.ejExtra; if (antes.quitar) q.ejQuitar = antes.quitar; else delete q.ejQuitar; if (antes.reg) { q.gym = q.gym || {}; q.gym[k] = antes.reg; } commit(); pintar(); });
  };
  const fichas = (ses, reg, lista) => lista.map((e) => {
    const k = L.slug(e.n), x = reg[k] || {}, u = e.c ? L.ultimoPeso(data, k, f) : null;
    const kgActual = x.kg != null ? x.kg : (u ? u.kg : null), sugerido = x.kg == null && !!u;     // si hoy no has puesto nada, se recuerda el de la última vez
    const mover = (delta) => guardar(k, { kg: Math.max(0, Math.round(((kgActual ?? 0) + delta) * 100) / 100) });
    const kg = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', id: 'kg-' + k, class: 'kg' + (sugerido ? ' sugerido' : ''), 'aria-label': 'Kilos de ' + e.n, placeholder: '—', value: kgActual != null ? L.kgTxt(kgActual) : '', onchange: (ev) => {
      const v = ev.target.value.trim(); if (v === '') return guardar(k, { kg: null });
      const n = num(v, NaN); if (!Number.isFinite(n) || n < 0 || n > 999) return toast('Escribe los kilos como número, por ejemplo 82,5.'); guardar(k, { kg: Math.round(n * 100) / 100 }); } });
    return deslizable(h('div', { class: 'ficha' + (x.hecho ? ' hecho' : ''), id: 'ficha-' + k },
      h('div', { class: 'ficha-top' },
        h('button', { class: 'chk', id: 'hecho-' + k, 'aria-pressed': String(!!x.hecho), 'aria-label': (x.hecho ? 'Desmarcar ' : 'Marcar como hecho: ') + e.n,
          onclick: () => guardar(k, { hecho: !x.hecho, ...(!x.hecho && x.kg == null && u ? { kg: u.kg } : {}) }) }, icon('check')),   // al marcarlo se guarda el peso recordado
        h('div', { class: 'grow' }, h('div', { class: 'ficha-nombre' }, e.n, e.extra ? h('span', { class: 'tag' }, 'Extra') : null),
          h('button', { type: 'button', class: 'esquema', id: 'esq-' + k, 'aria-label': `Cambiar series y repeticiones de ${e.n}`, onclick: () => editarSeries(ses, e, k, x) }, h('span', { class: 'num' }, x.s || e.s), x.s && !e.extra ? h('span', { class: 'mute small' }, ` · plan ${e.s}`) : null, h('span', { class: 'chev' }, ' ›'))),
        h('button', { type: 'button', class: 'x quitar-ej', id: 'quitar-' + k, 'aria-label': 'Quitar ' + e.n + ' de hoy', onclick: () => quitarEj(e, k) }, '×')),
      h('div', { class: 'ficha-campos' },
        e.c ? h('div', { class: 'campo' }, h('span', { class: 'label' }, 'Peso'), h('div', { class: 'kgbox' }, h('button', { type: 'button', class: 'mas', 'aria-label': 'Quitar 2,5 kg', onclick: () => mover(-2.5) }, '−'), kg, h('span', { class: 'kgu' }, 'kg'), h('button', { type: 'button', class: 'mas', 'aria-label': 'Sumar 2,5 kg', onclick: () => mover(2.5) }, '+'))) : null,
        ),
      u ? h('div', { class: 'mute small' }, `${sugerido ? 'Peso de la última vez' : 'Última vez'}: ${L.kgTxt(u.kg)} kg · ${L.fechaCorta(L.parseISO(u.f))}`) : null), () => quitarEj(e, k), 'Quitar', 'ficha-sw');
  });
  const quitarBloque = (b, ejsBloque) => {
    const r = diaReg(f), antes = { bl: r.bloques ? [...r.bloques] : undefined, qu: r.bloquesQuitar ? [...r.bloquesQuitar] : undefined }, regs = {};
    for (const e of ejsBloque) { const k = L.slug(e.n); if (r.gym && r.gym[k]) { regs[k] = { ...r.gym[k] }; delete r.gym[k]; } }
    r.bloques = (r.bloques || []).filter((id) => id !== b.id); if (!r.bloques.length) delete r.bloques;
    if (L.sesionesGym(data, L.idxDia(d)).some((x) => x.id === b.id)) r.bloquesQuitar = [...(r.bloquesQuitar || []), b.id];   // era una sesión programada ese día: se oculta solo hoy
    commit(); pintar();
    toast(`“${b.t}” quitada de hoy.`, () => { const q = diaReg(f); if (antes.bl) q.bloques = antes.bl; else delete q.bloques; if (antes.qu) q.bloquesQuitar = antes.qu; else delete q.bloquesQuitar; q.gym = { ...(q.gym || {}), ...regs }; commit(); pintar(); });
  };
  function pintar() {
    if (!document.body.contains(cuerpo)) return;
    const ses = L.sesionDelDia(data, d); if (!ses) { sh.close(); return; }
    const reg = L.regGym(data, f), ejs = L.ejerciciosDelDia(data, d), total = ejs.length, hechos = ejs.filter((e) => reg[L.slug(e.n)] && reg[L.slug(e.n)].hecho).length, quitados = (data.dias[f] && data.dias[f].ejQuitar) || [], terminado = !!L.hechosDe(data, f).gym;
    const cont = cuerpo.parentElement, top = cont ? cont.scrollTop : 0;
    cuerpo.replaceChildren(
      h('div', {}, h('div', { class: 'label' }, `Entreno${ses.min ? ' · ' + ses.min : ''}`), h('h2', { class: 'grande-titulo', id: 'entreno-titulo' }, L.tituloEntreno(data, d)),
        h('div', { class: 'row', style: 'padding:8px 0 0;gap:10px;min-height:0' }, h('div', { class: 'bar grow' }, h('i', { style: `width:${total ? Math.round(hechos / total * 100) : 0}%` })), h('span', { class: 'num mute', id: 'entreno-progreso' }, `${hechos} de ${total}`))),
      ...fichas(ses, reg, ejs.filter((e) => !e.bloque && !e.extra)),
      ...L.bloquesDelDia(data, d).flatMap((b) => { const mios = ejs.filter((e) => e.bloque === b.id); return [
        h('div', { class: 'row bloque-cab', id: 'bloque-' + b.id, style: 'padding:6px 4px 0;min-height:0' }, h('div', { class: 'grow' }, h('div', { class: 'label' }, 'Sesión sumada'), h('h3', { class: 'bloque-titulo' }, b.t)),
          h('button', { class: 'btn plain', id: 'bloque-quitar-' + b.id, onclick: () => quitarBloque(b, mios) }, 'Quitar sesión')),
        ...(mios.length ? fichas(ses, reg, mios) : [h('p', { class: 'mute small', style: 'padding-left:4px' }, 'Todos sus ejercicios están quitados de hoy.')])]; }),
      ...fichas(ses, reg, ejs.filter((e) => e.extra)),
      h('p', { class: 'hint-swipe mute small' }, 'Desliza un ejercicio hacia la izquierda para quitarlo de hoy.'),
      h('div', { class: 'row', style: 'padding:0;min-height:0;flex-wrap:wrap;gap:4px 12px' }, h('button', { class: 'btn sec', id: 'ej-anadir', onclick: () => anadirEjercicio(f) }, '+ Añadir ejercicio'), h('button', { class: 'btn sec', id: 'bloque-anadir', onclick: () => anadirBloque(f) }, '+ Añadir otra sesión'),
        quitados.length ? h('button', { class: 'btn plain', id: 'ej-restaurar', onclick: () => { delete diaReg(f).ejQuitar; commit(); pintar(); } }, `Restaurar ${quitados.length} quitado${quitados.length === 1 ? '' : 's'}`) : null),
      h('div', { class: 'stack', style: 'gap:8px' },
        terminado ? h('button', { class: 'btn sec wide', id: 'entreno-reabrir', onclick: () => { toggleHecho(f, 'gym'); pintar(); } }, 'Entreno completado ✓ · Marcar como pendiente')
          : h('button', { class: 'btn wide', id: 'entreno-terminar', onclick: () => { toggleHecho(f, 'gym'); toast('¡Entreno completado!'); sh.close(); } }, 'Terminar entreno'),
        h('button', { class: 'btn plain wide', id: 'entreno-cambiar', onclick: () => cambiarEntrenoDia(f) }, 'Cambiar entreno de hoy')));
    if (cont) cont.scrollTop = top;
  }
  const sh = sheet({ title: 'Entreno de hoy', clase: 'grande', save: 'Listo', body: cuerpo, onSave: () => {} });
  S.entrenoGrande = pintar; pintar();
}

function saludo() {
  const hr = new Date().getHours(), t = hr < 6 ? 'Buenas noches' : hr < 14 ? 'Buenos días' : hr < 21 ? 'Buenas tardes' : 'Buenas noches';
  return data.perfil.nombre ? `${t}, ${data.perfil.nombre}` : t;
}
function avisoInstalar() {
  if (window.rutina || localStorage.getItem('rutina-ocultar-instalar')) return null;
  const instalada = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; if (instalada) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios && !S.instalarEvento) return null;
  const ocultar = h('button', { class: 'btn plain', 'aria-label': 'Ocultar este aviso', onclick: () => { try { localStorage.setItem('rutina-ocultar-instalar', '1'); } catch { /* sin almacenamiento */ } S.instalarOculto = true; render(); } }, '✕');
  if (S.instalarOculto) return null;
  return ios ? h('div', { class: 'banner', id: 'aviso-instalar', role: 'note' }, h('span', { class: 'grow' }, 'Instala Rutina: toca ', h('b', {}, 'Compartir'), ' y elige ', h('b', {}, '«Añadir a pantalla de inicio»'), '.'), ocultar)
    : h('div', { class: 'banner', id: 'aviso-instalar', role: 'note' }, h('span', { class: 'grow' }, 'Instala Rutina en tu dispositivo para usarla como una app.'), h('button', { class: 'btn', onclick: async () => { S.instalarEvento.prompt(); await S.instalarEvento.userChoice; S.instalarEvento = null; render(); } }, 'Instalar'), ocultar);
}
function recordatorioCuenta() {
  if (!Nube.nubeActiva() || Nube.haySesion() || (data.meta || {}).ocultarCuenta) return null;
  return h('div', { class: 'banner', role: 'note' }, h('span', { class: 'grow' }, 'Crea una cuenta para no perder tus datos y usar Rutina en otros dispositivos.'),
    h('button', { class: 'btn', onclick: () => irAuth('crear') }, 'Crear cuenta'),
    h('button', { class: 'btn plain', 'aria-label': 'Ocultar este aviso', onclick: () => { data.meta = data.meta || {}; data.meta.ocultarCuenta = true; guardarLocal(); } }, '✕'));
}
function viewHoy() {
  const d = L.hoy(), f = L.iso(d), dm = L.diaMenu(data, d), hechos = L.hechosDe(data, f), slots = [];
  for (const [c, nombre] of [['desayuno', 'Desayuno'], ['media', 'Media mañana'], ['comida', 'Comida'], ['merienda', 'Merienda'], ['cena', 'Cena']]) {
    const pl = L.platoDelDia(data, d, c); if (!pl) continue; const esF = L.FIJAS.includes(c);
    slots.push({ k: c, hora: esF ? L.fijoOn(data, c).hora : data.menu.horas[c], kind: nombre + (pl.cambiado ? ' · cambiado' : ''), title: pl.libre ? 'Comida libre' : pl.t, det: pl.libre ? 'Que lleve una ración clara de proteína.' : itemsText((pl.items || []).map(([id, q]) => { const x = L.miCantidad(data, id, q, c); return [id, L.ing(data, id).u === 'ud' ? x : Math.round(x)]; })), accion: () => cambiarComidaHoy(f, d, c), aria: 'Ajustar lo de hoy',
      extra: !pl.libre && L.hogar(data).some((x) => x.comidas.includes(c)) ? h('button', { class: 'btn plain cocinar-btn', id: 'cocinar-' + c, type: 'button', onclick: () => cocinar(d, c) }, `Para cocinar · ${1 + L.hogar(data).filter((x) => x.comidas.includes(c)).length} personas`) : null });
  }
  const ses = L.sesionDelDia(data, d);
  if (ses) { const reg = L.regGym(data, f), ejs = L.ejerciciosDelDia(data, d), hechasEj = ejs.filter((e) => reg[L.slug(e.n)] && reg[L.slug(e.n)].hecho).length;
    slots.push({ k: 'gym', hora: data.entreno.hora, kind: `Entreno${ses.min ? ' · ' + ses.min : ''}${L.hayCambioDeEntreno(data, d) ? ' · cambiado' : ''}`, title: L.tituloEntreno(data, d), det: `${hechasEj} de ${ejs.length} ejercicios`, progreso: ejs.length ? hechasEj / ejs.length : 0, accion: () => abrirEntrenoHoy(f) }); }
  slots.sort((a, b) => L.minutos(a.hora) - L.minutos(b.hora));
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), sig = slots.find((s) => !hechos[s.k] && L.minutos(s.hora) >= nm - 60), hechas = slots.filter((s) => hechos[s.k]).length;

  const t = L.totalDia(data, d), c = L.totalDia(data, d, { soloHechos: true }), o = L.objetivo(data, d);
  const metric = (label, v, goal, unit, tope = false) => { const pasa = tope && goal && v > goal * 1.05;   // tope: pasarse del objetivo no es bueno (calorías); con la proteína sí
    return h('div', { class: 'metric' }, h('div', { class: 'top' }, h('span', { class: 'label' }, label), h('span', { class: 'mute small num' }, `objetivo ${L.miles(goal)} ${unit}`)),
      h('b', { class: 'num' + (pasa ? ' over' : '') }, `${L.miles(v)} ${unit}`), pasa ? h('span', { class: 'over small num' }, `Te pasas ${L.miles(v - goal)} ${unit}`) : null,
      h('div', { class: 'bar' + (pasa ? ' over' : goal && v >= goal ? ' ok' : '') }, h('i', { style: `width:${goal ? Math.min(100, v / goal * 100) : 0}%` }))); };
  const cs = L.comidasDelDia(data), total = cs.length;
  const siete = Array.from({ length: 7 }, (_, n) => { const x = L.addDays(d, n - 6), c = cs.filter((k) => L.hechosDe(data, L.iso(x))[k]).length;
    return h('div', { class: 'd7' + (n === 6 ? ' today' : '') }, h('div', { class: 'c' }, h('i', { style: `height:${c / total * 100}%` })), h('span', {}, 'LMXJVSD'[L.idxDia(x)]), h('span', { class: 'num' }, `${c}/${total}`)); });
  const r = L.racha(data);

  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, saludo()), h('p', { class: 'subtitle' }, L.fechaLarga(d)))),
    avisoInstalar(), recordatorioCuenta(),
    h('div', { class: 'cols' },
      h('div', { class: 'stack' }, slots.length ? h('div', { class: 'group' }, slots.map((s) => slotEl(s, f, sig && sig.k, !!hechos[s.k]))) :
        h('div', { class: 'card empty' }, h('p', {}, 'Hoy no tienes nada en el plan.'), h('button', { class: 'btn', onclick: () => go('semana') }, 'Preparar el menú')), slots.length ? h('p', { class: 'mute small', style: 'padding:0 4px' }, 'Toca una comida para cambiar el plato o las cantidades de hoy.') : null, barraEntreno(d, f), extrasCard(f)),
      h('div', { class: 'stack' },
        t ? h('section', { class: 'card', id: 'nutricion' }, h('h2', { class: 'sec' }, 'Nutrición'), metric('Proteína', c.p, o.prot, 'g'), metric('Energía', c.k, o.kcal, 'kcal', true), c.k > 0 ? macroBar(c) : null,
          h('p', { class: 'mute small', id: 'nutricion-nota' }, c.k > 0 ? `Suma lo que has marcado como hecho${c.extras ? `, con ${L.miles(c.extras)} kcal de extras` : ''}. ` : 'Se irá completando según marques las comidas como hechas. ', t.k > c.k ? `Faltan ${L.miles(t.k - c.k)} kcal de lo previsto hoy.` : '')) : null,
        h('section', { class: 'card' }, h('h2', { class: 'sec' }, 'Progreso'),
          h('div', { class: 'metric' }, h('div', { class: 'top' }, h('span', { class: 'label' }, 'Hecho hoy'), h('span', { class: 'num mute small' }, `${hechas} de ${slots.length}`)), h('div', { class: 'bar' }, h('i', { style: `width:${slots.length ? hechas / slots.length * 100 : 0}%` }))),
          h('div', { class: 'label' }, 'Comidas de los últimos 7 días'), h('div', { class: 'week7' }, siete),
          h('p', { class: 'mute small' }, r > 0 ? `Llevas ${r} ${r === 1 ? 'día completo seguido' : 'días completos seguidos'}.` : `Marca las ${total} comidas de un día para empezar una racha.`)))));
}

function platoBtn(semana, i, m) {
  const pl = semana[i][m], s = pl && !pl.libre ? L.sumaItems(data, pl.items, m) : null;
  return h('button', { class: 'plato meal', id: `plato-${m}-${i}`, onclick: () => editPlato(semana, i, m) },
    h('div', { class: 'mb' }, h('span', { class: 'label' }, NOMBRE_COMIDA[m]),
      pl ? [h('h3', {}, pl.libre ? 'Comida libre' : pl.t), pl.libre ? null : h('p', { class: 'det' }, itemsText(pl.items))] : h('h3', { class: 'add' }, '+ Añadir')),
    pl ? h('span', { class: 'kc num' }, pl.libre ? `~${L.miles(data.perfil.libre.kcal)} kcal` : h('span', {}, `${L.miles(s.k)} kcal`, h('small', {}, `P ${f1(s.p)} g`))) : null);
}
function fijaBtn(semana, i, c, d) {
  const f = L.fijoDia(data, d, c), kc = L.sumaItems(data, f.items, c).k;
  return h('button', { class: 'mini meal' + (f.propio ? ' propio' : ''), id: `fija-${c}-${i}`, onclick: () => editPlato(semana, i, c) },
    h('div', { class: 'mb' }, h('span', { class: 'label' }, NOMBRE_COMIDA[c]), h('span', { class: 'mt' }, f.texto || '—')),
    h('span', { class: 'mk num' }, f.items.length ? `${L.miles(kc)} kcal` : 'Sin ingredientes'));
}
function viewSemana() {
  const lun = L.addDays(L.lunesDe(L.hoy()), S.semSel * 7), w = L.semanaIdx(data, lun), semana = data.menu.semanas[w], fh = L.iso(L.hoy()), n = data.menu.semanas.length;
  const dias = semana.map((_, i) => { const d = L.addDays(lun, i); return { d, i, t: L.totalDia(data, d, { extras: false, cambios: false }), o: L.objetivo(data, d) }; });
  const conPlan = dias.filter((x) => x.t && x.t.k > 0), media = conPlan.length ? { k: conPlan.reduce((a, x) => a + x.t.k, 0) / conPlan.length, p: conPlan.reduce((a, x) => a + x.t.p, 0) / conPlan.length } : null;
  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, 'Menú'), h('p', { class: 'subtitle' }, n > 1 ? `Semana ${w + 1} de ${n} del ciclo` : 'Se repite cada semana')),
      h('div', { class: 'row', style: 'gap:10px;flex-wrap:wrap;padding:0' }, h('button', { class: 'btn sec', id: 'recomendar', onclick: () => recomendarMenu(lun, semana) }, 'Recomendar menú'), h('button', { class: 'btn sec', id: 'comidas-horarios', onclick: abrirComidasHorarios }, 'Comidas y horarios'), seg([[0, 'Esta semana'], [1, 'La que viene']], S.semSel, (v) => { S.semSel = v; render(); }))),
    media ? h('div', { class: 'card', style: 'flex-direction:row;flex-wrap:wrap;gap:12px 32px' },
      h('div', { class: 'metric' }, h('span', { class: 'label' }, 'Media diaria'), h('b', { class: 'num', id: 'media-kcal' }, `${L.miles(media.k)} kcal`)),
      h('div', { class: 'metric' }, h('span', { class: 'label' }, 'Proteína media'), h('b', { class: 'num', id: 'media-prot' }, `${L.miles(media.p)} g`)),
      h('div', { class: 'metric' }, h('span', { class: 'label' }, 'Objetivo medio'), h('b', { class: 'num' }, `${L.miles(dias.reduce((a, x) => a + x.o.kcal, 0) / 7)} kcal`))) : null,
    h('p', { class: 'mute small' }, (L.hogar(data).length ? 'Toca un plato para editarlo y, si quieres, repetirlo en otros días. Las cantidades son las del plato completo; las calorías que ves son solo las tuyas.' : 'Toca un plato para editarlo y, si quieres, repetirlo en otros días. Las cantidades son por persona.')),
    h('div', { class: 'group' }, dias.map(({ d, i, t, o }) => {
      const pct = t && o.kcal ? Math.min(100, t.k / o.kcal * 100) : 0, pasa = t && o.kcal && t.k > o.kcal * 1.05;
      return h('div', { class: 'dayrow' + (L.iso(d) === fh ? ' hoy' : '') }, h('div', { class: 'dn' }, L.DIAS[i], h('small', {}, L.fechaCorta(d) + (L.esDiaGym(data, d) ? ' · con entreno' : '')),
        t && t.k > 0 ? h('div', { class: 'dtot num' }, h('span', { class: pasa ? 'over' : '' }, `${L.miles(t.k)} kcal`), h('span', { class: 'mute', style: 'margin-left:8px;white-space:nowrap' }, `P ${L.miles(t.p)} g`), h('div', { class: 'bar' + (pasa ? ' over' : '') }, h('i', { style: `width:${pct}%` }))) : null),
        h('div', { class: 'meals' }, ['desayuno', 'media', 'comida', 'merienda', 'cena'].filter((m) => !L.FIJAS.includes(m) || L.fijoOn(data, m)).map((m) => (L.FIJAS.includes(m) ? fijaBtn(semana, i, m, d) : platoBtn(semana, i, m))))); })));
}

function anadirCompra() {
  const nom = h('input', { type: 'text', id: 'compra-nombre', placeholder: 'Ej. Papel de cocina', autocomplete: 'off' }), cant = h('input', { type: 'text', id: 'compra-cant', placeholder: 'Opcional, ej. 2 packs' });
  let sec = 'despensa';
  const chips = h('div', { class: 'chips', id: 'compra-secc', role: 'group', 'aria-label': 'Sección del súper' }), pintar = () => chips.replaceChildren(...L.SECC.map(([v, t]) => h('button', { type: 'button', class: 'chipopt', id: 'compra-s-' + v, 'aria-pressed': String(sec === v), onclick: () => { sec = v; pintar(); } }, t)));
  pintar();
  sheet({ title: 'Añadir a la lista', body: [field('Qué necesitas', nom), field('Cantidad', cant), h('div', { class: 'field' }, h('span', {}, 'Sección'), chips), h('p', { class: 'mute small' }, 'Se queda en la lista hasta que la quites, aunque cambie la semana.')], save: 'Añadir',
    onSave: () => { const n = nom.value.trim(); if (!n) return 'Escribe qué quieres añadir.'; data.extrasCompra.push({ id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), n, q: cant.value.trim(), s: sec, ok: false }); commit(); } });
  setTimeout(() => nom.focus(), 50);
}

function viewCompra() {
  const k = L.claveCompra(S.compSel), marc = (data.compra[k] && data.compra[k].marcados) || {}, tot = L.listaCompra(data, S.compSel), ids = Object.keys(tot), ex = data.extrasCompra, total = ids.length + ex.length, hechos = ids.filter((i) => marc[i]).length + ex.filter((x) => x.ok).length;
  const copiar = async () => {
    const txt = L.textoCompra(data, S.compSel);
    try { await navigator.clipboard.writeText(txt); toast('Lista copiada.'); } catch { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = txt; document.body.append(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); toast(ok ? 'Lista copiada.' : 'No se pudo copiar.'); }
  };
  const secciones = L.SECC.map(([sc, nombre]) => {
    const its = ids.filter((i) => L.ing(data, i).s === sc).sort((a, b) => L.ing(data, a).n.localeCompare(L.ing(data, b).n, 'es')), xs = ex.filter((x) => x.s === sc); if (!its.length && !xs.length) return null;
    return h('section', { class: 'stack', style: 'gap:8px' }, h('h2', { class: 'sec', style: 'font-size:17px' }, nombre),
      h('div', { class: 'group' }, its.map((i) => h('button', { class: 'item', 'aria-pressed': String(!!marc[i]), onclick: () => { const c = (data.compra[k] ||= { marcados: {} }); if (c.marcados[i]) delete c.marcados[i]; else c.marcados[i] = true; commit(); } },
        h('span', { class: 'box', 'aria-hidden': 'true', 'aria-pressed': String(!!marc[i]) }, icon('check')), h('span', { class: 'nm' }, L.ing(data, i).n), h('span', { class: 'q' }, L.cantidadCompra(data, i, tot[i])))),
        xs.map((x) => deslizable(h('div', { class: 'xrow' }, h('button', { class: 'item extra', 'aria-pressed': String(!!x.ok), onclick: () => { x.ok = !x.ok; commit(); } },
          h('span', { class: 'box', 'aria-hidden': 'true', 'aria-pressed': String(!!x.ok) }, icon('check')), h('span', { class: 'nm' }, x.n, h('span', { class: 'tag' }, 'Extra')), h('span', { class: 'q' }, x.q || '')),
          h('button', { class: 'chev xdel', 'aria-label': 'Quitar ' + x.n, onclick: () => sacar(data.extrasCompra, data.extrasCompra.indexOf(x), x.n, commit) }, '×')), () => sacar(data.extrasCompra, data.extrasCompra.indexOf(x), x.n, commit)))));
  }).filter(Boolean);
  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, 'Compra'), h('p', { class: 'subtitle num' }, `${hechos} de ${total} en el carro`)),
      seg([[2, 'Dos semanas'], [0, 'Esta semana'], [1, 'La que viene']], S.compSel, (v) => { S.compSel = v; render(); })),
    h('div', { class: 'head' }, L.hogar(data).length ? h('button', { class: 'btn plain', id: 'compra-hogar', style: 'padding-left:0;text-align:left', onclick: () => { go('ajustes'); irAj('hogar'); } }, `Para ti y ${nombresHogar()}`) : h('span'),
      h('div', {}, h('button', { class: 'btn sec', onclick: copiar, disabled: !total }, 'Copiar lista'), ' ', h('button', { class: 'btn plain', onclick: () => { data.compra[k] = { marcados: {} }; data.extrasCompra.forEach((x) => { x.ok = false; }); commit(); }, disabled: !hechos }, 'Desmarcar todo'))),
    h('button', { class: 'btn sec', id: 'add-compra', style: 'align-self:flex-start', onclick: anadirCompra }, '+ Añadir a la lista'),
    total ? h('div', { class: 'shop' }, secciones) : h('div', { class: 'card empty' }, h('p', {}, 'Tu lista aparecerá aquí cuando añadas platos al menú o cosas por tu cuenta.'), h('button', { class: 'btn', onclick: () => go('semana') }, 'Ir al menú')));
}

function viewEntreno() {
  const ses = data.entreno.sesiones, dias = L.diasEntrenoSemana(data);
  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, 'Entreno'), h('p', { class: 'subtitle' }, ses.length ? `${ses.length} ${ses.length === 1 ? 'sesión' : 'sesiones'} · ${dias} ${dias === 1 ? 'día' : 'días'} a la semana` : 'Aún no has creado sesiones')), h('button', { class: 'btn', id: 'nueva-sesion', onclick: () => editSesion(null) }, 'Nueva sesión')),
    ses.length ? h('div', { class: 'group' }, rowOf('Hora habitual del entreno', h('input', { type: 'time', id: 'hora-entreno', value: data.entreno.hora, style: 'width:7.2rem', onchange: (e) => { data.entreno.hora = e.target.value || data.entreno.hora; commit(); } }))) : null,
    ses.length ? ses.map((s) => h('section', { class: 'card' },
      h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, h('div', { class: 'label' }, `${L.diasTexto(s.dias)}${s.min ? ' · ' + s.min : ''}`), h('h2', { class: 'sec' }, s.t)), h('button', { class: 'btn sec', onclick: () => editSesion(s.id) }, 'Editar')),
      h('div', { class: 'group', style: 'box-shadow:none;background:var(--bg)' }, s.ej.map((e) => { const u = e.c ? L.ultimoPeso(data, L.slug(e.n)) : null;
        return h('div', { class: 'row', style: 'min-height:42px' }, h('span', { class: 'grow' }, e.n), h('span', { class: 'mute num small' }, e.s + (u ? ` · ${L.kgTxt(u.kg)} kg` : ''))); })))) :
      h('div', { class: 'card empty' }, h('p', {}, 'Crea tus sesiones de gimnasio y aparecerán en Hoy los días que toquen.'), h('button', { class: 'btn', onclick: () => editSesion(null) }, 'Crear la primera')));
}

function irAj(clave) { S.aj = clave; S.ajBuscar = ''; S.animar = true; render(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; }
const filaAj = (clave, ico, color, titulo, sub) => h('button', { class: 'row tap aj', id: 'aj-' + clave, onclick: () => irAj(clave) },
  h('span', { class: 'ajicon', style: `background:${color}`, 'aria-hidden': 'true' }, icon(ico)), h('div', { class: 'grow' }, titulo, sub ? h('div', { class: 'sub' }, sub) : null), h('span', { class: 'chev' }, '›'));
const tapRow = (label, sub, onclick, right) => h('button', { class: 'row tap', onclick }, h('div', { class: 'grow' }, label, sub ? h('div', { class: 'sub' }, sub) : null), right || h('span', { class: 'chev' }, '›'));
const grupo = (titulo, ...rows) => h('section', { class: 'stack', style: 'gap:8px' }, titulo ? h('div', { class: 'label', style: 'padding-left:4px' }, titulo) : null, h('div', { class: 'group' }, rows));
const txtAj = (v, on, ph, w = '13rem') => h('input', { type: 'text', value: v, placeholder: ph || '', style: `width:${w};text-align:right`, onchange: (e) => on(e.target.value.trim()) });
function subpagina(titulo, subtitulo, ...contenido) {
  return h('div', { class: 'page' }, h('div', {}, h('button', { class: 'back-aj', id: 'aj-atras', onclick: () => irAj(null) }, '‹ Ajustes'), h('h1', { class: 'title' }, titulo), subtitulo ? h('p', { class: 'subtitle' }, subtitulo) : null), ...contenido);
}

function viewAjustes() {
  const p = data.perfil, o = p.objetivos, n = Object.keys(data.ingredientes).length, u = Nube.usuario();
  switch (S.aj) {
    case 'cuenta': return subpagina('Cuenta', 'Sincroniza tu plan entre tus dispositivos', cuentaGrupo());
    case 'perfil': return subpagina('Perfil', null,
      grupo(null, rowOf('Nombre', txtAj(p.nombre, (v) => { p.nombre = v; commit(); }, 'Tu nombre')),
        rowOf('Personas en casa', h('div', { class: 'stepper' }, h('button', { 'aria-label': 'Menos personas', id: 'personas-menos', onclick: () => { const lista = L.hogar(data); if (lista.length) sacar(lista, lista.length - 1, lista[lista.length - 1].n, commit); } }, '−'),
          h('span', { class: 'num', id: 'personas-n' }, String(1 + L.hogar(data).length)),
          h('button', { 'aria-label': 'Más personas', id: 'personas-mas', onclick: () => { const lista = (data.perfil.hogar = L.hogar(data)); if (lista.length >= 8) return; const n = lista.length + 2; lista.push({ id: 'h' + Date.now().toString(36), n: `Persona ${n}`, f: 0.7, comidas: ['comida', 'cena'] }); commit(); if (lista.length === 1) toast('Ahora puedes ajustar su ración en «Con quién comes».'); } }, '+')),
          'Si comes con alguien, súmalo y ajustas su ración y qué comidas compartís.')));
    case 'objetivos': return subpagina('Objetivos diarios', 'Tus calorías y tu proteína',
      h('div', { class: 'card', style: 'gap:10px' }, h('div', {}, h('b', {}, 'Calcúlalos por ti'), h('p', { class: 'mute small' }, 'A partir de tu edad, peso, altura y actividad, con las mismas fórmulas que Macrómetro.')), h('button', { class: 'btn', id: 'calcular-objetivos', style: 'align-self:flex-start', onclick: () => abrirObjetivo() }, 'Calcular mis objetivos')),
      grupo('A mano', rowOf('Día con entreno · calorías', numField(o.gym.kcal, (v) => { o.gym.kcal = v; commit(); })), rowOf('Día con entreno · proteína (g)', numField(o.gym.prot, (v) => { o.gym.prot = v; commit(); })),
        rowOf('Día sin entreno · calorías', numField(o.sin.kcal, (v) => { o.sin.kcal = v; commit(); })), rowOf('Día sin entreno · proteína (g)', numField(o.sin.prot, (v) => { o.sin.prot = v; commit(); }))),
      grupo('Comida libre', rowOf('Calorías', numField(p.libre.kcal, (v) => { p.libre.kcal = v; commit(); }), 'Lo que cuentas cuando comes fuera del plan.'), rowOf('Proteína (g)', numField(p.libre.prot, (v) => { p.libre.prot = v; commit(); }))));
    case 'hogar': {
      const hg = L.hogar(data), nombresComidas = (cs) => (cs.length === 5 ? 'todas las comidas' : cs.length ? L.COMIDAS_HOGAR.filter(([k]) => cs.includes(k)).map(([, t]) => t.toLowerCase()).join(', ') : 'ninguna comida');
      return subpagina('Con quién comes', 'Tus platos llevan las cantidades de todos los que comen. Aquí dices quién más come contigo y cuánto.',
        hg.length ? h('div', { class: 'group', id: 'hogar-lista' }, hg.map((x, i) => deslizable(tapRow(x.n, `${Math.round(x.f * 100)} % de tu ración · ${nombresComidas(x.comidas)}`, () => editarPersona(x)), () => sacar(data.perfil.hogar, i, x.n, commit))))
          : h('p', { class: 'mute small', id: 'hogar-vacio', style: 'padding-left:4px' }, 'Ahora comes solo. Si compartes alguna comida con alguien, añádelo y la lista de la compra se ajusta sola.'),
        h('div', { class: 'row', style: 'padding:0;gap:10px;flex-wrap:wrap' }, h('button', { class: 'btn', id: 'hogar-anadir', onclick: () => editarPersona(null) }, 'Añadir persona'),),
        h('p', { class: 'mute small' }, 'Las cantidades de cada plato son las de todos: lo que cocinas y compras, tal cual. Tus calorías y macros se calculan solo con tu parte. Lo que va por unidades (fajitas, huevos…) se reparte en piezas enteras.'));
    }
    case 'platos': {
      const ps = data.platosPropios.slice().sort((x, y) => x.t.localeCompare(y.t, 'es')), delMenu = platosGuardados('comida').concat(platosGuardados('cena')).filter((x, k, a) => !data.platosPropios.some((p) => p.t === x.t) && a.findIndex((y) => y.t === x.t) === k);
      return subpagina('Platos', 'Arma platos con tus ingredientes y úsalos en cualquier comida',
        h('div', { class: 'row', style: 'padding:0;gap:10px;flex-wrap:wrap' }, h('button', { class: 'btn', id: 'plato-nuevo', onclick: () => crearPlato() }, 'Nuevo plato'),
          delMenu.length ? h('button', { class: 'btn sec', id: 'platos-importar', onclick: () => { delMenu.forEach((x) => data.platosPropios.push({ t: x.t, items: clone(x.items) })); commit(); toast(`${delMenu.length} ${delMenu.length === 1 ? 'plato guardado' : 'platos guardados'}.`); } }, 'Guardar los de mi menú') : null),
        ps.length ? h('div', { class: 'group', id: 'platos-lista' }, ps.map((x) => deslizable(tapRow(x.t, macroTxt(L.sumaItems(data, x.items, 'comida')), () => crearPlato(null, x)), () => borrarPlato(x)))) : h('p', { class: 'mute small', id: 'platos-vacio', style: 'padding-left:4px' }, 'Aún no tienes platos guardados. Crea uno nuevo' + (delMenu.length ? ' o guarda los que ya tienes en tu menú.' : '.')));
    }
    case 'datos': return subpagina('Datos y copias', 'Tu plan y tus registros',
      grupo(null, tapRow('Guardar una copia', 'Exporta todo a un archivo.', async () => { if (await store.exportar(data)) toast('Copia guardada.'); }),
        tapRow('Recuperar una copia', 'Sustituye lo actual por un archivo guardado.', async () => {
          const raw = await store.importar(); if (!raw) return; if (typeof raw !== 'object' || !raw.menu) return toast('Ese archivo no parece una copia de Rutina.');
          confirmSheet('¿Recuperar esta copia?', 'Se sustituirán tu plan y tus registros actuales.', 'Recuperar', () => { data = normalize(raw); data.perfil.listo = true; commit(); toast('Copia recuperada.'); }); }),
        tapRow('Cargar el plan de ejemplo', 'Cambia tu menú y entrenos por los de ejemplo. Tus registros se conservan.', () => confirmSheet('¿Cargar el plan de ejemplo?', 'Se sustituirán tu menú, ingredientes y sesiones.', 'Cargar', () => {
          const T = makeTemplate(); data.ingredientes = T.ingredientes; data.menu = T.menu; data.entreno = T.entreno; commit(); }))),
      grupo(null, tapRow('Borrar todos mis datos', 'No se puede deshacer.', () => confirmSheet('¿Borrar todo?', Nube.haySesion() ? 'Se eliminarán tu plan, tus registros y tus ajustes, tanto de este ordenador como de tu cuenta en la nube.' : 'Se eliminarán tu plan, tus registros y tus ajustes de este ordenador.', 'Borrar todo', async () => { if (Nube.haySesion()) { try { await Nube.borrarNube(); } catch { toast('No se pudo borrar la copia de la nube. Inténtalo con conexión.'); return; } } data = emptyData(); store.save(data); S.tab = 'hoy'; S.aj = null; render(); bienvenida(); }))));
    case 'acerca': return subpagina('Acerca de Rutina', null,
      grupo(null, rowOf('Versión', h('span', { class: 'mute num' }, S.version || 'Web')),
        h('a', { class: 'row tap', href: 'https://rutina-fitness.netlify.app/', target: '_blank', rel: 'noopener' }, h('div', { class: 'grow' }, 'Sitio web'), h('span', { class: 'chev' }, '›')),
        h('a', { class: 'row tap', href: 'https://rutina-fitness.netlify.app/privacidad.html', target: '_blank', rel: 'noopener' }, h('div', { class: 'grow' }, 'Política de privacidad'), h('span', { class: 'chev' }, '›'))));
    default: return h('div', { class: 'page' },
      h('div', {}, h('h1', { class: 'title' }, 'Ajustes')),
      grupo(null, Nube.nubeActiva() ? filaAj('cuenta', 'cuenta', '#0a84ff', 'Cuenta', u ? u.email : 'Sin iniciar sesión') : null, filaAj('perfil', 'perfil', '#8e8e93', 'Perfil', p.nombre || 'Tu nombre y tu ciudad')),
      grupo(null, filaAj('objetivos', 'objetivos', '#ff9f0a', 'Objetivos diarios', `${L.miles(o.gym.kcal)} / ${L.miles(o.sin.kcal)} kcal · ${o.gym.prot} g de proteína`)),
      grupo(null, ...(L.hogar(data).length ? [filaAj('hogar', 'hogar', '#34c759', 'Con quién comes', `Tú y ${nombresHogar()}`)] : []), filaAj('platos', 'platos', '#ff6b35', 'Platos', data.platosPropios.length ? `${data.platosPropios.length} ${data.platosPropios.length === 1 ? 'plato guardado' : 'platos guardados'}` : 'Crea tus platos con ingredientes')),
      grupo(null, filaAj('datos', 'datos', '#5e5ce6', 'Datos y copias', 'Copia de seguridad y borrado'), filaAj('acerca', 'acerca', '#8e8e93', 'Acerca de Rutina', `Versión ${S.version || 'Web'}`)));
  }
}

/* ---------- logo ---------- */
function logo(px = 88) {
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
const mostrarInicio = () => Nube.nubeActiva() && !data.perfil.listo && !Nube.haySesion() && !S.saltarInicio;
// Después de entrar: si la cuenta ya tenía plan se carga solo; si es nueva, se pasa a la bienvenida.
// En el iPhone, tras Google queda una ventanita encima: se avisa de cómo volver a la app
function mensajeVolver() {
  sheet({ title: 'Sesión iniciada', save: 'Entendido', body: [h('p', {}, 'Ya has entrado con Google. Si ves arriba una barra con «Hecho», púlsala para volver a Rutina: te estará esperando con la sesión iniciada.')], onSave: () => {} });
}
async function trasEntrar() {
  S.nube = null; S.auth = null; await Sync.sincronizar(); S.saltarInicio = true; render();
  if (!data.perfil.listo) bienvenida(); else toast('Sesión iniciada.');
}
function viewInicio() {
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
function bannerUpdate() {
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
const hace = (ms) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'ahora mismo' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
function textoEstado() {
  const n = S.nube || {};
  if (n.estado === 'sincronizando') return 'Sincronizando…';
  if (n.estado === 'offline') return 'Sin conexión. Se sincronizará cuando vuelvas a tener internet.';
  if (n.estado === 'error') return n.msg || 'No se pudo sincronizar.';
  const ult = n.ultima || (data.meta || {}).ultima;
  return ult ? `Sincronizado ${hace(ult)}` : 'Aún no sincronizado';
}
function cuentaGrupo() {
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
const G = (px = 18) => {
  const e = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
  const svg = e('svg', { viewBox: '0 0 48 48', width: px, height: px, 'aria-hidden': 'true' });
  svg.append(e('path', { fill: '#EA4335', d: 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z' }),
    e('path', { fill: '#4285F4', d: 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z' }),
    e('path', { fill: '#FBBC05', d: 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z' }),
    e('path', { fill: '#34A853', d: 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z' }));
  return svg;
};
const botonGoogle = (onclick) => h('button', { class: 'gbtn', id: 'auth-google', type: 'button', onclick }, G(18), h('span', {}, 'Continuar con Google'));

function irAuth(pantalla) { sheets.slice().forEach((x) => x.close()); S.bienvenida = null; S.auth = pantalla; S.authMsg = ''; render(); }
function cerrarAuth() { S.auth = null; render(); if (!data.perfil.listo && !mostrarInicio() && !Nube.haySesion()) bienvenida(); }

function viewAuth() {
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

function conflictoSheet({ remoto }) {
  if (S.conflicto) return; S.conflicto = true;
  const fecha = new Date(remoto.actualizado).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' });
  const elegir = async (c) => { S.conflicto = false; sh.close(); await Sync.resolver(c, remoto); toast(c === 'nube' ? 'Se ha cargado lo guardado en tu cuenta.' : 'Se ha guardado lo de este ordenador en tu cuenta.'); };
  const sh = sheet({ title: 'Tienes datos en dos sitios', dismissible: false, body: [
    h('p', { class: 'mute' }, `Tu cuenta ya tiene un plan guardado (${fecha}) y este ordenador también tiene datos distintos. Elige cuál conservar. El otro se sustituirá.`),
    h('button', { class: 'btn wide', onclick: () => elegir('nube') }, 'Usar los de mi cuenta'),
    h('button', { class: 'btn sec wide', onclick: () => elegir('local') }, 'Usar los de este ordenador')] });
}

/* ---------- estructura ---------- */
const TABS = [['compra', 'Compra', viewCompra], ['semana', 'Menú', viewSemana], ['hoy', 'Hoy', viewHoy], ['entreno', 'Entreno', viewEntreno], ['ajustes', 'Ajustes', viewAjustes]];
function go(tab) { if (tab === 'ajustes') S.aj = null; S.tab = tab; S.animar = true; render(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; }
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
function render() {
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
  data = normalize(raw);
  if (Nube.nubeActiva()) { await Nube.cargarSesion(); try { if (await Nube.completarGoogleWeb()) S.vuelveDeGoogle = true; } catch (e) { S.errorInicio = e.message; } }
  if (raw && raw.menu && !raw.perfil) data.perfil.listo = true;
  if (window.rutina && window.rutina.version) window.rutina.version().then((v) => { S.version = v; });
  render();
  if (!data.perfil.listo && !mostrarInicio()) bienvenida();
  if (Nube.nubeActiva()) {
    Sync.init({ getData: () => data, setData: (d) => { data = d; if (S.bienvenida) { S.bienvenida.close(); S.bienvenida = null; } }, guardar: () => store.save(data), render, onConflicto: conflictoSheet,
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
