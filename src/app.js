import * as L from './logic.js';
import { makeTemplate, emptyData, normalize } from './template.js';
import { cargarClima } from './weather.js';
import { store } from './store.js';
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
const S = { tab: 'hoy', semSel: 0, compSel: 2, gymOpen: null, update: null, updateOculto: false, upd: null, autoUpdate: false, saltarInicio: false, animar: false, version: '', auth: null, authMsg: '', authForm: { correo: '', clave: '', clave2: '' } };
const root = document.getElementById('root');
let saveTimer;
function commit() {
  data.meta = data.meta || {}; data.meta.sucio = true; data.meta.modificado = Date.now();
  clearTimeout(saveTimer); saveTimer = setTimeout(() => store.save(data), 200); render(); Sync.programar();
}
function guardarLocal() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.save(data), 200); render(); } // cambios que no son del usuario (p. ej. el tiempo): no se sincronizan
window.addEventListener('beforeunload', () => store.save(data));

function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), 3200);
}

/* ---------- hojas modales ---------- */
const sheets = [];
function sheet({ title, body, save = 'Guardar', onSave, extra, cancel = 'Cancelar', dismissible = true }) {
  const err = h('div', { class: 'err', role: 'alert' });
  const api = { close() { veil.remove(); const i = sheets.indexOf(api); if (i >= 0) sheets.splice(i, 1); } };
  const doSave = () => { const r = onSave && onSave(); if (typeof r === 'string') { err.textContent = r; return; } if (r !== false) api.close(); };
  const veil = h('div', { class: 'veil', onmousedown: (e) => { if (e.target === veil && dismissible) api.close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', {}, dismissible ? h('button', { class: 'btn plain', onclick: api.close }, cancel) : h('span'), h('h3', {}, title), onSave ? h('button', { class: 'btn', onclick: doSave }, save) : h('span')),
      h('div', { class: 'body' }, body, err),
      extra ? h('footer', {}, extra) : null));
  api.el = veil; api.err = err; sheets.push(api); document.body.append(veil);
  const first = veil.querySelector('input[type=text],input[type=number],select'); if (first) first.focus();
  return api;
}
function confirmSheet(title, msg, okLabel, onOk) {
  const s = sheet({ title, body: h('p', { class: 'mute' }, msg), save: okLabel, onSave: () => { onOk(); } });
  return s;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.auth && !sheets.length) { const a = document.getElementById('auth-atras'); if (a) a.click(); return; } if (e.key === 'Escape' && sheets.length && sheets[sheets.length - 1].el.querySelector('header .btn.plain')) sheets[sheets.length - 1].close(); });

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
  data.menu.semanas.forEach((w) => w.forEach((d) => ['comida', 'cena'].forEach((m) => { if (d[m] && (d[m].items || []).some((i) => i[0] === id)) n++; })));
  Object.values(data.menu.fijos).forEach((f) => { if ((f.items || []).some((i) => i[0] === id)) n++; });
  return n;
};

/* Editor de lista de ingredientes con cantidades (para platos y comidas fijas). */
function itemsEditor(items) {
  const box = h('div', { class: 'stack', style: 'gap:10px' });
  function draw() {
    box.replaceChildren();
    if (!ingOptions().length) box.append(h('p', { class: 'mute small' }, 'Todavía no tienes ingredientes. Crea el primero para poder añadirlo.'));
    items.forEach((it, i) => {
      const sel = h('select', { 'aria-label': 'Ingrediente', value: it[0], onchange: (e) => {
        if (e.target.value === '__new') { e.target.value = it[0]; editIngrediente(null, (id) => { it[0] = id; draw(); }); return; }
        it[0] = e.target.value; draw();
      } },
        !data.ingredientes[it[0]] ? h('option', { value: it[0] }, it[0]) : null,
        ingOptions().map(([id, g]) => h('option', { value: id }, g.n)), h('option', { value: '__new' }, 'Nuevo ingrediente…'));
      box.append(h('div', { class: 'itemrow' }, sel,
        h('input', { type: 'number', min: 0, step: 'any', value: String(it[1]), 'aria-label': 'Cantidad', oninput: (e) => { it[1] = num(e.target.value); } }),
        h('span', { class: 'u' }, L.ing(data, it[0]).u),
        h('button', { class: 'x', 'aria-label': 'Quitar', onclick: () => { items.splice(i, 1); draw(); } }, '×')));
    });
    box.append(h('button', { class: 'btn sec', style: 'align-self:flex-start', onclick: () => {
      if (!ingOptions().length) { editIngrediente(null, (id) => { items.push([id, L.ing(data, id).u === 'ud' ? 1 : 100]); draw(); }); return; }
      const id = ingOptions()[0][0]; items.push([id, L.ing(data, id).u === 'ud' ? 1 : 100]); draw();
    } }, '+ Ingrediente'));
  }
  draw();
  return box;
}

/* ---------- editores ---------- */
function editIngrediente(id, onDone) {
  const g = id ? clone(data.ingredientes[id]) : { n: '', u: 'g', k: 0, p: 0, s: 'despensa', pl: '' };
  const nombre = h('input', { type: 'text', value: g.n, placeholder: 'Ej. Pechuga de pollo' });
  const unidad = h('select', { value: g.u, onchange: () => { lk.firstChild.textContent = lbl(); pl.hidden = unidad.value !== 'ud'; } }, [['g', 'Gramos (g)'], ['ml', 'Mililitros (ml)'], ['ud', 'Unidades']].map(([v, t]) => h('option', { value: v }, t)));
  const lbl = () => (unidad.value === 'ud' ? 'Calorías por unidad' : `Calorías por 100 ${unidad.value}`);
  const kcal = h('input', { type: 'number', min: 0, step: 'any', value: String(g.k) });
  const prot = h('input', { type: 'number', min: 0, step: 'any', value: String(g.p) });
  const lk = field(lbl(), kcal);
  const seccion = h('select', { value: g.s }, L.SECC.map(([v, t]) => h('option', { value: v }, t)));
  const plural = h('input', { type: 'text', value: g.pl || '', placeholder: 'Ej. huevos' });
  const pl = field('Plural (para la lista)', plural); pl.hidden = g.u !== 'ud';
  sheet({ title: id ? 'Editar ingrediente' : 'Nuevo ingrediente',
    body: [field('Nombre', nombre), field('Se mide en', unidad), lk, field(unidad.value === 'ud' ? 'Proteína por unidad (g)' : 'Proteína por 100 (g)', prot), pl, field('Sección del súper', seccion)],
    onSave: () => {
      const n = nombre.value.trim(); if (!n) return 'Escribe un nombre.';
      let nid = id; if (!nid) { const base = L.slug(n) || 'ingrediente'; nid = base; let c = 2; while (data.ingredientes[nid]) nid = `${base}-${c++}`; }
      data.ingredientes[nid] = { n, u: unidad.value, k: num(kcal.value), p: num(prot.value), s: seccion.value, ...(unidad.value === 'ud' && plural.value.trim() ? { pl: plural.value.trim() } : {}) };
      commit(); onDone && onDone(nid);
    },
    extra: id ? h('button', { class: 'btn danger', onclick: () => {
      const n = usoIngrediente(id); if (n) { toast(`Se usa en ${n} ${n === 1 ? 'plato' : 'platos'}. Quítalo de ahí primero.`); return; }
      confirmSheet('¿Borrar ingrediente?', `Se eliminará “${g.n}”.`, 'Borrar', () => { delete data.ingredientes[id]; commit(); sheets.slice().forEach((s) => s.close()); });
    } }, 'Borrar') : null });
}

function editPlato(semana, i, m) {
  const orig = semana[i][m], w = clone(orig || { t: '', items: [] }); if (!w.items) w.items = [];
  const nombre = h('input', { type: 'text', value: w.t === 'Comida libre' && w.libre ? '' : w.t, placeholder: m === 'comida' ? 'Ej. Pollo con arroz' : 'Ej. Tortilla de espinacas' });
  const cuerpo = h('div', { class: 'stack', style: 'gap:14px' });
  const edit = itemsEditor(w.items);
  function draw() {
    cuerpo.replaceChildren(
      h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, 'Comida libre', h('div', { class: 'sub' }, 'Sin ingredientes: cuenta con tus calorías de comida libre.')),
        swt(w.libre, () => { w.libre = !w.libre; draw(); }, 'Comida libre')),
      ...(w.libre ? [] : [field('Nombre del plato', nombre), h('div', { class: 'label' }, 'Ingredientes por persona'), edit]));
  }
  draw();
  sheet({ title: `${L.DIAS[i]} · ${m === 'comida' ? 'Comida' : 'Cena'}`, body: cuerpo,
    onSave: () => {
      if (w.libre) { semana[i][m] = { t: 'Comida libre', libre: true, items: [] }; commit(); return; }
      const t = nombre.value.trim(); if (!t) return 'Escribe el nombre del plato.';
      semana[i][m] = { t, items: w.items.filter((it) => it[1] > 0 && data.ingredientes[it[0]]) }; commit();
    },
    extra: orig ? h('button', { class: 'btn danger', onclick: () => { semana[i][m] = null; commit(); sheets.slice().forEach((s) => s.close()); } }, 'Quitar plato') : null });
}

function editFijo(clave, nombre) {
  const f = clone(data.menu.fijos[clave]); if (!f.items) f.items = [];
  const texto = h('input', { type: 'text', value: f.texto }), hora = h('input', { type: 'time', value: f.hora });
  sheet({ title: nombre, body: [field('Descripción', texto), field('Hora', hora), h('div', { class: 'label' }, 'Ingredientes por persona'), itemsEditor(f.items)],
    onSave: () => { data.menu.fijos[clave] = { ...f, texto: texto.value.trim() || nombre, hora: hora.value || f.hora, items: f.items.filter((it) => it[1] > 0 && data.ingredientes[it[0]]) }; commit(); } });
}

function editSesion(dia) {
  const orig = dia != null ? L.sesionGym(data, dia) : null;
  const s = orig ? clone(orig) : { dia: Array.from({ length: 7 }, (_, i) => i).find((i) => !L.sesionGym(data, i)) ?? 0, t: '', min: '60 min', ej: [] };
  const dsel = h('select', { value: String(s.dia) }, L.DIAS.map((d, i) => h('option', { value: String(i) }, d)));
  const t = h('input', { type: 'text', value: s.t, placeholder: 'Ej. Pierna y core' }), min = h('input', { type: 'text', value: s.min });
  const lista = h('div', { class: 'stack', style: 'gap:10px' });
  function draw() {
    lista.replaceChildren(...s.ej.map((e, i) => h('div', { class: 'exrow' },
      h('input', { type: 'text', value: e.n, placeholder: 'Ejercicio', 'aria-label': 'Ejercicio', oninput: (x) => { e.n = x.target.value; } }),
      h('input', { type: 'text', value: e.s, placeholder: '4×8', 'aria-label': 'Series y repeticiones', oninput: (x) => { e.s = x.target.value; } }),
      h('button', { class: 'btn ' + (e.c ? '' : 'sec'), style: 'padding:6px 10px;font-size:13px', title: 'Apuntar kilos', onclick: () => { e.c = !e.c; draw(); } }, e.c ? 'kg ✓' : 'kg'),
      h('button', { class: 'x', style: 'color:var(--faint);font-size:20px', 'aria-label': 'Quitar', onclick: () => { s.ej.splice(i, 1); draw(); } }, '×'))),
      h('button', { class: 'btn sec', style: 'align-self:flex-start', onclick: () => { s.ej.push({ n: '', s: '3×10', c: true }); draw(); } }, '+ Ejercicio'));
  }
  draw();
  sheet({ title: orig ? 'Editar sesión' : 'Nueva sesión', body: [field('Día', dsel), field('Nombre', t), field('Duración', min), h('div', { class: 'label' }, 'Ejercicios'), lista],
    onSave: () => {
      const d = +dsel.value; if (!t.value.trim()) return 'Escribe el nombre de la sesión.';
      if (L.sesionGym(data, d) && d !== dia) return `Ya tienes una sesión el ${L.DIAS[d].toLowerCase()}.`;
      const nueva = { dia: d, t: t.value.trim(), min: min.value.trim(), ej: s.ej.filter((e) => e.n.trim()).map((e) => ({ n: e.n.trim(), s: e.s.trim(), c: !!e.c })) };
      data.entreno.sesiones = data.entreno.sesiones.filter((x) => x.dia !== dia && x.dia !== d).concat(nueva).sort((a, b) => a.dia - b.dia); commit();
    },
    extra: orig ? h('button', { class: 'btn danger', onclick: () => confirmSheet('¿Borrar sesión?', `Se eliminará “${orig.t}”. Tus kilos anotados se conservan.`, 'Borrar', () => { data.entreno.sesiones = data.entreno.sesiones.filter((x) => x.dia !== dia); commit(); sheets.slice().forEach((x) => x.close()); }) }, 'Borrar') : null });
}

function addAgenda(f) {
  const hora = h('input', { type: 'time', value: '09:00' }), t = h('input', { type: 'text', placeholder: 'Ej. Dentista' });
  sheet({ title: 'Nuevo recordatorio', body: [field('Qué', t), field('Hora', hora)], save: 'Añadir',
    onSave: () => { if (!t.value.trim()) return 'Escribe qué tienes que hacer.'; (data.agenda[f] ||= []).push({ hora: hora.value, titulo: t.value.trim() }); commit(); } });
}

function bienvenida() {
  const T = makeTemplate();
  const nombre = h('input', { type: 'text', placeholder: 'Tu nombre' }), ciudad = h('input', { type: 'text', placeholder: 'Para ver el tiempo (opcional)' });
  const kcal = h('input', { type: 'number', value: String(T.perfil.objetivos.gym.kcal) }), prot = h('input', { type: 'number', value: String(T.perfil.objetivos.gym.prot) });
  const aplicar = (base) => {
    const k = Math.max(0, num(kcal.value)), p = Math.max(0, num(prot.value));
    data = base; data.perfil = { ...data.perfil, listo: true, nombre: nombre.value.trim(), ciudad: ciudad.value.trim(), objetivos: { gym: { kcal: k, prot: p }, sin: { kcal: Math.round(k * 0.92), prot: p } } };
    sheets.slice().forEach((s) => s.close()); commit(); refreshClima();
  };
  S.bienvenida = sheet({ title: 'Bienvenido a Rutina', dismissible: false,
    body: [h('div', { class: 'hero' }, h('div', { class: 'big' }, 'Tu día, claro y a tu ritmo'), h('p', { class: 'mute' }, 'Comidas, compra y entrenos en un solo sitio. Todo se guarda en este ordenador.')),
      field('¿Cómo te llamas?', nombre), field('Ciudad', ciudad), h('div', { class: 'pair' }, field('Calorías al día', kcal), field('Proteína al día (g)', prot)),
      h('p', { class: 'mute small' }, 'Son solo una referencia. Puedes cambiarlos cuando quieras en Ajustes.'),
      h('button', { class: 'btn wide', onclick: () => aplicar(makeTemplate()) }, 'Empezar con un plan de ejemplo'),
      h('button', { class: 'btn sec wide', onclick: () => aplicar(emptyData()) }, 'Empezar en blanco'),
      Nube.nubeActiva() ? h('button', { class: 'btn plain wide', onclick: () => irAuth('entrar') }, 'Ya tengo una cuenta') : null] });
}

/* ---------- acciones ---------- */
function diaReg(f) { return (data.dias[f] ||= { hechos: {} }); }
function toggleHecho(f, k) { const d = diaReg(f); d.hechos = d.hechos || {}; if (d.hechos[k]) delete d.hechos[k]; else d.hechos[k] = true; commit(); }
function setEj(f, k, patch) { const d = diaReg(f); d.gym = d.gym || {}; d.gym[k] = { ...(d.gym[k] || {}), ...patch }; commit(); }
async function refreshClima() {
  const c = await cargarClima(data);
  if (c && JSON.stringify(c) !== JSON.stringify(data.clima)) { data.clima = c; guardarLocal(); }
}

/* ---------- vistas ---------- */
function slotEl(s, f, ahora, hecho) {
  return h('div', { class: 'slot' + (hecho ? ' hecho' : '') + (s.k === ahora ? ' ahora' : '') },
    h('span', { class: 'hora' }, s.hora),
    h('div', {}, h('span', { class: 'kind' }, s.kind), h('h3', {}, s.title), s.det ? h('p', { class: 'det' }, s.det) : null, s.extra || null),
    h('button', { class: 'chk', 'aria-pressed': String(hecho), 'aria-label': (hecho ? 'Desmarcar: ' : 'Marcar como hecho: ') + s.kind, onclick: () => toggleHecho(f, s.k) }, icon('check')));
}

function bloqueGym(ses, f) {
  const reg = L.regGym(data, f), abierto = S.gymOpen === f, hechos = ses.ej.filter((e) => reg[L.slug(e.n)] && reg[L.slug(e.n)].hecho).length;
  const lista = h('div', { class: 'ejs' }, ses.ej.map((e) => {
    const k = L.slug(e.n), x = reg[k] || {}, u = e.c ? L.ultimoPeso(data, k, f) : null;
    const dolor = h('select', { 'aria-label': 'Dolor de 0 a 10', class: L.semaforo(x.dolor), value: x.dolor == null ? '' : String(x.dolor), onchange: (ev) => {
      const v = ev.target.value === '' ? null : +ev.target.value; if (v != null && v >= 5) toast('Dolor de 5 o más: para ese ejercicio y cámbialo.'); setEj(f, k, { dolor: v }); } },
      h('option', { value: '' }, '–'), Array.from({ length: 11 }, (_, n) => h('option', { value: String(n) }, String(n))));
    return h('div', { class: 'e' + (x.hecho ? ' hecho' : '') },
      h('button', { class: 'box', 'aria-pressed': String(!!x.hecho), 'aria-label': (x.hecho ? 'Desmarcar ' : 'Marcar ') + e.n, onclick: () => setEj(f, k, { hecho: !x.hecho }) }, icon('check')),
      h('div', { class: 'nm' }, h('span', {}, e.n), h('span', { class: 'sch' }, e.s)),
      h('div', { class: 'det2' },
        e.c ? h('label', {}, 'kg', h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: x.kg != null ? L.kgTxt(x.kg) : '', placeholder: u ? L.kgTxt(u.kg) : '', onchange: (ev) => {
          const v = ev.target.value.trim(); if (v === '') return setEj(f, k, { kg: null });
          const n = num(v, NaN); if (!Number.isFinite(n) || n < 0 || n > 999) return toast('Escribe los kilos como número, por ejemplo 82,5.'); setEj(f, k, { kg: Math.round(n * 100) / 100 }); } })) : null,
        h('label', {}, 'dolor', dolor), u ? h('span', {}, `última vez ${L.kgTxt(u.kg)} kg`) : null));
  }));
  return [h('button', { class: 'open-btn', 'aria-expanded': String(abierto), onclick: () => { S.gymOpen = abierto ? null : f; render(); } },
    `${abierto ? 'Cerrar sesión' : 'Abrir sesión'} · ${hechos} de ${ses.ej.length} hechos`), abierto ? lista : null];
}

function resumenCard(f) {
  const c = data.clima, ag = (data.agenda[f] || []).map((a, i) => ({ ...a, i })).sort((a, b) => L.minutos(a.hora) - L.minutos(b.hora));
  let tiempo;
  if (!data.perfil.ciudad) tiempo = h('p', { class: 'mute small' }, 'Añade tu ciudad en Ajustes para ver el tiempo de hoy.');
  else if (!c) tiempo = h('p', { class: 'mute small' }, 'El tiempo aparecerá cuando haya conexión.');
  else if (c.error) tiempo = h('p', { class: 'mute small' }, c.error);
  else tiempo = h('div', {}, h('div', { class: 'label' }, `Tiempo en ${c.lugar || c.ciudad}`), h('div', { class: 'weather' }, h('b', { class: 'num' }, `${c.max}°`), h('span', {}, c.texto), h('span', { class: 'mute num' }, `mín. ${c.min}° · lluvia ${c.lluvia ?? 0} %`)));
  return h('section', { class: 'card' }, h('h2', { class: 'sec' }, 'Resumen'), tiempo,
    h('div', {}, h('div', { class: 'label', style: 'margin-bottom:6px' }, 'Agenda de hoy'),
      ag.length ? ag.map((a) => h('div', { class: 'row', style: 'padding:8px 0;min-height:0' }, h('span', { class: 'num mute', style: 'width:3.4rem' }, a.hora), h('span', { class: 'grow' }, a.titulo),
        h('button', { class: 'chev', 'aria-label': 'Quitar ' + a.titulo, onclick: () => { data.agenda[f].splice(a.i, 1); commit(); } }, '×'))) : h('p', { class: 'mute small' }, 'Nada apuntado para hoy.'),
      h('button', { class: 'btn plain', style: 'padding-left:0', onclick: () => addAgenda(f) }, '+ Añadir recordatorio')));
}

function saludo() {
  const hr = new Date().getHours(), t = hr < 6 ? 'Buenas noches' : hr < 14 ? 'Buenos días' : hr < 21 ? 'Buenas tardes' : 'Buenas noches';
  return data.perfil.nombre ? `${t}, ${data.perfil.nombre}` : t;
}
function recordatorioCuenta() {
  if (!Nube.nubeActiva() || Nube.haySesion() || (data.meta || {}).ocultarCuenta) return null;
  return h('div', { class: 'banner', role: 'note' }, h('span', { class: 'grow' }, 'Crea una cuenta para no perder tus datos y usar Rutina en otro ordenador.'),
    h('button', { class: 'btn', onclick: () => irAuth('crear') }, 'Crear cuenta'),
    h('button', { class: 'btn plain', 'aria-label': 'Ocultar este aviso', onclick: () => { data.meta = data.meta || {}; data.meta.ocultarCuenta = true; guardarLocal(); } }, '✕'));
}
function viewHoy() {
  const d = L.hoy(), f = L.iso(d), dm = L.diaMenu(data, d), hechos = L.hechosDe(data, f), slots = [];
  for (const [c, nombre] of L.FIJOS) { const fj = L.fijoOn(data, c); if (fj) slots.push({ k: c, hora: fj.hora, kind: nombre, title: fj.texto, det: itemsText(fj.items) }); }
  for (const [m, nombre] of [['comida', 'Comida'], ['cena', 'Cena']]) {
    const pl = dm && dm[m]; if (pl) slots.push({ k: m, hora: data.menu.horas[m], kind: nombre, title: pl.libre ? 'Comida libre' : pl.t, det: pl.libre ? 'Que lleve una ración clara de proteína.' : itemsText(pl.items) });
  }
  const ses = L.sesionGym(data, L.idxDia(d));
  if (ses) slots.push({ k: 'gym', hora: data.entreno.hora, kind: `Entreno${ses.min ? ' · ' + ses.min : ''}`, title: ses.t, extra: bloqueGym(ses, f) });
  slots.sort((a, b) => L.minutos(a.hora) - L.minutos(b.hora));
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), sig = slots.find((s) => !hechos[s.k] && L.minutos(s.hora) >= nm - 60), hechas = slots.filter((s) => hechos[s.k]).length;

  const t = L.totalDia(data, d), o = L.objetivo(data, d);
  const metric = (label, v, goal, unit) => h('div', { class: 'metric' }, h('div', { class: 'top' }, h('span', { class: 'label' }, label), h('span', { class: 'mute small num' }, `objetivo ${L.miles(goal)} ${unit}`)),
    h('b', { class: 'num' }, `${L.miles(v)} ${unit}`), h('div', { class: 'bar' + (goal && v >= goal ? ' ok' : '') }, h('i', { style: `width:${goal ? Math.min(100, v / goal * 100) : 0}%` })));
  const cs = L.comidasDelDia(data), total = cs.length;
  const siete = Array.from({ length: 7 }, (_, n) => { const x = L.addDays(d, n - 6), c = cs.filter((k) => L.hechosDe(data, L.iso(x))[k]).length;
    return h('div', { class: 'd7' + (n === 6 ? ' today' : '') }, h('div', { class: 'c' }, h('i', { style: `height:${c / total * 100}%` })), h('span', {}, 'LMXJVSD'[L.idxDia(x)]), h('span', { class: 'num' }, `${c}/${total}`)); });
  const r = L.racha(data);

  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, saludo()), h('p', { class: 'subtitle' }, L.fechaLarga(d)))),
    recordatorioCuenta(),
    h('div', { class: 'cols' },
      h('div', { class: 'stack' }, slots.length ? h('div', { class: 'group' }, slots.map((s) => slotEl(s, f, sig && sig.k, !!hechos[s.k]))) :
        h('div', { class: 'card empty' }, h('p', {}, 'Hoy no tienes nada en el plan.'), h('button', { class: 'btn', onclick: () => go('semana') }, 'Preparar el menú'))),
      h('div', { class: 'stack' }, resumenCard(f),
        t ? h('section', { class: 'card' }, h('h2', { class: 'sec' }, 'Nutrición'), metric('Proteína', t.p, o.prot, 'g'), metric('Energía', t.k, o.kcal, 'kcal'),
          h('p', { class: 'mute small' }, 'Estimación según lo planeado' + (t.libre ? `; cuenta unas ${L.miles(data.perfil.libre.kcal)} kcal por la comida libre.` : '.'))) : null,
        h('section', { class: 'card' }, h('h2', { class: 'sec' }, 'Progreso'),
          h('div', { class: 'metric' }, h('div', { class: 'top' }, h('span', { class: 'label' }, 'Hecho hoy'), h('span', { class: 'num mute small' }, `${hechas} de ${slots.length}`)), h('div', { class: 'bar' }, h('i', { style: `width:${slots.length ? hechas / slots.length * 100 : 0}%` }))),
          h('div', { class: 'label' }, 'Comidas de los últimos 7 días'), h('div', { class: 'week7' }, siete),
          h('p', { class: 'mute small' }, r > 0 ? `Llevas ${r} ${r === 1 ? 'día completo seguido' : 'días completos seguidos'}.` : `Marca las ${total} comidas de un día para empezar una racha.`)))));
}

function platoBtn(semana, i, m) {
  const pl = semana[i][m];
  return h('button', { class: 'plato', onclick: () => editPlato(semana, i, m) }, h('span', { class: 'label' }, m === 'comida' ? 'Comida' : 'Cena'),
    pl ? [h('h3', {}, pl.libre ? 'Comida libre' : pl.t), pl.libre ? null : h('p', { class: 'det' }, itemsText(pl.items))] : h('h3', { class: 'add' }, '+ Añadir'));
}
function viewSemana() {
  const lun = L.addDays(L.lunesDe(L.hoy()), S.semSel * 7), w = L.semanaIdx(data, lun), semana = data.menu.semanas[w], fh = L.iso(L.hoy()), n = data.menu.semanas.length;
  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, 'Menú'), h('p', { class: 'subtitle' }, n > 1 ? `Semana ${w + 1} de ${n} del ciclo` : 'Se repite cada semana')),
      seg([[0, 'Esta semana'], [1, 'La que viene']], S.semSel, (v) => { S.semSel = v; render(); })),
    h('p', { class: 'mute small' }, 'Toca un plato para editarlo. Las cantidades son por persona.'),
    h('div', { class: 'group' }, semana.map((_, i) => { const d = L.addDays(lun, i);
      return h('div', { class: 'dayrow' + (L.iso(d) === fh ? ' hoy' : '') }, h('div', { class: 'dn' }, L.DIAS[i], h('small', {}, L.fechaCorta(d) + (L.sesionGym(data, i) ? ' · con entreno' : ''))), platoBtn(semana, i, 'comida'), platoBtn(semana, i, 'cena')); })));
}

function viewCompra() {
  const k = L.claveCompra(S.compSel), marc = (data.compra[k] && data.compra[k].marcados) || {}, tot = L.listaCompra(data, S.compSel), ids = Object.keys(tot), hechos = ids.filter((i) => marc[i]).length;
  const copiar = async () => {
    const txt = L.textoCompra(data, S.compSel);
    try { await navigator.clipboard.writeText(txt); toast('Lista copiada.'); } catch { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = txt; document.body.append(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); toast(ok ? 'Lista copiada.' : 'No se pudo copiar.'); }
  };
  const secciones = L.SECC.map(([sc, nombre]) => {
    const its = ids.filter((i) => L.ing(data, i).s === sc).sort((a, b) => L.ing(data, a).n.localeCompare(L.ing(data, b).n, 'es')); if (!its.length) return null;
    return h('section', { class: 'stack', style: 'gap:8px' }, h('h2', { class: 'sec', style: 'font-size:17px' }, nombre),
      h('div', { class: 'group' }, its.map((i) => h('button', { class: 'item', 'aria-pressed': String(!!marc[i]), onclick: () => { const c = (data.compra[k] ||= { marcados: {} }); if (c.marcados[i]) delete c.marcados[i]; else c.marcados[i] = true; commit(); } },
        h('span', { class: 'box', 'aria-hidden': 'true', 'aria-pressed': String(!!marc[i]) }, icon('check')), h('span', { class: 'nm' }, L.ing(data, i).n), h('span', { class: 'q' }, L.cantidadCompra(data, i, tot[i]))))));
  }).filter(Boolean);
  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, 'Compra'), h('p', { class: 'subtitle num' }, `${hechos} de ${ids.length} en el carro`)),
      seg([[2, 'Dos semanas'], [0, 'Esta semana'], [1, 'La que viene']], S.compSel, (v) => { S.compSel = v; render(); })),
    h('div', { class: 'head' }, h('div', { class: 'row', style: 'padding:0;min-height:0;gap:10px' }, h('span', { class: 'mute' }, 'Para'), h('div', { class: 'stepper' },
      h('button', { 'aria-label': 'Menos personas', onclick: () => { data.perfil.personas = Math.max(1, (data.perfil.personas || 1) - 1); commit(); } }, '−'), h('span', { class: 'num' }, String(data.perfil.personas || 1)),
      h('button', { 'aria-label': 'Más personas', onclick: () => { data.perfil.personas = Math.min(12, (data.perfil.personas || 1) + 1); commit(); } }, '+')), h('span', { class: 'mute' }, (data.perfil.personas || 1) === 1 ? 'persona' : 'personas')),
      h('div', {}, h('button', { class: 'btn sec', onclick: copiar, disabled: !ids.length }, 'Copiar lista'), ' ', h('button', { class: 'btn plain', onclick: () => { data.compra[k] = { marcados: {} }; commit(); }, disabled: !hechos }, 'Desmarcar todo'))),
    ids.length ? h('div', { class: 'shop' }, secciones) : h('div', { class: 'card empty' }, h('p', {}, 'Tu lista aparecerá aquí cuando añadas platos al menú.'), h('button', { class: 'btn', onclick: () => go('semana') }, 'Ir al menú')));
}

function viewEntreno() {
  const ses = data.entreno.sesiones;
  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, 'Entreno'), h('p', { class: 'subtitle' }, ses.length ? `${ses.length} ${ses.length === 1 ? 'sesión' : 'sesiones'} a la semana` : 'Aún no has creado sesiones')), h('button', { class: 'btn', onclick: () => editSesion(null) }, 'Nueva sesión')),
    ses.length ? ses.map((s) => h('section', { class: 'card' },
      h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, h('div', { class: 'label' }, `${L.DIAS[s.dia]}${s.min ? ' · ' + s.min : ''}`), h('h2', { class: 'sec' }, s.t)), h('button', { class: 'btn sec', onclick: () => editSesion(s.dia) }, 'Editar')),
      h('div', { class: 'group', style: 'box-shadow:none;background:var(--bg)' }, s.ej.map((e) => { const u = e.c ? L.ultimoPeso(data, L.slug(e.n)) : null;
        return h('div', { class: 'row', style: 'min-height:42px' }, h('span', { class: 'grow' }, e.n), h('span', { class: 'mute num small' }, e.s + (u ? ` · ${L.kgTxt(u.kg)} kg` : ''))); })))) :
      h('div', { class: 'card empty' }, h('p', {}, 'Crea tus sesiones de gimnasio y aparecerán en Hoy el día que toquen.'), h('button', { class: 'btn', onclick: () => editSesion(null) }, 'Crear la primera')));
}

function viewAjustes() {
  const p = data.perfil, o = p.objetivos;
  const txt = (v, on, ph, w = '13rem') => h('input', { type: 'text', value: v, placeholder: ph || '', style: `width:${w};text-align:right`, onchange: (e) => on(e.target.value.trim()) });
  const grupo = (titulo, ...rows) => h('section', { class: 'stack', style: 'gap:8px' }, h('div', { class: 'label', style: 'padding-left:4px' }, titulo), h('div', { class: 'group' }, rows));
  const tapRow = (label, sub, onclick, right) => h('button', { class: 'row tap', onclick }, h('div', { class: 'grow' }, label, sub ? h('div', { class: 'sub' }, sub) : null), right || h('span', { class: 'chev' }, '›'));
  const ings = ingOptions();
  return h('div', { class: 'page' },
    h('div', {}, h('h1', { class: 'title' }, 'Ajustes'), h('p', { class: 'subtitle' }, 'Tu plan, tus objetivos y tus datos')),
    Nube.nubeActiva() ? cuentaGrupo() : null,
    grupo('Perfil', rowOf('Nombre', txt(p.nombre, (v) => { p.nombre = v; commit(); }, 'Tu nombre')),
      rowOf('Ciudad', txt(p.ciudad, (v) => { p.ciudad = v; data.clima = null; commit(); refreshClima(); }, 'Para el tiempo'), 'Se usa solo para consultar el tiempo.'),
      rowOf('Personas en casa', h('div', { class: 'stepper' }, h('button', { 'aria-label': 'Menos', onclick: () => { p.personas = Math.max(1, (p.personas || 1) - 1); commit(); } }, '−'), h('span', { class: 'num' }, String(p.personas || 1)), h('button', { 'aria-label': 'Más', onclick: () => { p.personas = Math.min(12, (p.personas || 1) + 1); commit(); } }, '+')), 'Multiplica las cantidades de la lista de la compra.')),
    grupo('Objetivos diarios', rowOf('Día con entreno · calorías', numField(o.gym.kcal, (v) => { o.gym.kcal = v; commit(); })), rowOf('Día con entreno · proteína (g)', numField(o.gym.prot, (v) => { o.gym.prot = v; commit(); })),
      rowOf('Día sin entreno · calorías', numField(o.sin.kcal, (v) => { o.sin.kcal = v; commit(); })), rowOf('Día sin entreno · proteína (g)', numField(o.sin.prot, (v) => { o.sin.prot = v; commit(); })),
      rowOf('Comida libre · calorías', numField(p.libre.kcal, (v) => { p.libre.kcal = v; commit(); }), 'Lo que cuentas cuando comes fuera del plan.'), rowOf('Comida libre · proteína (g)', numField(p.libre.prot, (v) => { p.libre.prot = v; commit(); }))),
    grupo('Horarios', ...L.FIJOS.map(([c, n]) => { const f = data.menu.fijos[c]; return h('div', { class: 'row' }, h('button', { class: 'grow', style: 'text-align:left', onclick: () => editFijo(c, n) }, n, h('div', { class: 'sub' }, f.on ? `${f.hora} · ${f.texto}` : 'Desactivada')), swt(f.on, () => { f.on = !f.on; commit(); }, n)); }),
      rowOf('Comida', h('input', { type: 'time', value: data.menu.horas.comida, style: 'width:7rem', onchange: (e) => { data.menu.horas.comida = e.target.value || data.menu.horas.comida; commit(); } })),
      rowOf('Cena', h('input', { type: 'time', value: data.menu.horas.cena, style: 'width:7rem', onchange: (e) => { data.menu.horas.cena = e.target.value || data.menu.horas.cena; commit(); } })),
      rowOf('Entreno', h('input', { type: 'time', value: data.entreno.hora, style: 'width:7rem', onchange: (e) => { data.entreno.hora = e.target.value || data.entreno.hora; commit(); } }))),
    grupo('Ciclo del menú', rowOf('Semanas distintas', seg([[1, '1'], [2, '2']], data.menu.semanas.length, (v) => {
      if (v === data.menu.semanas.length) return; if (v === 2) data.menu.semanas.push(clone(data.menu.semanas[0])); else data.menu.semanas = data.menu.semanas.slice(0, 1); commit(); }), 'Con 2, el menú alterna entre dos semanas.'),
      data.menu.semanas.length > 1 ? tapRow('Empezar el ciclo esta semana', 'La semana actual pasa a ser la 1.', () => { data.menu.ancla = L.iso(L.lunesDe(L.hoy())); commit(); toast('Ciclo reiniciado.'); }) : null),
    h('section', { class: 'stack', style: 'gap:8px' }, h('div', { class: 'row', style: 'padding:0 4px' }, h('div', { class: 'label grow' }, `Ingredientes · ${ings.length}`), h('button', { class: 'btn plain', onclick: () => editIngrediente(null) }, '+ Añadir')),
      ings.length ? h('div', { class: 'group' }, ings.map(([id, g]) => tapRow(g.n, `${g.k} kcal · ${g.p} g prot. ${g.u === 'ud' ? 'por unidad' : 'por 100 ' + g.u}`, () => editIngrediente(id)))) : h('p', { class: 'mute small' }, 'Aún no hay ingredientes.')),
    grupo('Acerca de Rutina', rowOf('Versión', h('span', { class: 'mute num' }, S.version || '—')),
      h('a', { class: 'row tap', href: 'https://charlymanso.github.io/rutina/', target: '_blank', rel: 'noopener' }, h('div', { class: 'grow' }, 'Sitio web'), h('span', { class: 'chev' }, '›')),
      h('a', { class: 'row tap', href: 'https://charlymanso.github.io/rutina/privacidad.html', target: '_blank', rel: 'noopener' }, h('div', { class: 'grow' }, 'Política de privacidad'), h('span', { class: 'chev' }, '›'))),
    grupo('Datos', tapRow('Guardar una copia', 'Exporta todo a un archivo.', async () => { if (await store.exportar(data)) toast('Copia guardada.'); }),
      tapRow('Recuperar una copia', 'Sustituye lo actual por un archivo guardado.', async () => {
        const raw = await store.importar(); if (!raw) return; if (typeof raw !== 'object' || !raw.menu) return toast('Ese archivo no parece una copia de Rutina.');
        confirmSheet('¿Recuperar esta copia?', 'Se sustituirán tu plan y tus registros actuales.', 'Recuperar', () => { data = normalize(raw); data.perfil.listo = true; commit(); toast('Copia recuperada.'); }); }),
      tapRow('Cargar el plan de ejemplo', 'Cambia tu menú y entrenos por los de ejemplo. Tus registros se conservan.', () => confirmSheet('¿Cargar el plan de ejemplo?', 'Se sustituirán tu menú, ingredientes y sesiones.', 'Cargar', () => {
        const T = makeTemplate(); data.ingredientes = T.ingredientes; data.menu = T.menu; data.entreno = T.entreno; commit(); })),
      tapRow('Borrar todos mis datos', 'No se puede deshacer.', () => confirmSheet('¿Borrar todo?', Nube.haySesion() ? 'Se eliminarán tu plan, tus registros y tus ajustes, tanto de este ordenador como de tu cuenta en la nube.' : 'Se eliminarán tu plan, tus registros y tus ajustes de este ordenador.', 'Borrar todo', async () => { if (Nube.haySesion()) { try { await Nube.borrarNube(); } catch { toast('No se pudo borrar la copia de la nube. Inténtalo con conexión.'); return; } } data = emptyData(); store.save(data); S.tab = 'hoy'; render(); bienvenida(); }))));
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
      h('a', { href: 'https://charlymanso.github.io/rutina/privacidad.html', target: '_blank', rel: 'noopener' }, 'Privacidad'))));
}

/* ---------- aviso de actualización ---------- */
function bannerUpdate() {
  const u = S.upd; // actualización automática (Windows)
  if (u && u.fase === 'descargando') return h('div', { class: 'banner', role: 'status' }, h('span', { class: 'grow' }, `Descargando la versión nueva${u.porcentaje != null ? ` (${u.porcentaje} %)` : ''}…`));
  if (u && u.fase === 'listo') return h('div', { class: 'banner', role: 'status' }, h('span', { class: 'grow' }, `La versión ${u.version} está lista.`),
    h('button', { class: 'btn', onclick: () => window.rutina.instalarUpdate() }, 'Reiniciar y actualizar'));
  if (S.update && !S.updateOculto && (!S.autoUpdate || (u && u.fase === 'error'))) return h('div', { class: 'banner', role: 'status' }, h('span', { class: 'grow' }, `Hay una versión nueva de Rutina (${S.update.version}).`),
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
  return h('section', { class: 'stack', style: 'gap:8px' }, h('div', { class: 'label', style: 'padding-left:4px' }, 'Cuenta y sincronización'),
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
    titulo = 'Entrar'; sub = 'Con tu cuenta, tu plan te acompaña en todos tus ordenadores.';
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
      h('p', { class: 'gate-note', style: 'margin:0' }, 'Al crear la cuenta aceptas la ', h('a', { href: 'https://charlymanso.github.io/rutina/privacidad.html', target: '_blank', rel: 'noopener' }, 'política de privacidad'), '.'),
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
const TABS = [['hoy', 'Hoy', viewHoy], ['semana', 'Menú', viewSemana], ['compra', 'Compra', viewCompra], ['entreno', 'Entreno', viewEntreno], ['ajustes', 'Ajustes', viewAjustes]];
function go(tab) { S.tab = tab; S.animar = true; render(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; }
function chipUsuario() {
  const u = Nube.usuario(), nombre = data.perfil.nombre || (u ? u.email.split('@')[0] : 'Invitado');
  return h('button', { class: 'chip', onclick: () => go('ajustes'), 'aria-label': 'Tu cuenta' },
    h('span', { class: 'avatar', 'aria-hidden': 'true' }, nombre.trim().charAt(0).toUpperCase() || '?'),
    h('span', { class: 'chip-txt' }, h('b', {}, nombre), h('small', {}, u ? u.email : 'Solo en este ordenador')));
}
function render() {
  document.body.classList.toggle('mac', store.platform() === 'darwin');
  if (S.auth) { root.replaceChildren(viewAuth()); return; }
  if (mostrarInicio()) { root.replaceChildren(viewInicio()); return; }
  const prev = document.querySelector('.main'), top = prev ? prev.scrollTop : 0, view = TABS.find((t) => t[0] === S.tab)[2];
  const animar = S.animar; S.animar = false;
  root.replaceChildren(h('div', { class: 'app' },
    h('nav', { class: 'side', 'aria-label': 'Secciones' }, h('div', { class: 'brand' }, 'Rutina'),
      TABS.map(([id, nombre]) => [id === 'ajustes' ? h('div', { class: 'spacer' }) : null, h('button', { class: 'nav', 'aria-current': S.tab === id ? 'page' : null, onclick: () => go(id) }, icon(id), nombre)]),
      Nube.nubeActiva() ? chipUsuario() : null),
    h('main', { class: 'main' + (animar ? ' enter' : '') }, bannerUpdate(), view())));
  document.querySelector('.main').scrollTop = top;
}
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || sheets.length || S.auth || mostrarInicio()) return;
  const t = TABS[+e.key - 1]; if (t) { e.preventDefault(); go(t[0]); }
});

/* ---------- arranque ---------- */
(async () => {
  const raw = await store.load();
  data = normalize(raw);
  if (Nube.nubeActiva()) await Nube.cargarSesion();
  if (raw && raw.menu && !raw.perfil) data.perfil.listo = true;
  if (window.rutina && window.rutina.version) window.rutina.version().then((v) => { S.version = v; });
  render();
  if (!data.perfil.listo && !mostrarInicio()) bienvenida();
  refreshClima();
  if (Nube.nubeActiva()) {
    Sync.init({ getData: () => data, setData: (d) => { data = d; if (S.bienvenida) { S.bienvenida.close(); S.bienvenida = null; } }, guardar: () => store.save(data), render, onConflicto: conflictoSheet,
      onEstado: (e) => { S.nube = { ...(S.nube || {}), ...e }; const el = document.getElementById('estado-nube'); if (el) el.textContent = textoEstado(); },
      onSesionCaducada: () => { S.nube = null; render(); toast('Tu sesión ha caducado. Vuelve a entrar en Ajustes.'); } });
    if (await Nube.cargarSesion()) Sync.sincronizar();
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
  setInterval(() => { if (S.tab === 'hoy' && !document.hidden && !sheets.length && !/^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement || {}).tagName)) render(); }, 60000);
})();
