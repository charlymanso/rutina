// Hojas para crear y editar: menú recomendado, ingredientes, ejercicios, platos, comidas, sesiones y la bienvenida.
import * as L from './logic.js';
import { makeTemplate, emptyData } from './template.js';
import { BASE, normalizar } from './alimentos.js';
import { generarSemana, DIETAS, EXCLUSIONES } from './recetas.js';
import * as Nube from './cloud.js';
import { h, clone, num, toast, sacar, deslizable, sheets, sheet, confirmSheet, field, swt, graficaLinea } from './ui.js';
import { data, commit, diaReg, S, setData } from './core.js';
import { abrirObjetivo } from './objetivo-ui.js';
import { usoIngrediente, macroPor100, macroTxt, itemsEditor } from './campos.js';
import { grupo, irAj } from './ajustes.js';
import { irAuth } from './cuenta.js';
import { go } from './app.js';

/* ---------- recomendar menú ---------- */
export function idDeBase(nombre) { // reutiliza tu ingrediente si ya lo tienes; si no, lo crea desde la base
  const n = normalizar(nombre), ya = Object.entries(data.ingredientes).find(([, g]) => normalizar(g.n) === n); if (ya) return ya[0];
  const a = BASE.find((x) => normalizar(x.n) === n), { origen, ...ing } = a; let id = L.slug(a.n), c = 2; const b = id; while (data.ingredientes[id]) id = `${b}-${c++}`; data.ingredientes[id] = ing; return id;
}
export function recomendarMenu(lun, semana) {
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
export function editIngrediente(id, onDone, relleno = {}) {
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
      const previo = id ? { ...data.ingredientes[id] } : {}; delete previo.c; delete previo.f; delete previo.pl;   // conserva código de barras, uso reciente, etc.
      data.ingredientes[nid] = { ...previo, n, u: unidad.value, k: num(kcal.value), p: num(prot.value), ...(carb.value.trim() !== '' ? { c: num(carb.value) } : {}), ...(grasa.value.trim() !== '' ? { f: num(grasa.value) } : {}),
        s: seccion.value, ...(g.por ? { por: g.por } : {}), ...(unidad.value === 'ud' && plural.value.trim() ? { pl: plural.value.trim() } : {}) };
      commit(); onDone && onDone(nid);
    },
    extra: id ? h('div', { class: 'row', style: 'padding:0;gap:4px' }, h('button', { class: 'btn danger', onclick: () => {
      const n = usoIngrediente(id); if (n) { toast(`Se usa en ${n} ${n === 1 ? 'plato' : 'platos'}. Quítalo de ahí primero.`); return; }
      confirmSheet('¿Borrar ingrediente?', `Se eliminará “${g.n}”.`, 'Borrar', () => { delete data.ingredientes[id]; commit(); sheets.slice().forEach((s) => s.close()); });
    } }, 'Borrar'), h('button', { class: 'btn plain', id: 'ing-unir', onclick: () => unirIngrediente(id, onDone) }, 'Unir con otro…')) : null });
}
/* Unir dos ingredientes que son lo mismo (p. ej. uno escaneado y otro escrito a mano): se elige con cuál quedarse. */
export function unirIngrediente(id, despues) {
  const g = data.ingredientes[id], q = h('input', { type: 'search', id: 'unir-buscar', placeholder: 'Buscar ingrediente', autocomplete: 'off' }), lista = h('div', { class: 'group', id: 'unir-lista' });
  const otros = Object.entries(data.ingredientes).filter(([k, x]) => k !== id && x.u === g.u).sort((x, y) => x[1].n.localeCompare(y[1].n, 'es'));
  const pintar = () => { const t = normalizar(q.value.trim()), vis = (t ? otros.filter(([, x]) => normalizar(x.n).includes(t)) : otros).slice(0, 30);
    lista.replaceChildren(...(vis.length ? vis.map(([k, x]) => h('button', { type: 'button', class: 'row tap', onclick: () => confirmSheet('¿Unir estos dos?', `Todo lo que usa “${g.n}” pasará a usar “${x.n}”, y “${g.n}” se borrará. Se quedan el nombre y los datos de “${x.n}”.`, 'Unir', () => {
      if (!L.unirIngredientes(data, id, k)) return toast('No se han podido unir.'); commit(); sheets.slice().forEach((z) => z.close()); toast(`Unidos en “${x.n}”.`); despues && despues(); }) }, h('div', { class: 'grow' }, x.n, h('div', { class: 'sub num' }, macroPor100(x))), h('span', { class: 'chev' }, '›')))
      : [h('p', { class: 'mute small', style: 'padding:14px' }, 'No hay otro ingrediente que se mida igual.')])); };
  q.addEventListener('input', pintar); pintar();
  sheet({ title: 'Unir con…', cancel: 'Cerrar', body: [h('p', { class: 'mute small' }, `Elige el ingrediente con el que te quedas. “${g.n}” desaparecerá y sus usos pasarán al que elijas.`), q, lista] });
}
/* Flechas para cambiar el orden de una lista: mover(j) lleva el elemento i a la posición j. */
export const ordenBtns = (i, n, mover, que) => h('span', { class: 'orden' },
  h('button', { type: 'button', class: 'ord-sube', 'aria-label': `Subir ${que}`, disabled: i === 0, onclick: () => mover(i - 1) }, '▲'),
  h('button', { type: 'button', class: 'ord-baja', 'aria-label': `Bajar ${que}`, disabled: i === n - 1, onclick: () => mover(i + 1) }, '▼'));
/* Un ejercicio con todo su historial: renombrar (conserva los pesos) y cambiar sus series en todas las sesiones. */
export function editarEjercicio(x, despues) {
  const nombre = h('input', { type: 'text', id: 'ej-nom', value: x.n, autocomplete: 'off' }), series = h('input', { type: 'text', id: 'ej-ser', value: x.s || '', placeholder: '4×8' });
  const fijado = (data.entreno.grupos || {})[x.k] || '', grupo = h('select', { id: 'ej-grupo', value: fijado }, [['', `Automático (${(L.GRUPOS_EJ.find(([g]) => g === (fijado ? null : x.grupo)) || [0, 'según la sesión'])[1]})`], ...L.GRUPOS_EJ].map(([v, t]) => h('option', { value: v }, t)));
  const nt = x.nota || {}, nota = h('textarea', { id: 'ej-nota', rows: 2, placeholder: 'Ej. Evita el dolor; espalda recta' }, nt.t || ''), video = h('input', { type: 'url', id: 'ej-video', inputmode: 'url', placeholder: 'https://…', value: nt.v || '', autocomplete: 'off' });
  const pesos = x.hist.filter((r) => r.kg != null).slice().reverse();
  const enSesion = x.sesiones.length > 0, fecha = (f) => L.parseISO(f).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  sheet({ title: 'Ejercicio', save: 'Guardar', body: [field('Nombre', nombre), enSesion ? field('Series y repeticiones', series) : null, field('Grupo', grupo), field('Nota (sale al entrenar)', nota), field('Vídeo (enlace)', video),
    pesos.length >= 2 ? h('div', { id: 'ej-grafica' }, h('div', { class: 'label', style: 'margin-bottom:4px' }, `Kilos · mejor marca ${L.kgTxt(x.mejor)} kg`), graficaLinea(pesos.map((r) => ({ f: r.f, v: r.kg })), 'kg')) : null,
    enSesion ? h('p', { class: 'mute small' }, `En tu rutina: ${[...new Set(x.sesiones)].join(', ')}.`) : h('p', { class: 'mute small' }, 'Ahora mismo no está en ninguna sesión, pero se conserva su historial por si lo vuelves a hacer.'),
    h('div', { class: 'label' }, x.hist.length ? 'Historial' : 'Aún no hay registros'),
    x.hist.length ? h('div', { class: 'group', id: 'ej-hist', style: 'max-height:260px;overflow:auto' }, x.hist.map((r) => h('div', { class: 'row', style: 'min-height:40px' }, h('span', { class: 'grow' }, fecha(r.f)), h('span', { class: 'mute num small' }, [r.kg != null ? `${L.kgTxt(r.kg)} kg` : (r.hecho ? 'hecho' : 'sin hacer'), r.kgs ? r.kgs.map((v) => (v == null ? '—' : L.kgTxt(v))).join('/') : null, r.s].filter(Boolean).join(' · '))))) : null,
    h('p', { class: 'mute small' }, 'Si le pones el nombre de otro ejercicio que ya tengas, se juntan sus historiales.')].filter(Boolean),
    onSave: () => {
      const n = nombre.value.trim(); if (!n) return 'Escribe el nombre.'; if (!L.slug(n)) return 'Usa letras o números en el nombre.';
      if (enSesion && series.value.trim() && series.value.trim() !== x.s) L.seriesEjercicio(data, x.k, series.value.trim());
      if (video.value.trim() && !L.esEnlace(video.value)) return 'El vídeo tiene que ser un enlace que empiece por https://';
      if (grupo.value !== fijado) L.fijarGrupoEjercicio(data, x.k, grupo.value || null);
      if (nota.value.trim() !== (nt.t || '') || video.value.trim() !== (nt.v || '')) L.ponerNotaEjercicio(data, x.k, nota.value, video.value);
      if (n !== x.n) L.renombrarEjercicio(data, x.k, n);
      commit(); despues && despues();
    } });
}
export const NOMBRE_COMIDA = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
export function platosGuardados(m = 'comida') { // platos distintos que ya usas, para reutilizarlos
  const mapa = new Map(), esFija = L.FIJAS.includes(m), claves = esFija ? [m] : ['comida', 'cena'];
  data.platosPropios.forEach((p) => mapa.set(p.t, p));
  if (esFija) { const f = data.menu.fijos[m]; if (f && (f.items || []).length) mapa.set(f.texto, { t: f.texto, items: f.items }); }
  data.menu.semanas.forEach((wk) => wk.forEach((d) => claves.forEach((k) => { const pl = d[k]; if (pl && !pl.libre && pl.items && pl.items.length && !mapa.has(pl.t)) mapa.set(pl.t, pl); })));
  return [...mapa.values()].sort((x, y) => x.t.localeCompare(y.t, 'es'));
}
/* Selector de platos (lista, no desplegable): Gestionar platos arriba, luego los tuyos y los que ya usas en el menú. */
export function elegirPlato({ titulo = 'Elegir plato', m = 'comida', actual = '', libre = false, quitar = null, onPick, onLibre }) {
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
export const nombresHogar = () => { const n = L.hogar(data).map((x) => x.n); return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}` : n[0] || ''; };
export function editarPersona(x) {
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
export function borrarPlato(x) {
  confirmSheet('¿Borrar este plato?', `“${x.t}” dejará de salir en la lista. Los días del menú que ya lo usan no cambian.`, 'Borrar', () => { data.platosPropios = data.platosPropios.filter((y) => y.t !== x.t); commit(); sheets.slice().forEach((z) => z.close()); toast('Plato borrado.'); });
}
export function crearPlato(onListo, existente = null) {
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
export const w0 = (e) => (e ? e.t : '');
/* Editor de un plato de cualquier comida del día, con la opción de repetirlo en otros días de la semana. */
export function editPlato(semana, i, m) {
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
export function abrirComidasHorarios() {
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
export function editSesion(id) {
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
      h('button', { class: 'x', style: 'color:var(--faint);font-size:20px', 'aria-label': 'Quitar', onclick: () => sacar(s.ej, i, e.n || 'Ejercicio', draw) }, '×'),
      s.ej.length > 1 ? ordenBtns(i, s.ej.length, (j) => { s.ej.splice(j, 0, s.ej.splice(i, 1)[0]); draw(); }, 'ejercicio') : null), () => sacar(s.ej, i, e.n || 'Ejercicio', draw))),
      h('button', { class: 'btn sec', style: 'align-self:flex-start', onclick: () => { s.ej.push({ n: '', s: '3×10', c: true }); draw(); } }, '+ Ejercicio'));
  }
  draw(); pintarDias();
  sheet({ title: orig ? 'Editar sesión' : 'Nueva sesión', body: [field('Nombre', t), h('div', {}, h('div', { class: 'label', style: 'margin-bottom:6px' }, 'Días en que la haces'), dias, aviso), h('div', {}, h('div', { class: 'label', style: 'margin-bottom:6px' }, 'Duración'), h('div', { class: 'pair', style: 'grid-template-columns:1fr 1fr' }, durValor, durUnidad)), h('div', { class: 'label' }, 'Ejercicios'), lista],
    onSave: () => {
      if (!t.value.trim()) return 'Escribe el nombre de la sesión.';
      let min = '';
      if (durValor.value.trim() !== '') { const n = num(durValor.value, NaN); if (!(n > 0)) return 'Escribe la duración con números, por ejemplo 60 o 1,5.'; if (durUnidad.value === 'min' && n > 600) return 'Son más de 10 horas. Cambia la unidad a horas.'; if (durUnidad.value === 'h' && n > 10) return 'La duración máxima es de 10 horas.'; min = `${L.kgTxt(Math.round(n * 100) / 100)} ${durUnidad.value === 'h' ? 'h' : 'min'}`; }
      const nueva = { id: s.id, dias: [...s.dias].sort(), t: t.value.trim(), min, ej: s.ej.filter((e) => e.n.trim()).map((e) => ({ n: e.n.trim(), s: e.s.trim(), c: !!e.c })) };
      const i = data.entreno.sesiones.findIndex((x) => x.id === s.id);   // se queda donde la hayas puesto; una nueva va al final
      if (i >= 0) data.entreno.sesiones[i] = nueva; else data.entreno.sesiones.push(nueva); commit();
    },
    extra: orig ? h('div', { class: 'row', style: 'padding:0;gap:4px' }, h('button', { class: 'btn danger', onclick: () => confirmSheet('¿Borrar sesión?', `Se eliminará “${orig.t}”. Tus kilos anotados se conservan.`, 'Borrar', () => { data.entreno.sesiones = data.entreno.sesiones.filter((x) => x.id !== s.id); commit(); sheets.slice().forEach((x) => x.close()); }) }, 'Borrar'),
      h('button', { class: 'btn plain', onclick: () => { const c = clone(orig); c.id = L.idSesionNueva(data); c.dias = []; c.t = `${orig.t} (copia)`; data.entreno.sesiones.push(c); commit(); sheets.slice().forEach((x) => x.close()); toast('Sesión duplicada. Cámbiale el nombre y los días.'); } }, 'Duplicar')) : null });
}
/* Cambiar el entreno de un día concreto sin tocar tu plan semanal */
export function cambiarEntrenoDia(f, modo = 'cambiar') {
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
export function anadirEntrenoHoy(f) { if (!data.entreno.sesiones.length) return editSesion(null); cambiarEntrenoDia(f, 'anadir'); }
/* Quitar el entreno de hoy (deslizando en Hoy): hoy es descanso; el plan no se toca y se puede deshacer. */
export function quitarEntrenoHoy(f, d) {
  const dr = diaReg(f), antes = { entreno: dr.entreno, bloques: dr.bloques, bloquesQuitar: dr.bloquesQuitar };
  delete dr.bloques; delete dr.bloquesQuitar; if (L.sesionGym(data, L.idxDia(d))) dr.entreno = 'descanso'; else delete dr.entreno;
  commit();
  toast('Entreno de hoy quitado.', () => { const r = diaReg(f); for (const k of Object.keys(antes)) { if (antes[k] === undefined) delete r[k]; else r[k] = antes[k]; } commit(); });
}
export function barraEntreno(d, f) {
  if (L.sesionDelDia(data, d)) return null;   // si hay entreno, se abre y se cambia desde su tarjeta
  return h('div', { class: 'row', style: 'padding:0 4px;min-height:0' }, h('div', { class: 'grow small mute', id: 'entreno-hoy' }, 'Hoy toca descanso'),
    h('button', { class: 'btn plain', id: 'cambiar-entreno', onclick: () => anadirEntrenoHoy(f) }, 'Añadir entreno'));
}
export function bienvenida() {
  if (S.bienvenida && sheets.includes(S.bienvenida)) return;   // ya está abierta
  const T = makeTemplate();
  const nombre = h('input', { type: 'text', placeholder: 'Tu nombre' });
  const kcal = h('input', { type: 'number', value: String(T.perfil.objetivos.gym.kcal) }), prot = h('input', { type: 'number', value: String(T.perfil.objetivos.gym.prot) });
  let calcR = null, cuerpoR = null;
  const aplicar = (base) => {
    const k = Math.max(0, num(kcal.value)), p = Math.max(0, num(prot.value));
    setData(base); data.perfil = { ...data.perfil, listo: true, nombre: nombre.value.trim(), objetivos: calcR ? { gym: { kcal: calcR.gym, prot: calcR.prot }, sin: { kcal: calcR.sin, prot: calcR.prot } } : { gym: { kcal: k, prot: p }, sin: { kcal: Math.round(k * 0.92), prot: p } }, ...(cuerpoR ? { cuerpo: cuerpoR } : {}) };
    data.meta = { ...(data.meta || {}), guia: true };   // primeros pasos: solo para quien empieza
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
