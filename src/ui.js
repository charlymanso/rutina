// Piezas de interfaz reutilizables que no dependen de los datos: crear elementos, iconos, hojas modales, avisos, deslizar para borrar y gráficas.
import * as L from './logic.js';

/* ---------- utilidades de DOM ---------- */
export function h(tag, props, ...kids) {
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
export const NS = 'http://www.w3.org/2000/svg';
export const ICONS = {
  hoy: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4' }]],
  semana: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 3 }], ['path', { d: 'M3 10h18M8 3v4M16 3v4' }]],
  compra: [['path', { d: 'M3 4h2l2.4 11h10.2L20 8H6.2' }], ['circle', { cx: 9, cy: 19.5, r: 1.3 }], ['circle', { cx: 17, cy: 19.5, r: 1.3 }]],
  entreno: [['path', { d: 'M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11' }]],
  ajustes: [['path', { d: 'M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0' }], ['circle', { cx: 15, cy: 6, r: 2.2 }], ['circle', { cx: 9, cy: 12, r: 2.2 }], ['circle', { cx: 17, cy: 18, r: 2.2 }]],
  check: [['path', { d: 'M3 8.5l3.2 3.2L13 4.8' }]],
  cuenta: [['circle', { cx: 12, cy: 8, r: 4 }], ['path', { d: 'M4.5 20c0-3.8 3.4-6 7.5-6s7.5 2.2 7.5 6' }]],
  perfil: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 3 }], ['circle', { cx: 9, cy: 11, r: 2 }], ['path', { d: 'M6.5 16c.4-1.4 1.4-2 2.5-2s2.1.6 2.5 2M14 10h4M14 14h3' }]],
  peso: [['path', { d: 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM12 9v3l2 1' }]],
  objetivos: [['circle', { cx: 12, cy: 12, r: 9 }], ['circle', { cx: 12, cy: 12, r: 5 }], ['circle', { cx: 12, cy: 12, r: 1.3 }]],
  ingredientes: [['path', { d: 'M4.5 11h15l-1.6 8a2 2 0 0 1-2 1.6H8.1a2 2 0 0 1-2-1.6L4.5 11z' }], ['path', { d: 'M8 11c0-3 1.6-5 4-5s4 2 4 5' }]],
  datos: [['ellipse', { cx: 12, cy: 6, rx: 7, ry: 3 }], ['path', { d: 'M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6' }]],
  barcode: [['path', { d: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 9v6M11 9v6M14 9v6M17 9v6' }]],
  hogar: [['circle', { cx: 9, cy: 8, r: 3.2 }], ['path', { d: 'M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5' }], ['circle', { cx: 17, cy: 9, r: 2.5 }], ['path', { d: 'M16 14.2c2.6-.3 4.5 1.3 5 4.3' }]],
  ejercicios: [['path', { d: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12' }]],
  platos: [['path', { d: 'M6 3v6a2 2 0 0 0 4 0V3M8 3v18M17 21V3c-2 1-3.5 3.5-3.5 7 0 1.5 1 2.5 3.5 2.5' }]],
  acerca: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 11v5.5' }], ['circle', { cx: 12, cy: 7.8, r: .7 }]],
};
export function icon(name) {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', name === 'check' ? '0 0 16 16' : '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  for (const [t, a] of ICONS[name]) { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); s.append(e); }
  return s;
}
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const num = (v, def = 0) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : def; };


export function toast(msg, deshacer) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg, deshacer ? h('button', { class: 'toast-undo', type: 'button', onclick: () => { t.remove(); deshacer(); } }, 'Deshacer') : null);
  document.body.append(t); setTimeout(() => t.remove(), deshacer ? 6000 : 3200);
}
// Quita un elemento de una lista y ofrece deshacerlo.
export function sacar(lista, i, nombre, despues) {
  const [x] = lista.splice(i, 1); despues();
  toast(`“${nombre}” quitado.`, () => { lista.splice(Math.min(i, lista.length), 0, x); despues(); });
}

/* Deslizar hacia la izquierda (móvil) para descubrir "Borrar". Con ratón se sigue usando la × de cada fila. */
export let swipeAbierto = null;
export function deslizable(contenido, onBorrar, etiqueta = 'Borrar', clase = '') {
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
export const sheets = [];
export function sheet({ title, body, save = 'Guardar', onSave, extra, cancel = 'Cancelar', dismissible = true, clase = '' }) {
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
export function confirmSheet(title, msg, okLabel, onOk) {
  const s = sheet({ title, body: h('p', { class: 'mute' }, msg), save: okLabel, onSave: () => { onOk(); } });
  return s;
}

/* ---------- campos reutilizables ---------- */
export const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);
export const swt = (on, onclick, label) => h('button', { class: 'switch', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label, onclick });
export const seg = (opts, current, onpick) => h('div', { class: 'seg', role: 'group' }, opts.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(current === v), onclick: () => onpick(v) }, t)));
export const rowOf = (label, control, sub) => h('div', { class: 'row' }, h('div', { class: 'grow' }, label, sub ? h('div', { class: 'sub' }, sub) : null), control);

/* Gráfica de línea pequeña (una sola serie): evolución de un valor por fechas. Cada punto dice su valor al tocarlo. */
export function graficaLinea(puntos, unidad) {
  const W = 320, H = 96, mx = 10, my = 12, e = (t, a, txt) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (txt != null) n.textContent = txt; return n; };
  const vs = puntos.map((p) => p.v), min = Math.min(...vs), max = Math.max(...vs), rango = max - min || 1, n = puntos.length;
  const X = (i) => mx + (n === 1 ? (W - 2 * mx) / 2 : i * (W - 2 * mx) / (n - 1)), Y = (v) => H - my - (v - min) / rango * (H - 2 * my - 14);
  const svg = e('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafica', role: 'img', 'aria-label': `De ${L.kgTxt(vs[0])} a ${L.kgTxt(vs[n - 1])} ${unidad} en ${n} registros` });
  svg.append(e('line', { x1: mx, x2: W - mx, y1: H - my, y2: H - my, class: 'g-eje' }), e('polyline', { points: puntos.map((p, i) => `${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' '), class: 'g-linea' }));
  const eti = e('text', { x: W - mx, y: 11, 'text-anchor': 'end', class: 'g-txt' }, `${L.kgTxt(vs[n - 1])} ${unidad}`); svg.append(eti);
  puntos.forEach((p, i) => { const ult = i === n - 1, c = e('circle', { cx: X(i), cy: Y(p.v), r: ult ? 4 : 2.5, class: 'g-punto' + (ult ? ' ult' : '') }), zona = e('circle', { cx: X(i), cy: Y(p.v), r: 14, class: 'g-zona' });
    zona.append(e('title', {}, `${L.fechaCorta(L.parseISO(p.f))}: ${L.kgTxt(p.v)} ${unidad}`)); const ver = () => { eti.textContent = `${L.fechaCorta(L.parseISO(p.f))} · ${L.kgTxt(p.v)} ${unidad}`; };
    zona.addEventListener('pointerenter', ver); zona.addEventListener('click', ver); svg.append(c, zona); });
  return svg;
}
