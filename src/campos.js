// Piezas compartidas por varias pantallas: textos de macros, buscador de alimentos y editor de ingredientes de un plato.
import * as L from './logic.js';
import { BASE, buscarLocal, normalizar } from './alimentos.js';
import { buscarOnline, porCodigo, esCodigoDeBarras } from './off.js';
import { h, icon, num, sacar, deslizable, sheet } from './ui.js';
import { data, commit } from './core.js';
import { editIngrediente } from './editores.js';

/* ---------- campos reutilizables ---------- */
export const numField = (value, onchange, w = '6rem') => h('input', { type: 'number', min: 0, step: 'any', value: String(value), style: `width:${w};text-align:right`, onchange: (e) => onchange(Math.max(0, num(e.target.value))) });
export const itemsText = (items) => (items || []).map((it) => L.linea(data, it)).join(' · ');
export const ingOptions = () => Object.entries(data.ingredientes).sort((a, b) => a[1].n.localeCompare(b[1].n, 'es'));
export const usoIngrediente = (id) => {
  let n = 0;
  data.menu.semanas.forEach((w) => w.forEach((d) => ['comida', 'cena', ...L.FIJAS].forEach((m) => { if (d[m] && (d[m].items || []).some((i) => i[0] === id)) n++; })));
  Object.values(data.menu.fijos).forEach((f) => { if ((f.items || []).some((i) => i[0] === id)) n++; });
  return n;
};
export const r1 = (n) => Math.round(n * 10) / 10;
export const f1 = (n) => r1(n).toLocaleString('es-ES', { maximumFractionDigits: 1 });
export const macroTxt = (t) => `${L.miles(t.k)} kcal · P ${f1(t.p)} g` + (t.completo ? ` · C ${f1(t.c)} g · G ${f1(t.f)} g` : '');
export const macroPor100 = (g) => `${g.k} kcal · P ${g.p}` + (g.c != null && g.f != null ? ` · C ${g.c} · G ${g.f}` : '') + (g.u === 'ud' ? ' · por unidad' : ` · por 100 ${g.u}`);
export const cantidadPorDefecto = (g) => g.por || (g.u === 'ud' ? 1 : 100);
/* Buscador de alimentos: tus ingredientes, la base incluida y (en la app de escritorio) productos de supermercado. */
export function buscarAlimento({ titulo = 'Añadir alimento', onPick }) {
  const q = h('input', { type: 'text', id: 'buscar-alimento', placeholder: 'Busca un alimento o escribe un código', autocomplete: 'off' });
  const lista = h('div', { class: 'stack', style: 'gap:16px' });
  let timer = null, seq = 0, online = { estado: 'idle', items: [] };
  // Un producto de supermercado nuevo puede ser algo que ya tienes con otro nombre: se pregunta antes de crear otro
  const elegir = (a) => {
    const parecidos = !a.id && a.origen === 'off' ? L.ingredientesParecidos(data, a) : [];
    if (!parecidos.length) return usar(a);
    const hoja = sheet({ title: '¿Ya lo tenías?', save: 'Es nuevo', cancel: 'Atrás', onSave: () => { usar(a); }, body: [
      h('p', { class: 'mute small' }, `“${a.n}” se parece a algo que ya tienes. Si es lo mismo, elige el tuyo y no se creará otro.`),
      h('div', { class: 'group', id: 'parecidos' }, parecidos.map(({ id, g }) => h('button', { type: 'button', class: 'row tap', onclick: () => { if (a.code && !g.code) g.code = a.code; hoja.close(); usar({ ...g, id }); } }, h('div', { class: 'grow' }, g.n, h('div', { class: 'sub num' }, macroPor100(g))), h('span', { class: 'chev' }, '›'))))] });
  };
  const usar = (a) => {
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
export function itemsEditor(items, onChange = () => {}) {
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
