// Pantallas Menú, Compra y Entreno.
import * as L from './logic.js';
import { h, icon, clone, toast, sacar, deslizable, sheet, confirmSheet, field, seg, rowOf } from './ui.js';
import { data, S, commit } from './core.js';
import { editPlato, NOMBRE_COMIDA, recomendarMenu, abrirComidasHorarios, nombresHogar, editSesion, ordenBtns } from './editores.js';
import { itemsText, f1 } from './campos.js';
import { irAj } from './ajustes.js';
import { render, go } from './app.js';

export function platoBtn(semana, i, m) {
  const pl = semana[i][m], s = pl && !pl.libre ? L.sumaItems(data, pl.items, m) : null;
  return h('button', { class: 'plato meal', id: `plato-${m}-${i}`, onclick: () => editPlato(semana, i, m) },
    h('div', { class: 'mb' }, h('span', { class: 'label' }, NOMBRE_COMIDA[m]),
      pl ? [h('h3', {}, pl.libre ? 'Comida libre' : pl.t), pl.libre ? null : h('p', { class: 'det' }, itemsText(pl.items))] : h('h3', { class: 'add' }, '+ Añadir')),
    pl ? h('span', { class: 'kc num' }, pl.libre ? `~${L.miles(data.perfil.libre.kcal)} kcal` : h('span', {}, `${L.miles(s.k)} kcal`, h('small', {}, `P ${f1(s.p)} g`))) : null);
}
export function fijaBtn(semana, i, c, d) {
  const f = L.fijoDia(data, d, c), kc = L.sumaItems(data, f.items, c).k;
  return h('button', { class: 'mini meal' + (f.propio ? ' propio' : ''), id: `fija-${c}-${i}`, onclick: () => editPlato(semana, i, c) },
    h('div', { class: 'mb' }, h('span', { class: 'label' }, NOMBRE_COMIDA[c]), h('span', { class: 'mt' }, f.texto || '—')),
    h('span', { class: 'mk num' }, f.items.length ? `${L.miles(kc)} kcal` : 'Sin ingredientes'));
}
export function viewSemana() {
  const lun = L.addDays(L.lunesDe(L.hoy()), S.semSel * 7), w = L.semanaIdx(data, lun), semana = data.menu.semanas[w], fh = L.iso(L.hoy()), n = data.menu.semanas.length;
  const dias = semana.map((_, i) => { const d = L.addDays(lun, i); return { d, i, t: L.totalDia(data, d, { extras: false, cambios: false }), o: L.objetivo(data, d) }; });
  const conPlan = dias.filter((x) => x.t && x.t.k > 0), media = conPlan.length ? { k: conPlan.reduce((a, x) => a + x.t.k, 0) / conPlan.length, p: conPlan.reduce((a, x) => a + x.t.p, 0) / conPlan.length } : null;
  const protObj = dias.reduce((a, x) => a + (x.o.prot || 0), 0) / 7, otra = n > 1 ? (w + 1) % n : null;
  const copiarSemana = () => confirmSheet(`¿Copiar a la semana ${otra + 1}?`, `La semana ${otra + 1} del ciclo quedará igual que esta. Lo que tenía se reemplaza.`, 'Copiar', () => { const antes = clone(data.menu.semanas[otra]); data.menu.semanas[otra] = clone(semana); commit(); toast(`Semana ${otra + 1} copiada.`, () => { data.menu.semanas[otra] = antes; commit(); }); });
  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, 'Menú'), h('p', { class: 'subtitle' }, n > 1 ? `Semana ${w + 1} de ${n} del ciclo` : 'Se repite cada semana')),
      h('div', { class: 'row', style: 'gap:10px;flex-wrap:wrap;padding:0' }, h('button', { class: 'btn sec', id: 'recomendar', onclick: () => recomendarMenu(lun, semana) }, 'Recomendar menú'), h('button', { class: 'btn sec', id: 'comidas-horarios', onclick: abrirComidasHorarios }, 'Comidas y horarios'), seg([[0, 'Esta semana'], [1, 'La que viene']], S.semSel, (v) => { S.semSel = v; render(); }))),
    media ? h('div', { class: 'card', style: 'flex-direction:row;flex-wrap:wrap;gap:12px 32px' },
      h('div', { class: 'metric' }, h('span', { class: 'label' }, 'Media diaria'), h('b', { class: 'num', id: 'media-kcal' }, `${L.miles(media.k)} kcal`)),
      h('div', { class: 'metric' }, h('span', { class: 'label' }, 'Proteína media'), h('b', { class: 'num', id: 'media-prot' }, `${L.miles(media.p)} g`)),
      h('div', { class: 'metric' }, h('span', { class: 'label' }, 'Objetivo medio'), h('b', { class: 'num' }, `${L.miles(dias.reduce((a, x) => a + x.o.kcal, 0) / 7)} kcal`))) : null,
    media && protObj && media.p < protObj * 0.9 ? h('p', { class: 'small aviso-prot', id: 'aviso-prot' }, `Tu menú da de media ${L.miles(media.p)} g de proteína y tu objetivo son ${L.miles(protObj)} g. Sube las raciones de carne, pescado, huevo o lácteos.`) : null,
    h('p', { class: 'mute small' }, (L.hogar(data).length ? 'Toca un plato para editarlo y, si quieres, repetirlo en otros días. Las cantidades son las del plato completo; las calorías que ves son solo las tuyas.' : 'Toca un plato para editarlo y, si quieres, repetirlo en otros días. Las cantidades son por persona.')),
    h('div', { class: 'group' }, dias.map(({ d, i, t, o }) => {
      const pct = t && o.kcal ? Math.min(100, t.k / o.kcal * 100) : 0, pasa = t && o.kcal && t.k > o.kcal * 1.05;
      return h('div', { class: 'dayrow' + (L.iso(d) === fh ? ' hoy' : '') }, h('div', { class: 'dn' }, L.DIAS[i], h('small', {}, L.fechaCorta(d) + (L.esDiaGym(data, d) ? ' · con entreno' : '')),
        t && t.k > 0 ? h('div', { class: 'dtot num' }, h('span', { class: pasa ? 'over' : '' }, `${L.miles(t.k)} kcal`), h('span', { class: 'mute', style: 'margin-left:8px;white-space:nowrap' }, `P ${L.miles(t.p)} g`), h('div', { class: 'bar' + (pasa ? ' over' : '') }, h('i', { style: `width:${pct}%` }))) : null),
        h('div', { class: 'meals' }, ['desayuno', 'media', 'comida', 'merienda', 'cena'].filter((m) => !L.FIJAS.includes(m) || L.fijoOn(data, m)).map((m) => (L.FIJAS.includes(m) ? fijaBtn(semana, i, m, d) : platoBtn(semana, i, m))))); })),
    otra != null ? h('button', { class: 'btn plain', id: 'copiar-semana', style: 'align-self:flex-start', onclick: copiarSemana }, `Copiar esta semana a la semana ${otra + 1}`) : null);
}
export function anadirCompra() {
  const nom = h('input', { type: 'text', id: 'compra-nombre', placeholder: 'Ej. Papel de cocina', autocomplete: 'off' }), cant = h('input', { type: 'text', id: 'compra-cant', placeholder: 'Opcional, ej. 2 packs' });
  let sec = 'despensa';
  const chips = h('div', { class: 'chips', id: 'compra-secc', role: 'group', 'aria-label': 'Sección del súper' }), pintar = () => chips.replaceChildren(...L.SECC.map(([v, t]) => h('button', { type: 'button', class: 'chipopt', id: 'compra-s-' + v, 'aria-pressed': String(sec === v), onclick: () => { sec = v; pintar(); } }, t)));
  pintar();
  sheet({ title: 'Añadir a la lista', body: [field('Qué necesitas', nom), field('Cantidad', cant), h('div', { class: 'field' }, h('span', {}, 'Sección'), chips), h('p', { class: 'mute small' }, 'Se queda en la lista hasta que la quites, aunque cambie la semana.')], save: 'Añadir',
    onSave: () => { const n = nom.value.trim(); if (!n) return 'Escribe qué quieres añadir.'; data.extrasCompra.push({ id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), n, q: cant.value.trim(), s: sec, ok: false }); commit(); } });
  setTimeout(() => nom.focus(), 50);
}
export function viewCompra() {
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
export function viewEntreno() {
  const ses = data.entreno.sesiones, dias = L.diasEntrenoSemana(data);
  return h('div', { class: 'page' },
    h('div', { class: 'head' }, h('div', {}, h('h1', { class: 'title' }, 'Entreno'), h('p', { class: 'subtitle' }, ses.length ? `${ses.length} ${ses.length === 1 ? 'sesión' : 'sesiones'} · ${dias} ${dias === 1 ? 'día' : 'días'} a la semana` : 'Aún no has creado sesiones')), h('button', { class: 'btn', id: 'nueva-sesion', onclick: () => editSesion(null) }, 'Nueva sesión')),
    ses.length ? h('div', { class: 'group' }, rowOf('Hora habitual del entreno', h('input', { type: 'time', id: 'hora-entreno', value: data.entreno.hora, style: 'width:7.2rem', onchange: (e) => { data.entreno.hora = e.target.value || data.entreno.hora; commit(); } }))) : null,
    ses.length ? ses.map((s, i) => h('section', { class: 'card', id: 'sesion-' + s.id },
      h('div', { class: 'row', style: 'padding:0;min-height:0;gap:10px' }, h('div', { class: 'grow' }, h('div', { class: 'label' }, `${L.diasTexto(s.dias)}${s.min ? ' · ' + s.min : ''}`), h('h2', { class: 'sec' }, s.t)),
        ses.length > 1 ? ordenBtns(i, ses.length, (j) => { ses.splice(j, 0, ses.splice(i, 1)[0]); commit(); }, 'sesión ' + s.t) : null, h('button', { class: 'btn sec', onclick: () => editSesion(s.id) }, 'Editar')),
      h('div', { class: 'group', style: 'box-shadow:none;background:var(--bg)' }, s.ej.map((e) => { const u = e.c ? L.ultimoPeso(data, L.slug(e.n)) : null;
        return h('div', { class: 'row', style: 'min-height:42px' }, h('span', { class: 'grow' }, e.n), h('span', { class: 'mute num small' }, e.s + (u ? ` · ${L.kgTxt(u.kg)} kg` : ''))); })))) :
      h('div', { class: 'card empty' }, h('p', {}, 'Crea tus sesiones de gimnasio y aparecerán en Hoy los días que toquen.'), h('button', { class: 'btn', onclick: () => editSesion(null) }, 'Crear la primera')));
}
