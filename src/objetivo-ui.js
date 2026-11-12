// Calculadora de objetivo diario (calorías y proteína).
import * as L from './logic.js';
import { calcularObjetivo, ACTIVIDADES, METAS, SEXOS } from './objetivo.js';
import { h, toast, sheet, field } from './ui.js';
import { data, commit } from './core.js';

/* ---------- calculadora de objetivo ---------- */
export function abrirObjetivo({ onApply = null, guardar = true } = {}) {
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
