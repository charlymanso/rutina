// Pantalla Ajustes y sus secciones.
import * as L from './logic.js';
import { makeTemplate, emptyData, normalize } from './template.js';
import { store } from './store.js';
import { normalizar } from './alimentos.js';
import * as Nube from './cloud.js';
import { h, icon, clone, num, toast, sacar, deslizable, confirmSheet, rowOf, graficaLinea } from './ui.js';
import { S, data, commit, setData } from './core.js';
import { cuentaGrupo, abrirCopias } from './cuenta.js';
import { abrirObjetivo } from './objetivo-ui.js';
import { numField, macroPor100, macroTxt } from './campos.js';
import { editarPersona, editIngrediente, editarEjercicio, platosGuardados, crearPlato, borrarPlato, bienvenida, nombresHogar } from './editores.js';
import { render } from './app.js';

export function irAj(clave) { S.aj = clave; S.ajBuscar = ''; S.animar = true; render(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; }
export const filaAj = (clave, ico, color, titulo, sub) => h('button', { class: 'row tap aj', id: 'aj-' + clave, onclick: () => irAj(clave) },
  h('span', { class: 'ajicon', style: `background:${color}`, 'aria-hidden': 'true' }, icon(ico)), h('div', { class: 'grow' }, titulo, sub ? h('div', { class: 'sub' }, sub) : null), h('span', { class: 'chev' }, '›'));
export const tapRow = (label, sub, onclick, right) => h('button', { class: 'row tap', onclick }, h('div', { class: 'grow' }, label, sub ? h('div', { class: 'sub' }, sub) : null), right || h('span', { class: 'chev' }, '›'));
export const grupo = (titulo, ...rows) => h('section', { class: 'stack', style: 'gap:8px' }, titulo ? h('div', { class: 'label', style: 'padding-left:4px' }, titulo) : null, h('div', { class: 'group' }, rows));
export const txtAj = (v, on, ph, w = '13rem') => h('input', { type: 'text', value: v, placeholder: ph || '', style: `width:${w};text-align:right`, onchange: (e) => on(e.target.value.trim()) });
export function subpagina(titulo, subtitulo, ...contenido) {
  return h('div', { class: 'page' }, h('div', {}, h('button', { class: 'back-aj', id: 'aj-atras', onclick: () => irAj(null) }, '‹ Ajustes'), h('h1', { class: 'title' }, titulo), subtitulo ? h('p', { class: 'subtitle' }, subtitulo) : null), ...contenido);
}
export function viewAjustes() {
  const p = data.perfil, o = p.objetivos, n = Object.keys(data.ingredientes).length, u = Nube.usuario();
  switch (S.aj) {
    case 'cuenta': return subpagina('Cuenta', 'Sincroniza tu plan entre tus dispositivos', cuentaGrupo());
    case 'perfil': return subpagina('Perfil', null,
      grupo(null, rowOf('Nombre', txtAj(p.nombre, (v) => { p.nombre = v; commit(); }, 'Tu nombre')),
        rowOf('Personas en casa', h('div', { class: 'stepper' }, h('button', { 'aria-label': 'Menos personas', id: 'personas-menos', onclick: () => { const lista = L.hogar(data); if (lista.length) sacar(lista, lista.length - 1, lista[lista.length - 1].n, commit); } }, '−'),
          h('span', { class: 'num', id: 'personas-n' }, String(1 + L.hogar(data).length)),
          h('button', { 'aria-label': 'Más personas', id: 'personas-mas', onclick: () => { const lista = (data.perfil.hogar = L.hogar(data)); if (lista.length >= 8) return; const n = lista.length + 2; lista.push({ id: 'h' + Date.now().toString(36), n: `Persona ${n}`, f: 0.7, comidas: ['comida', 'cena'] }); commit(); if (lista.length === 1) toast('Ahora puedes ajustar su ración en «Con quién comes».'); } }, '+')),
          'Si comes con alguien, súmalo y ajustas su ración y qué comidas compartís.')));
    case 'peso': {
      const ps = data.pesos || [], hoyF = L.iso(L.hoy()), ult = ps[ps.length - 1], kg = h('input', { type: 'text', inputmode: 'decimal', id: 'peso-kg', placeholder: ult ? L.kgTxt(ult.kg) : 'Ej. 78,5', autocomplete: 'off', style: 'max-width:8rem' });
      const anotar = () => { const v = num(kg.value.trim(), NaN); if (!(v >= 20 && v <= 400)) return toast('Escribe tu peso en kilos, por ejemplo 78,5.'); data.pesos = ps.filter((x) => x.f !== hoyF).concat({ f: hoyF, kg: Math.round(v * 10) / 10 }).sort((a, b) => (a.f < b.f ? -1 : 1)); commit(); };
      const dif = ps.length >= 2 ? Math.round((ult.kg - ps[0].kg) * 10) / 10 : null;
      return subpagina('Peso corporal', 'Anótalo de vez en cuando, por ejemplo una vez a la semana, para ver si el plan funciona',
        h('div', { class: 'row', style: 'padding:0;gap:10px;min-height:0' }, kg, h('span', { class: 'mute' }, 'kg'), h('button', { class: 'btn', id: 'peso-anotar', onclick: anotar }, 'Anotar hoy')),
        ps.length >= 2 ? h('div', { id: 'peso-grafica' }, h('div', { class: 'label', style: 'margin-bottom:4px' }, `${dif > 0 ? '+' : ''}${L.kgTxt(dif)} kg desde el ${L.fechaCorta(L.parseISO(ps[0].f))}`), graficaLinea(ps.map((x) => ({ f: x.f, v: x.kg })), 'kg')) : null,
        ps.length ? h('div', { class: 'group', id: 'peso-lista' }, ps.slice().reverse().slice(0, 12).map((x) => deslizable(h('div', { class: 'row', style: 'min-height:42px' }, h('span', { class: 'grow' }, L.parseISO(x.f).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })), h('span', { class: 'num' }, `${L.kgTxt(x.kg)} kg`),
          h('button', { class: 'x', style: 'color:var(--faint);font-size:20px', 'aria-label': 'Borrar', onclick: () => sacar(data.pesos, data.pesos.indexOf(x), `${L.kgTxt(x.kg)} kg`, commit) }, '×')), () => sacar(data.pesos, data.pesos.indexOf(x), `${L.kgTxt(x.kg)} kg`, commit)))) : h('p', { class: 'mute small', id: 'peso-vacio' }, 'Aún no has anotado ningún peso.'));
    }
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
    case 'ingredientes': {
      const q = h('input', { type: 'search', id: 'ing-buscar', placeholder: 'Buscar ingrediente', autocomplete: 'off' }), lista = h('div', { class: 'group', id: 'ing-lista' });
      const seccion = (v) => (L.SECC.find(([k]) => k === v) || [0, v || ''])[1];
      const pintar = () => {
        const t = normalizar(q.value.trim()), todos = Object.entries(data.ingredientes).sort((a, b) => a[1].n.localeCompare(b[1].n, 'es')), vis = t ? todos.filter(([, g]) => normalizar(g.n).includes(t)) : todos;
        lista.replaceChildren(...(vis.length ? vis.map(([id, g]) => tapRow(g.n, `${seccion(g.s)} · ${macroPor100(g)}`, () => editIngrediente(id, () => render()))) : [h('p', { class: 'mute small', id: 'ing-vacio', style: 'padding:14px' }, 'Ningún ingrediente coincide.')]));
      };
      q.addEventListener('input', pintar); pintar();
      return subpagina('Ingredientes', 'Los que ya tienes registrados: cambia el nombre, los datos nutricionales o la sección del súper',
        h('div', { class: 'row', style: 'padding:0;gap:10px;flex-wrap:wrap' }, h('button', { class: 'btn', id: 'ing-nuevo', onclick: () => editIngrediente(null, () => render()) }, 'Nuevo ingrediente')),
        q, lista, h('p', { class: 'mute small' }, 'Si cambias el nombre, se cambia en todos tus platos y en la lista de la compra. Si tienes dos que son lo mismo, abre uno y pulsa “Unir con otro…”.'));
    }
    case 'ejercicios': {
      const q = h('input', { type: 'search', id: 'ejs-buscar', placeholder: 'Buscar ejercicio', autocomplete: 'off' }), cont = h('div', { class: 'stack', id: 'ejs-lista', style: 'gap:18px' }), todos = L.catalogoEjercicios(data);
      const fecha = (f) => L.parseISO(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const pintar = () => {
        const t = normalizar(q.value.trim()), vis = t ? todos.filter((x) => normalizar(x.n).includes(t)) : todos, out = [];
        for (const [g, nombre] of L.GRUPOS_EJ) {
          const xs = vis.filter((x) => x.grupo === g); if (!xs.length) continue;
          out.push(h('section', { class: 'stack', style: 'gap:8px', id: 'ejs-' + g }, h('div', { class: 'label', style: 'padding-left:4px' }, `${nombre} · ${xs.length}`),
            h('div', { class: 'group' }, xs.map((x) => tapRow(x.n, [x.s, x.ultimo ? `${L.kgTxt(x.ultimo.kg)} kg (${fecha(x.ultimo.f)})` : (x.c ? 'sin peso anotado' : ''), x.hist.length ? `${x.hist.length} ${x.hist.length === 1 ? 'vez' : 'veces'}` : ''].filter(Boolean).join(' · '), () => editarEjercicio(x, () => render()))))));
        }
        cont.replaceChildren(...(out.length ? out : [h('p', { class: 'mute small', id: 'ejs-vacio', style: 'padding:14px' }, todos.length ? 'Ningún ejercicio coincide.' : 'Aún no tienes ejercicios. Crea una sesión en Entreno.')]));
      };
      q.addEventListener('input', pintar); pintar();
      return subpagina('Ejercicios', 'Tus ejercicios con sus series y sus pesos, agrupados por tipo de sesión', q, cont,
        h('p', { class: 'mute small' }, 'Los pesos se guardan por el nombre del ejercicio. Si en una sesión escribes otro nombre, cuenta como un ejercicio nuevo; para renombrar uno y conservar su historial, hazlo desde aquí.'));
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
          confirmSheet('¿Recuperar esta copia?', 'Se sustituirán tu plan y tus registros actuales.', 'Recuperar', () => { setData(normalize(raw)); data.perfil.listo = true; commit(); toast('Copia recuperada.'); }); }),
        Nube.haySesion() ? tapRow('Copias automáticas', 'Tu cuenta guarda una copia cada día que cambias algo. Recupera una de las últimas dos semanas.', abrirCopias) : null,
        tapRow('Cargar el plan de ejemplo', 'Cambia tu menú y entrenos por los de ejemplo. Tus registros se conservan.', () => confirmSheet('¿Cargar el plan de ejemplo?', 'Se sustituirán tu menú, ingredientes y sesiones.', 'Cargar', () => {
          const T = makeTemplate(); data.ingredientes = T.ingredientes; data.menu = T.menu; data.entreno = T.entreno; commit(); }))),
      grupo(null, tapRow('Borrar todos mis datos', 'No se puede deshacer.', () => confirmSheet('¿Borrar todo?', Nube.haySesion() ? 'Se eliminarán tu plan, tus registros y tus ajustes, tanto de este ordenador como de tu cuenta en la nube.' : 'Se eliminarán tu plan, tus registros y tus ajustes de este ordenador.', 'Borrar todo', async () => { if (Nube.haySesion()) { try { await Nube.borrarNube(); } catch { toast('No se pudo borrar la copia de la nube. Inténtalo con conexión.'); return; } } setData(emptyData()); store.save(data); S.tab = 'hoy'; S.aj = null; render(); bienvenida(); }))));
    case 'acerca': return subpagina('Acerca de Rutina', null,
      grupo(null, rowOf('Versión', h('span', { class: 'mute num' }, S.version || 'Web')),
        h('a', { class: 'row tap', href: 'https://rutina-fitness.netlify.app/', target: '_blank', rel: 'noopener' }, h('div', { class: 'grow' }, 'Sitio web'), h('span', { class: 'chev' }, '›')),
        h('a', { class: 'row tap', href: 'https://rutina-fitness.netlify.app/privacidad.html', target: '_blank', rel: 'noopener' }, h('div', { class: 'grow' }, 'Política de privacidad'), h('span', { class: 'chev' }, '›'))));
    default: return h('div', { class: 'page' },
      h('div', {}, h('h1', { class: 'title' }, 'Ajustes')),
      grupo(null, Nube.nubeActiva() ? filaAj('cuenta', 'cuenta', '#0a84ff', 'Cuenta', u ? u.email : 'Sin iniciar sesión') : null, filaAj('perfil', 'perfil', '#8e8e93', 'Perfil', p.nombre || 'Tu nombre y tu ciudad')),
      grupo(null, filaAj('objetivos', 'objetivos', '#ff9f0a', 'Objetivos diarios', `${L.miles(o.gym.kcal)} / ${L.miles(o.sin.kcal)} kcal · ${o.gym.prot} g de proteína`), filaAj('peso', 'peso', '#34c759', 'Peso corporal', (data.pesos || []).length ? `${L.kgTxt(data.pesos[data.pesos.length - 1].kg)} kg · ${L.fechaCorta(L.parseISO(data.pesos[data.pesos.length - 1].f))}` : 'Anota tu peso para ver tu evolución')),
      grupo(null, ...(L.hogar(data).length ? [filaAj('hogar', 'hogar', '#34c759', 'Con quién comes', `Tú y ${nombresHogar()}`)] : []), filaAj('platos', 'platos', '#ff6b35', 'Platos', data.platosPropios.length ? `${data.platosPropios.length} ${data.platosPropios.length === 1 ? 'plato guardado' : 'platos guardados'}` : 'Crea tus platos con ingredientes')),
      grupo(null, filaAj('ingredientes', 'ingredientes', '#30b0c7', 'Ingredientes', `${n} ${n === 1 ? 'registrado' : 'registrados'}`)),
      grupo(null, filaAj('ejercicios', 'ejercicios', '#ff453a', 'Ejercicios', `${L.catalogoEjercicios(data).length} con sus pesos y series`)),
      grupo(null, filaAj('datos', 'datos', '#5e5ce6', 'Datos y copias', 'Copia de seguridad y borrado'), filaAj('acerca', 'acerca', '#8e8e93', 'Acerca de Rutina', `Versión ${S.version || 'Web'}`)));
  }
}
