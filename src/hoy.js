// Pantalla Hoy: comidas del día, extras, para cocinar y el entreno de hoy.
import * as L from './logic.js';
import { normalizar } from './alimentos.js';
import * as Nube from './cloud.js';
import { h, icon, clone, num, toast, sacar, deslizable, sheets, sheet, field, swt } from './ui.js';
import { buscarAlimento, macroTxt, r1, f1, itemsEditor, itemsText } from './campos.js';
import { data, diaReg, commit, toggleHecho, S, setEj, guardarLocal } from './core.js';
import { NOMBRE_COMIDA, elegirPlato, editSesion, cambiarEntrenoDia, quitarEntrenoHoy, barraEntreno } from './editores.js';
import { irAuth } from './cuenta.js';
import { render, go } from './app.js';

/* ---------- extras (comida fuera del plan) ---------- */
export function anadirExtra(f) {
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
export function extrasCard(f) {
  const ex = L.extrasDe(data, f);
  return h('section', { class: 'stack', style: 'gap:8px' },
    h('div', { class: 'row', style: 'padding:0 4px;min-height:0' }, h('div', { class: 'label grow' }, 'Extras de hoy'), h('button', { class: 'btn plain', id: 'add-extra', onclick: () => anadirExtra(f) }, '+ Añadir comida')),
    ex.length ? h('div', { class: 'group' }, ex.map((e, i) => deslizable(h('div', { class: 'row' }, h('div', { class: 'grow' }, e.n, h('div', { class: 'sub num' }, `${f1(e.q)} ${e.u === 'ud' ? 'ud' : e.u} · ${e.k} kcal · P ${f1(e.p)} g`)),
      h('button', { class: 'chev', 'aria-label': 'Quitar ' + e.n, onclick: () => sacar(ex, i, e.n, commit) }, '×')), () => sacar(ex, i, e.n, commit))))
      : h('p', { class: 'mute small', style: 'padding-left:4px' }, 'Lo que comas fuera del plan se suma a tu día.'));
}
export function macroBar(t) {
  const r = L.repartoMacros(t); if (!r || !t.completo) return null;
  const punto = (c, txt) => h('span', { class: 'leg' }, h('b', { class: 'dot ' + c }), txt);
  return h('div', { class: 'metric' }, h('div', { class: 'top' }, h('span', { class: 'label' }, 'Reparto de energía'), h('span', { class: 'mute small num' }, `C ${f1(t.c)} g · G ${f1(t.f)} g`)),
    h('div', { class: 'stackbar', role: 'img', 'aria-label': `Proteína ${r.p} %, hidratos ${r.c} %, grasa ${r.f} %` }, h('i', { class: 'sp', style: `width:${r.p}%` }), h('i', { class: 'sc', style: `width:${r.c}%` }), h('i', { class: 'sf', style: `width:${r.f}%` })),
    h('div', { class: 'legend' }, punto('sp', `Proteína ${r.p} %`), punto('sc', `Hidratos ${r.c} %`), punto('sf', `Grasa ${r.f} %`)));
}
/* ---------- vistas ---------- */
export function slotEl(s, f, ahora, hecho) {
  const contenido = [h('span', { class: 'kind' }, s.kind), h('h3', {}, s.title), s.det ? h('p', { class: 'det' }, s.det) : null,
    s.progreso != null ? h('div', { class: 'bar', style: 'margin-top:8px' }, h('i', { style: `width:${Math.round(s.progreso * 100)}%` })) : null];
  return h('div', { class: 'slot' + (hecho ? ' hecho' : '') + (s.k === ahora ? ' ahora' : '') },
    h('span', { class: 'hora' }, s.hora),
    s.accion ? h('div', { class: 'slot-col' }, h('button', { class: 'slot-main', id: 'slot-' + s.k, type: 'button', onclick: s.accion, 'aria-label': `${s.kind}: ${s.title}. ${s.aria || 'Abrir'}` }, ...contenido), s.extra || null)
      : h('div', {}, ...contenido, s.extra || null),
    h('button', { class: 'chk', 'aria-pressed': String(hecho), 'aria-label': (hecho ? 'Desmarcar: ' : 'Marcar como hecho: ') + s.kind, onclick: () => toggleHecho(f, s.k) }, icon('check')));
}
/* Para cocinar: las cantidades del plato de hoy para todos los que comen, con el reparto de cada uno y casillas para ir marcando. */
export function cocinar(d, k) {
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
export const PORCIONES = [[0.5, '½'], [0.75, '¾'], [1, '1×'], [1.25, '1¼'], [1.5, '1½'], [2, '2×']];
export function cambiarComidaHoy(f, d, k) {
  const nombre = NOMBRE_COMIDA[k], cambiado = !!L.cambioDe(data, f, k), actual = L.platoDelDia(data, d, k), plan = L.platoDelDia(data, d, k, { cambios: false });
  // El plato guarda las cantidades de todos; aquí se editan solo las tuyas y al guardar se vuelve al total
  const mia = (id, q) => { const x = L.miCantidad(data, id, q, k); return L.ing(data, id).u === 'ud' ? x : Math.round(x); }, memoria = new Map();
  const suyas = (items) => (items || []).map(([id, q]) => [id, mia(id, q)]);
  const recordar = (items) => (items || []).forEach(([id, q]) => memoria.set(id, [mia(id, q), q]));
  const totales = (items) => items.map(([id, q]) => { const m = memoria.get(id); const t = m && Math.abs(m[0] - q) < 1e-9 ? m[1] : L.cantidadTotal(data, id, q, k); return [id, L.ing(data, id).u === 'ud' ? t : Math.round(t)]; });   // en gramos, sin decimales
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
export function anadirEjercicio(f) {
  const d = L.parseISO(f), ses = L.sesionDelDia(data, d), hoy = new Set(L.ejerciciosDelDia(data, d).map((e) => L.slug(e.n))), gHoy = ses ? L.grupoSesion(ses.t) : null;
  const mios = L.catalogoEjercicios(data).filter((x) => !hoy.has(x.k)).sort((a, b) => (b.grupo === gHoy) - (a.grupo === gHoy) || ((b.ultimo || {}).f || '').localeCompare((a.ultimo || {}).f || ''));
  const nom = h('input', { type: 'text', id: 'ej-nombre', placeholder: 'Escribe o elige uno de los tuyos', autocomplete: 'off' }), sug = h('div', { class: 'group', id: 'ej-sug' });
  const series = h('input', { type: 'number', id: 'ej-series', min: 1, max: 20, step: 1, inputmode: 'numeric', value: '3' }), reps = h('input', { type: 'text', id: 'ej-reps', value: '10', placeholder: 'Ej. 8, 8-12 o 40 s' });
  const alternar = (b) => () => b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true'));
  const peso = swt(true, () => alternar(peso)(), 'Lleva peso'), plan = swt(false, () => alternar(plan)(), 'Guardar también en mi sesión'); plan.id = 'ej-plan';
  const elegir = (x) => { nom.value = x.n; const m = String(x.s || '').match(/^\s*(\d+)\s*[×xX*]\s*(.+?)\s*$/); if (m) { series.value = m[1]; reps.value = m[2]; } peso.setAttribute('aria-checked', String(!!x.c)); pintarSug(); };
  function pintarSug() {
    const t = normalizar(nom.value.trim()), exacto = mios.some((x) => normalizar(x.n) === t), vis = exacto ? [] : (t ? mios.filter((x) => normalizar(x.n).includes(t)) : mios.filter((x) => x.grupo === gHoy)).slice(0, 4);
    sug.hidden = !vis.length; sug.replaceChildren(...vis.map((x) => h('button', { type: 'button', class: 'row tap', onclick: () => elegir(x) }, h('div', { class: 'grow' }, x.n, h('div', { class: 'sub num' }, [x.s, x.ultimo ? `${L.kgTxt(x.ultimo.kg)} kg` : ''].filter(Boolean).join(' · '))), h('span', { class: 'chev' }, '+'))));
  }
  nom.addEventListener('input', pintarSug); pintarSug();
  sheet({ title: 'Añadir ejercicio', save: 'Añadir', body: [field('Ejercicio', nom), sug, h('div', { class: 'pair' }, field('Series', series), field('Repeticiones', reps)),
    h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, 'Lleva peso', h('div', { class: 'sub' }, 'Para registrar los kilos que usas.')), peso),
    ses ? h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, 'Guardar también en mi sesión', h('div', { class: 'sub' }, `Si no, solo se añade a hoy. Sesión: ${ses.t}.`)), plan) : null].filter(Boolean),
  onSave: () => {
    const n = nom.value.trim(), sr = parseInt(series.value, 10), rp = reps.value.trim(); if (!n) return 'Escribe el nombre del ejercicio.'; if (!(sr >= 1)) return 'Escribe cuántas series.'; if (!rp) return 'Escribe las repeticiones.';
    if (hoy.has(L.slug(n))) return 'Ese ejercicio ya está en el entreno de hoy.';
    const nuevo = { n, s: `${sr}×${rp}`, c: peso.getAttribute('aria-checked') === 'true' }, r = diaReg(f);
    if (ses && plan.getAttribute('aria-checked') === 'true') { const real = data.entreno.sesiones.find((y) => y.id === ses.id); if (real && !real.ej.some((e) => L.slug(e.n) === L.slug(n))) real.ej.push(nuevo); if (r.ejQuitar) r.ejQuitar = r.ejQuitar.filter((k) => k !== L.slug(n)); toast(`Guardado en “${ses.t}”.`); }
    else (r.ejExtra ||= []).push(nuevo);
    commit(); if (S.entrenoGrande) S.entrenoGrande();
  } });
}
/* Sumar otra sesión (un bloque: Brazo, Cardio…) al entreno de hoy: sale todo como un solo entreno y el plan no cambia. */
/* Elegir qué haces hoy de entre todos tus ejercicios del grupo de la sesión (Pierna, Push…): se marcan y desmarcan; el plan no se toca. */
export function elegirEjerciciosHoy(f) {
  const d = L.parseISO(f), ses = L.sesionDelDia(data, d); if (!ses) return;
  const grupos = new Set([ses, ...L.bloquesDelDia(data, d)].map((x) => L.grupoSesion(x.t)).filter((g) => g !== 'otros')), nombres = L.GRUPOS_EJ.filter(([g]) => grupos.has(g)).map(([, t]) => t);
  const q = h('input', { type: 'search', id: 'elegir-buscar', placeholder: 'Buscar ejercicio', autocomplete: 'off' }), lista = h('div', { class: 'group', id: 'elegir-lista' }), cuenta = h('p', { class: 'mute small', id: 'elegir-cuenta' });
  const alternar = (x, puesto) => {
    const r = diaReg(f), enPlan = [ses, ...L.bloquesDelDia(data, d)].some((y) => y.ej.some((e) => L.slug(e.n) === x.k));
    if (puesto) { if (r.ejExtra && r.ejExtra.some((e) => L.slug(e.n) === x.k)) { r.ejExtra = r.ejExtra.filter((e) => L.slug(e.n) !== x.k); if (!r.ejExtra.length) delete r.ejExtra; } else r.ejQuitar = [...(r.ejQuitar || []), x.k]; }
    else if (enPlan) { r.ejQuitar = (r.ejQuitar || []).filter((k) => k !== x.k); if (!r.ejQuitar.length) delete r.ejQuitar; }
    else (r.ejExtra ||= []).push({ n: x.n, s: x.s || '3×10', c: !!x.c });
    commit(); pintar(); if (S.entrenoGrande) S.entrenoGrande();
  };
  function pintar() {
    const hoy = new Set(L.ejerciciosDelDia(data, d).map((e) => L.slug(e.n))), t = normalizar(q.value.trim());
    const todos = L.catalogoEjercicios(data).filter((x) => !grupos.size || grupos.has(x.grupo) || hoy.has(x.k)), vis = t ? todos.filter((x) => normalizar(x.n).includes(t)) : todos;
    cuenta.textContent = `${hoy.size} ${hoy.size === 1 ? 'ejercicio' : 'ejercicios'} para hoy`;
    lista.replaceChildren(...(vis.length ? vis.map((x) => h('button', { type: 'button', class: 'item', id: 'elegir-' + x.k, 'aria-pressed': String(hoy.has(x.k)), onclick: () => alternar(x, hoy.has(x.k)) },
      h('span', { class: 'box', 'aria-hidden': 'true', 'aria-pressed': String(hoy.has(x.k)) }, icon('check')), h('span', { class: 'nm' }, h('span', { class: 'nm-t' }, x.n), h('small', { class: 'reparto' }, [x.s, x.ultimo ? `${L.kgTxt(x.ultimo.kg)} kg` : ''].filter(Boolean).join(' · ')))))
      : [h('p', { class: 'mute small', style: 'padding:14px' }, 'Ningún ejercicio coincide.')]));
  }
  q.addEventListener('input', pintar); pintar();
  sheet({ title: nombres.length ? `Ejercicios de ${nombres.join(' y ')}` : 'Tus ejercicios', cancel: 'Listo', body: [cuenta, q, lista, h('p', { class: 'mute small' }, 'Marca lo que vas a hacer hoy. Solo cambia hoy: tu sesión del plan sigue igual.')] });
}
export function anadirBloque(f) {
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
export function abrirEntrenoHoy(f) {
  const d = L.parseISO(f), cuerpo = h('div', { class: 'stack', style: 'gap:18px' });
  const guardar = (k, patch) => { setEj(f, k, patch); pintar(); };
  // Series y repeticiones de hoy: se pueden cambiar solo para hoy o también en el plan
  const editarSeries = (ses, e, k, x) => {
    const actual = x.s || e.s, m = String(actual).match(/^\s*(\d+)\s*[×xX*]\s*(.+?)\s*$/);
    const series = h('input', { type: 'number', id: 'ser-series', min: 1, max: 20, step: 1, inputmode: 'numeric', value: m ? m[1] : '' }), reps = h('input', { type: 'text', id: 'ser-reps', value: m ? m[2] : String(actual), placeholder: 'Ej. 8, 8-12 o 40 s' });
    const plan = swt(false, () => { plan.setAttribute('aria-checked', String(plan.getAttribute('aria-checked') !== 'true')); }, 'Cambiar también en mi plan');
    // Peso de cada serie (opcional): si subes o bajas entre series
    const porSerie = h('div', { class: 'kgs', id: 'ser-kgs' }), valores = Array.isArray(x.kgs) ? x.kgs.slice() : [];
    const pintarKgs = () => { const n = Math.min(12, Math.max(0, parseInt(series.value, 10) || 0)); porSerie.replaceChildren(...Array.from({ length: n }, (_, i) => h('input', { type: 'text', inputmode: 'decimal', class: 'kg-serie', 'aria-label': `Kilos de la serie ${i + 1}`, placeholder: String(i + 1), value: valores[i] != null ? L.kgTxt(valores[i]) : '', oninput: (ev) => { const v = ev.target.value.trim(); valores[i] = v === '' ? null : num(v, NaN); } }))); };
    series.addEventListener('input', pintarKgs); pintarKgs();
    sheet({ title: e.n, save: 'Guardar', body: [h('div', { class: 'pair' }, field('Series', series), field('Repeticiones', reps)),
      e.c ? h('div', {}, h('div', { class: 'label', style: 'margin-bottom:6px' }, 'Kilos de cada serie (opcional)'), porSerie) : null,
      e.extra ? null : h('div', { class: 'row', style: 'padding:0;min-height:0' }, h('div', { class: 'grow' }, 'Cambiar también en mi plan', h('div', { class: 'sub' }, `Si no, solo cambia hoy. Plan actual: ${e.s}.`)), plan)],
      onSave: () => {
        const sr = parseInt(series.value, 10), rp = reps.value.trim(); if (!(sr >= 1)) return 'Escribe cuántas series.'; if (!rp) return 'Escribe las repeticiones.';
        const nuevo = `${sr}×${rp}`;
        if (e.c) { const ks = valores.slice(0, sr); if (ks.some((v) => v != null && !(Number.isFinite(v) && v >= 0 && v <= 999))) return 'Escribe los kilos de cada serie como número.';
          const llenos = ks.filter((v) => v != null); if (llenos.length) setEj(f, k, { kgs: Array.from({ length: sr }, (_, i) => (ks[i] == null ? null : Math.round(ks[i] * 100) / 100)), kg: Math.max(...llenos) }); else if (x.kgs) setEj(f, k, { kgs: null }); }
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
    const k = L.slug(e.n), x = reg[k] || {}, u = e.c ? L.ultimoPeso(data, k, f) : null, nota = L.notaEjercicio(data, k);
    const kgActual = x.kg != null ? x.kg : (u ? u.kg : null), sugerido = x.kg == null && !!u;     // si hoy no has puesto nada, se recuerda el de la última vez
    const mover = (delta) => guardar(k, { kg: Math.max(0, Math.round(((kgActual ?? 0) + delta) * 100) / 100) });
    const kg = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', id: 'kg-' + k, class: 'kg' + (sugerido ? ' sugerido' : ''), 'aria-label': 'Kilos de ' + e.n, placeholder: '—', value: kgActual != null ? L.kgTxt(kgActual) : '', onchange: (ev) => {
      const v = ev.target.value.trim(); if (v === '') return guardar(k, { kg: null });
      const n = num(v, NaN); if (!Number.isFinite(n) || n < 0 || n > 999) return toast('Escribe los kilos como número, por ejemplo 82,5.'); guardar(k, { kg: Math.round(n * 100) / 100 }); } });
    return deslizable(h('div', { class: 'ficha' + (x.hecho ? ' hecho' : ''), id: 'ficha-' + k },
      h('div', { class: 'ficha-top' },
        h('button', { class: 'chk', id: 'hecho-' + k, 'aria-pressed': String(!!x.hecho), 'aria-label': (x.hecho ? 'Desmarcar ' : 'Marcar como hecho: ') + e.n,
          onclick: () => { const mejor = L.mejorPeso(data, k, f); guardar(k, { hecho: !x.hecho, ...(!x.hecho && x.kg == null && u ? { kg: u.kg } : {}) }); if (!x.hecho && mejor != null && kgActual != null && kgActual > mejor) toast(`Nueva marca en ${e.n}: ${L.kgTxt(kgActual)} kg`); } }, icon('check')),   // al marcarlo se guarda el peso recordado
        h('div', { class: 'grow' }, h('div', { class: 'ficha-nombre' }, e.n, e.extra ? h('span', { class: 'tag' }, 'Extra') : null),
          h('button', { type: 'button', class: 'esquema', id: 'esq-' + k, 'aria-label': `Cambiar series y repeticiones de ${e.n}`, onclick: () => editarSeries(ses, e, k, x) }, h('span', { class: 'num' }, x.s || e.s), x.s && !e.extra ? h('span', { class: 'mute small' }, ` · plan ${e.s}`) : null, h('span', { class: 'chev' }, ' ›'))),
        h('button', { type: 'button', class: 'x quitar-ej', id: 'quitar-' + k, 'aria-label': 'Quitar ' + e.n + ' de hoy', onclick: () => quitarEj(e, k) }, '×')),
      h('div', { class: 'ficha-campos' },
        e.c ? h('div', { class: 'campo' }, h('span', { class: 'label' }, 'Peso'), h('div', { class: 'kgbox' }, h('button', { type: 'button', class: 'mas', 'aria-label': 'Quitar 2,5 kg', onclick: () => mover(-2.5) }, '−'), kg, h('span', { class: 'kgu' }, 'kg'), h('button', { type: 'button', class: 'mas', 'aria-label': 'Sumar 2,5 kg', onclick: () => mover(2.5) }, '+'))) : null,
        ),
      Array.isArray(x.kgs) && x.kgs.some((v) => v != null) ? h('div', { class: 'mute small num', id: 'kgs-' + k }, 'Por serie: ' + x.kgs.map((v) => (v == null ? '—' : L.kgTxt(v))).join(' · ') + ' kg') : null,
      u ? h('div', { class: 'mute small' }, `${sugerido ? 'Peso de la última vez' : 'Última vez'}: ${L.kgTxt(u.kg)} kg · ${L.fechaCorta(L.parseISO(u.f))}`) : null,
      nota ? h('div', { class: 'nota-ej small', id: 'nota-' + k }, nota.t || '', nota.t && nota.v ? ' · ' : '', nota.v && L.esEnlace(nota.v) ? h('a', { href: nota.v, target: '_blank', rel: 'noopener' }, 'Ver vídeo') : null) : null), () => quitarEj(e, k), 'Quitar', 'ficha-sw');
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
      h('div', { class: 'row', style: 'padding:0;min-height:0;flex-wrap:wrap;gap:4px 12px' }, h('button', { class: 'btn sec', id: 'ej-elegir', onclick: () => elegirEjerciciosHoy(f) }, 'Elegir ejercicios'), h('button', { class: 'btn sec', id: 'ej-anadir', onclick: () => anadirEjercicio(f) }, '+ Nuevo'), h('button', { class: 'btn sec', id: 'bloque-anadir', onclick: () => anadirBloque(f) }, '+ Añadir otra sesión'),
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
export function saludo() {
  const hr = new Date().getHours(), t = hr < 6 ? 'Buenas noches' : hr < 14 ? 'Buenos días' : hr < 21 ? 'Buenas tardes' : 'Buenas noches';
  return data.perfil.nombre ? `${t}, ${data.perfil.nombre}` : t;
}
export function avisoInstalar() {
  if (window.rutina || localStorage.getItem('rutina-ocultar-instalar')) return null;
  const instalada = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; if (instalada) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios && !S.instalarEvento) return null;
  const ocultar = h('button', { class: 'btn plain', 'aria-label': 'Ocultar este aviso', onclick: () => { try { localStorage.setItem('rutina-ocultar-instalar', '1'); } catch { /* sin almacenamiento */ } S.instalarOculto = true; render(); } }, '✕');
  if (S.instalarOculto) return null;
  return ios ? h('div', { class: 'banner', id: 'aviso-instalar', role: 'note' }, h('span', { class: 'grow' }, 'Instala Rutina: toca ', h('b', {}, 'Compartir'), ' y elige ', h('b', {}, '«Añadir a pantalla de inicio»'), '.'), ocultar)
    : h('div', { class: 'banner', id: 'aviso-instalar', role: 'note' }, h('span', { class: 'grow' }, 'Instala Rutina en tu dispositivo para usarla como una app.'), h('button', { class: 'btn', onclick: async () => { S.instalarEvento.prompt(); await S.instalarEvento.userChoice; S.instalarEvento = null; render(); } }, 'Instalar'), ocultar);
}
export function recordatorioCuenta() {
  if (!Nube.nubeActiva() || Nube.haySesion() || (data.meta || {}).ocultarCuenta) return null;
  return h('div', { class: 'banner', role: 'note' }, h('span', { class: 'grow' }, 'Crea una cuenta para no perder tus datos y usar Rutina en otros dispositivos.'),
    h('button', { class: 'btn', onclick: () => irAuth('crear') }, 'Crear cuenta'),
    h('button', { class: 'btn plain', 'aria-label': 'Ocultar este aviso', onclick: () => { data.meta = data.meta || {}; data.meta.ocultarCuenta = true; guardarLocal(); } }, '✕'));
}
/* Primeros pasos: una tarjeta corta para quien acaba de empezar; se cierra y no vuelve. */
export function primerosPasos() {
  if (!(data.meta || {}).guia) return null;
  const paso = (t, d) => h('li', {}, h('b', {}, t), ' ', d);
  return h('section', { class: 'card guia', id: 'guia' }, h('h2', { class: 'sec' }, 'Primeros pasos'),
    h('ol', { class: 'guia-lista' }, paso('Menú.', 'Toca un plato para cambiarlo o crear el tuyo.'), paso('Hoy.', 'Marca lo que vas haciendo; toca una comida si hoy comes otra cosa.'), paso('Entreno.', 'Crea tus sesiones y apunta los kilos de cada ejercicio.'), paso('¿Comes con alguien?', 'Dilo en Ajustes › Perfil › Personas en casa.')),
    h('button', { class: 'btn sec', id: 'guia-cerrar', style: 'align-self:flex-start', onclick: () => { delete data.meta.guia; guardarLocal(); } }, 'Entendido'));
}
export function viewHoy() {
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
    avisoInstalar(), recordatorioCuenta(), primerosPasos(),
    h('div', { class: 'cols' },
      h('div', { class: 'stack' }, slots.length ? h('div', { class: 'group' }, slots.map((s) => (s.k === 'gym' ? deslizable(slotEl(s, f, sig && sig.k, !!hechos[s.k]), () => quitarEntrenoHoy(f, d), 'Quitar', 'swipe-slot') : slotEl(s, f, sig && sig.k, !!hechos[s.k])))) :
        h('div', { class: 'card empty' }, h('p', {}, 'Hoy no tienes nada en el plan.'), h('button', { class: 'btn', onclick: () => go('semana') }, 'Preparar el menú')), slots.length ? h('p', { class: 'mute small', style: 'padding:0 4px' }, 'Toca una comida para cambiar el plato o las cantidades de hoy.') : null, barraEntreno(d, f), extrasCard(f)),
      h('div', { class: 'stack' },
        t ? h('section', { class: 'card', id: 'nutricion' }, h('h2', { class: 'sec' }, 'Nutrición'), metric('Proteína', c.p, o.prot, 'g'), metric('Energía', c.k, o.kcal, 'kcal', true), c.k > 0 ? macroBar(c) : null,
          h('p', { class: 'mute small', id: 'nutricion-nota' }, c.k > 0 ? `Suma lo que has marcado como hecho${c.extras ? `, con ${L.miles(c.extras)} kcal de extras` : ''}. ` : 'Se irá completando según marques las comidas como hechas. ', t.k > c.k ? `Faltan ${L.miles(t.k - c.k)} kcal de lo previsto hoy.` : '')) : null,
        h('section', { class: 'card' }, h('h2', { class: 'sec' }, 'Progreso'),
          h('div', { class: 'metric' }, h('div', { class: 'top' }, h('span', { class: 'label' }, 'Hecho hoy'), h('span', { class: 'num mute small' }, `${hechas} de ${slots.length}`)), h('div', { class: 'bar' }, h('i', { style: `width:${slots.length ? hechas / slots.length * 100 : 0}%` }))),
          h('div', { class: 'label' }, 'Comidas de los últimos 7 días'), h('div', { class: 'week7' }, siete),
          h('p', { class: 'mute small' }, r > 0 ? `Llevas ${r} ${r === 1 ? 'día completo seguido' : 'días completos seguidos'}.` : `Marca las ${total} comidas de un día para empezar una racha.`)))));
}
