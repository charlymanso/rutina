import assert from 'node:assert/strict';
import * as L from '../src/logic.js';
import { makeTemplate, emptyData, normalize } from '../src/template.js';

const d = makeTemplate();
const lun = L.parseISO('2026-10-26'); // lunes
d.menu.ancla = '2026-10-26';

// fechas
assert.equal(L.idxDia(lun), 0);
assert.equal(L.iso(L.lunesDe(L.parseISO('2026-10-31'))), '2026-10-26');
assert.equal(L.iso(L.lunesDe(L.parseISO('2026-11-01'))), '2026-10-26'); // domingo
assert.equal(L.slug('Elevación de gemelos'), 'elevacion-de-gemelos');

// ciclo de 1 y 2 semanas
assert.equal(L.semanaIdx(d, lun), 0);
d.menu.semanas.push(d.menu.semanas[0].map((x) => ({ ...x })));
assert.equal(L.semanaIdx(d, L.addDays(lun, 7)), 1);
assert.equal(L.semanaIdx(d, L.addDays(lun, 14)), 0);
assert.equal(L.semanaIdx(d, L.addDays(lun, -7)), 1);
d.menu.semanas.pop();

// días de gimnasio y objetivos
assert.equal(L.esDiaGym(d, lun), true);
assert.equal(L.esDiaGym(d, L.addDays(lun, 1)), false);

// ---- entrenos: varios días, cambio de un día concreto y datos antiguos ----
const sPush = d.entreno.sesiones[0];
assert.deepEqual(sPush.dias, [0]); sPush.dias = [0, 3];
assert.equal(L.sesionGym(d, 3).t, sPush.t, 'la misma sesión en dos días');
assert.equal(L.diasEntrenoSemana(d), 4, 'cuenta días distintos (lun, mié, jue, vie)');
const jueves = L.addDays(lun, 3);
assert.equal(L.objetivo(d, jueves).kcal, d.perfil.objetivos.gym.kcal, 'el jueves ya es día de entreno');
d.dias[L.iso(jueves)] = { entreno: 'descanso' };
assert.equal(L.esDiaGym(d, jueves), false); assert.equal(L.objetivo(d, jueves).kcal, d.perfil.objetivos.sin.kcal, 'cambiar a descanso baja el objetivo');
assert.equal(L.hayCambioDeEntreno(d, jueves), true);
const martes = L.addDays(lun, 1); d.dias[L.iso(martes)] = { entreno: 's2' };
assert.equal(L.sesionDelDia(d, martes).t, d.entreno.sesiones[1].t, 'un día de descanso puede llevar otra sesión'); assert.equal(L.objetivo(d, martes).kcal, d.perfil.objetivos.gym.kcal);
d.dias[L.iso(martes)] = { entreno: 'no-existe' }; assert.equal(L.sesionDelDia(d, martes), null, 'un cambio que apunta a una sesión borrada vuelve al plan (descanso)');
delete d.dias[L.iso(jueves)]; delete d.dias[L.iso(martes)]; sPush.dias = [0];
assert.equal(L.diasTexto([0, 2, 4]), 'Lunes, miércoles y viernes'); assert.equal(L.diasTexto([4]), 'Viernes'); assert.equal(L.diasTexto([]), 'Sin día fijo'); assert.equal(L.diasTexto([4, 0], true), 'Lun, Vie');
const viejaSesiones = normalize({ entreno: { sesiones: [{ dia: 2, t: 'A', ej: [] }, { dia: 0, t: 'B', ej: [] }, { t: 'C' }] } }).entreno.sesiones;
assert.deepEqual(viejaSesiones.map((x) => x.dias), [[2], [0], []], 'normalize convierte dia → dias'); assert.equal(new Set(viejaSesiones.map((x) => x.id)).size, 3, 'ids únicos'); assert.ok(viejaSesiones.every((x) => !('dia' in x)));
assert.equal(L.idSesionNueva(d), 's4');
assert.equal(L.objetivo(d, lun).kcal, 1700);

// nutrición: lunes = avena50+yogur150+plátano + manzana+almendras + pollo150/arroz80/brócoli150/aceite10 + huevo3/espinacas100/aceite5
const g = (id) => d.ingredientes[id];
const esperado = g('avena').k * .5 + g('yogur').k * 1.5 + g('platano').k + g('manzana').k + g('almendras').k * .2 + g('pollo').k * 1.5 + g('arroz').k * .8 + g('brocoli').k * 1.5 + g('aceite').k * .1 + g('huevo').k * 3 + g('espinacas').k + g('aceite').k * .05;
const t = L.totalDia(d, lun);
assert.ok(Math.abs(t.k - esperado) < 1, `kcal ${t.k} vs ${esperado}`);
assert.ok(t.p > 80 && t.p < 160, `proteína ${t.p}`);
assert.equal(t.completo, true, 'la plantilla trae hidratos y grasa de todos los ingredientes');
assert.ok(Math.abs(t.k - (t.p * 4 + t.c * 4 + t.f * 9)) < t.k * 0.12, 'las calorías cuadran con los macros (±12 %)');
const rp = L.repartoMacros(t); assert.ok(rp && rp.p + rp.c + rp.f >= 99 && rp.p + rp.c + rp.f <= 101, 'el reparto suma ~100 %');
// día con comida libre suma el valor de comida libre y se marca incompleto
const sab = L.totalDia(d, L.addDays(lun, 5));
assert.equal(sab.libre, true); assert.equal(sab.completo, false);
console.log('kcal lunes', Math.round(t.k), 'prot', Math.round(t.p), 'hidr', Math.round(t.c), 'grasa', Math.round(t.f), '| sábado', Math.round(sab.k), Math.round(sab.p));

// extras del día (diario tipo "comida fuera del plan")
const f0 = L.iso(lun); d.dias[f0] = { extras: [{ n: 'Barrita', q: 1, u: 'ud', k: 200, p: 10, c: 20, f: 8, tipo: 'snack' }] };
assert.equal(Math.round(L.totalDia(d, lun).k - t.k), 200); assert.equal(L.totalDia(d, lun, { extras: false }).k, t.k, 'el menú semanal no cuenta extras');
delete d.dias[f0];

// ingredientes sin macros (versión antigua) → incompleto; normalize los recupera si están en la base
const viejo = { ...d, ingredientes: { ...d.ingredientes, raro: { n: 'Cosa rara', u: 'g', k: 100, p: 5, s: 'despensa' } } };
viejo.menu = { ...d.menu, semanas: [[{ comida: { t: 'x', items: [['raro', 100]] }, cena: null }, ...d.menu.semanas[0].slice(1)]] };
assert.equal(L.totalDia(viejo, lun).completo, false);
const migrado = normalize({ ingredientes: { pollo: { n: 'Pechuga de pollo', u: 'g', k: 120, p: 23, s: 'carne' } } });
assert.equal(migrado.ingredientes.pollo.f, 2.6, 'normalize rellena grasa/hidratos desde la base');

// buscador local
import { BASE, buscarLocal } from '../src/alimentos.js';
assert.ok(BASE.length > 100);
assert.equal(buscarLocal('POLLO')[0].n, 'Pechuga de pollo'); assert.equal(buscarLocal('platano')[0].n, 'Plátano'); assert.deepEqual(buscarLocal('zzzz'), []);
assert.ok(buscarLocal('yogur gri').every((a) => a.n.toLowerCase().includes('griego')), 'varias palabras = todas deben aparecer');
for (const a of BASE.filter((x) => !/Cerveza|Vino/.test(x.n) && x.u !== 'ud')) assert.ok(Math.abs(a.k - (a.p * 4 + a.c * 4 + a.f * 9)) <= a.k * 0.2 + 15, `${a.n}: kcal no cuadra con macros`);

// desayuno por día: predeterminado + el propio de cada día
const lunD = lun; assert.equal(L.fijoDia(d, lunD, 'desayuno').propio, false); assert.equal(L.fijoDia(d, lunD, 'desayuno').texto, d.menu.fijos.desayuno.texto);
d.menu.semanas[0][2].desayuno = { t: 'Tostadas con aguacate', items: [['pan', 80], ['platano', 1]] };   // miércoles distinto
const mie = L.addDays(lun, 2), fMie = L.fijoDia(d, mie, 'desayuno'); assert.equal(fMie.propio, true); assert.equal(fMie.texto, 'Tostadas con aguacate'); assert.equal(fMie.hora, d.menu.fijos.desayuno.hora, 'la hora sigue siendo la general');
assert.notEqual(Math.round(L.totalDia(d, mie).k), Math.round(L.totalDia(d, L.addDays(lun, 1)).k), 'el desayuno propio cambia las calorías de ese día');
d.menu.fijos.merienda.on = false; assert.equal(L.fijoDia(d, mie, 'merienda'), null, 'una comida desactivada no aparece');
d.perfil.hogar = []; const cPropio = L.listaCompra(d, 0, lun); assert.equal(cPropio.avena, 300, 'avena: 6 días × 50 g (el miércoles lleva tostadas)'); assert.equal(cPropio.pan, 80 + 40 * 3, 'el pan del desayuno propio (80 g) se suma al de las 3 cenas con pan');
delete d.menu.semanas[0][2].desayuno; d.menu.fijos.merienda.on = false; d.menu.fijos.media.on = true;

// lista de la compra
d.perfil.hogar = [];
const c1 = L.listaCompra(d, 0, lun);
// huevos: 3 (lun) + 2 (jue) + 3 (dom) + 0 = 8 ; aceite incluido
assert.equal(c1.huevo, 8);
d.perfil.hogar = [{ id: 'h1', n: 'Pareja', f: 1, comidas: ['desayuno', 'media', 'comida', 'merienda', 'cena'] }];   // alguien que come igual que tú en todo
assert.equal(L.listaCompra(d, 0, lun).huevo, 16);
assert.equal(L.listaCompra(d, 2, lun).huevo, 16 * 2); // dos semanas del mismo ciclo
// comida libre no aporta ingredientes; fijos cuentan los 7 días (7 × 50 g de avena)
d.perfil.hogar = [];
assert.equal(L.listaCompra(d, 0, lun).avena, 350);
d.menu.fijos.media.on = false;
assert.equal(L.listaCompra(d, 0, lun).manzana, undefined);
assert.equal(L.claveCompra(2, lun), 'dos-2026-10-26');

// formatos
assert.equal(L.cantidadCompra(d, 'huevo', 1), '1 Huevo');
assert.equal(L.cantidadCompra(d, 'huevo', 8), '8 huevos');
assert.equal(L.cantidadCompra(d, 'arroz', 1280), '1,28 kg');
assert.ok(L.textoCompra(d, 0).includes('CARNE Y CHARCUTERÍA'));

// registros y racha
const hoyF = L.hoy();
const cs = L.comidasDelDia(d);
d.dias[L.iso(hoyF)] = { hechos: Object.fromEntries(cs.map((c) => [c, true])) };
d.dias[L.iso(L.addDays(hoyF, -1))] = { hechos: Object.fromEntries(cs.map((c) => [c, true])) };
assert.equal(L.racha(d), 2);
d.dias['2026-10-20'] = { gym: { 'press-banca': { kg: 60 } } };
d.dias['2026-10-27'] = { gym: { 'press-banca': { kg: 62.5 } } };
assert.equal(L.ultimoPeso(d, 'press-banca', '2026-10-28').kg, 62.5);
assert.equal(L.ultimoPeso(d, 'press-banca', '2026-10-27').kg, 60);

// normalize tolera datos incompletos o corruptos
const n = normalize({ perfil: { nombre: 'Ana' }, menu: { semanas: [[{ comida: { t: 'x', items: [] } }]] } });
assert.equal(n.perfil.nombre, 'Ana'); assert.equal(n.menu.semanas[0].length, 7); assert.equal(n.perfil.objetivos.gym.kcal, 2400);
assert.ok(normalize(null).menu.semanas.length === 1);
assert.deepEqual(L.listaCompra(emptyData(), 2), {});
assert.equal(L.esVersionNueva('0.1.3', 'v0.1.4'), true);
assert.equal(L.esVersionNueva('0.1.4', 'v0.1.4'), false);
assert.equal(L.esVersionNueva('0.2.0', 'v0.1.9'), false);
assert.equal(L.esVersionNueva('0.9.9', 'v1.0.0'), true);
assert.equal(L.esVersionNueva('0.1.10', 'v0.1.9'), false);

// ---- con quién comes ----
{
  const h = makeTemplate(); h.menu.ancla = '2026-10-26'; const l0 = L.parseISO('2026-10-26');
  h.ingredientes.faj = { n: 'Fajita', u: 'ud', k: 150, p: 5, s: 'pan' }; h.ingredientes.poll = { n: 'Pollo', u: 'g', k: 120, p: 23, s: 'carne' };
  h.menu.semanas[0].forEach((dm) => { dm.comida = null; dm.cena = null; }); h.menu.fijos.desayuno.on = true; h.menu.fijos.desayuno.items = [['poll', 50]]; ['media', 'merienda'].forEach((k) => { h.menu.fijos[k].on = false; });
  h.menu.semanas[0][0].comida = { t: 'Fajitas', items: [['faj', 2], ['poll', 200]] }; h.menu.semanas[0][1].cena = { t: 'Pollo', items: [['poll', 100]] };
  h.perfil.hogar = [];
  let c = L.listaCompra(h, 0, l0); assert.equal(c.faj, 2); assert.equal(c.poll, 200 + 100 + 7 * 50, 'solo tú: todo tal cual');
  h.perfil.hogar = [{ id: 'h1', n: 'Pareja', f: 0.7, comidas: ['comida', 'cena'] }];
  c = L.listaCompra(h, 0, l0);
  assert.equal(c.faj, 4, 'fajitas por unidades: 2 para ti y 2 para tu pareja (1,4 se redondea hacia arriba)');
  assert.ok(Math.abs(c.poll - (200 * 1.7 + 100 * 1.7 + 7 * 50)) < 1e-9, 'en gramos: 70 % de ración en comida y cena, y el desayuno solo lo tuyo');
  assert.equal(L.paraTodos(h, 'poll', 100, 'desayuno'), 100, 'lo que no compartís no se multiplica');
  assert.equal(L.paraTodos(h, 'faj', 0.5, 'comida'), 0.5 + 0.35, 'menos de una unidad no se redondea');
  assert.deepEqual(L.repartoHogar(h, 'faj', 2, 'comida').map((x) => [x.n, x.q]), [['Tú', 2], ['Pareja', 2]], 'reparto: por unidades 2 y 2'); assert.deepEqual(L.repartoHogar(h, 'poll', 100, 'cena').map((x) => [x.n, Math.round(x.q)]), [['Tú', 100], ['Pareja', 70]]); assert.equal(L.repartoHogar(h, 'poll', 100, 'desayuno').length, 1, 'quien no comparte no sale');
  h.perfil.hogar.push({ id: 'h2', n: 'Otra', f: 0.5, comidas: ['cena'] }); assert.equal(L.paraTodos(h, 'poll', 100, 'cena'), 100 + 70 + 50, 'varias personas'); assert.equal(L.paraTodos(h, 'poll', 100, 'comida'), 170);
  const antes = L.totalDia(h, l0, { extras: false }).k; h.perfil.hogar = []; assert.equal(L.totalDia(h, l0, { extras: false }).k, antes, 'tus calorías no cambian con quién come contigo');
  // datos viejos: "personas en casa" = 2 -> todo para dos, igual que antes
  const viejo = normalize({ perfil: { listo: true, personas: 2 }, menu: null }); assert.equal(viejo.perfil.hogar.length, 1); assert.equal(viejo.perfil.hogar[0].f, 1); assert.equal(viejo.perfil.hogar[0].comidas.length, 5); assert.ok(!('personas' in viejo.perfil));
  assert.deepEqual(normalize({ perfil: { personas: 1 } }).perfil.hogar, []);
  assert.deepEqual(normalize({ perfil: { hogar: [{ n: 'Ana', f: 9, comidas: ['comida', 'x'] }, null, 5] } }).perfil.hogar, [{ id: 'h1', n: 'Ana', f: 2, comidas: ['comida'] }], 'normalize limpia');
}
// ---- cambios de un día, nutrición consumida, ejercicios de hoy y extras de la compra ----
{
  const t = makeTemplate(); t.menu.ancla = '2026-10-26'; const mar = L.parseISO('2026-10-27'), fm = L.iso(mar), plan = L.platoDelDia(t, mar, 'comida');
  assert.ok(plan && plan.items.length, 'hay plato de comida en el plan');
  const previsto = L.totalDia(t, mar, { extras: false }), nada = L.totalDia(t, mar, { soloHechos: true });
  assert.equal(nada.k, 0, 'sin marcar nada no se ha consumido nada');
  t.dias[fm] = { hechos: { comida: true } };
  const comida = L.sumaItems(t, plan.items), solo = L.totalDia(t, mar, { soloHechos: true });
  assert.equal(Math.round(solo.k), Math.round(comida.k), 'solo cuenta la comida marcada');
  t.dias[fm].extras = [{ n: 'Nueces', q: 20, u: 'g', k: 130, p: 3, c: 3, f: 13 }];
  assert.equal(Math.round(L.totalDia(t, mar, { soloHechos: true }).k), Math.round(comida.k + 130), 'los extras cuentan como consumidos');
  t.dias[fm].cambios = { comida: { t: 'Otra cosa', items: plan.items.map(([id, q]) => [id, q / 2]) } };
  assert.equal(L.platoDelDia(t, mar, 'comida').cambiado, true);
  assert.equal(L.platoDelDia(t, mar, 'comida', { cambios: false }).t, plan.t, 'el plan no se toca');
  assert.ok(Math.abs(L.totalDia(t, mar, { soloHechos: true }).k - (comida.k / 2 + 130)) < 1, 'con el cambio cuenta lo que comiste de verdad');
  assert.equal(Math.round(L.totalDia(t, mar, { extras: false, cambios: false }).k), Math.round(previsto.k), 'el menú ignora los cambios del día');
  t.dias[fm].cambios = { comida: { t: 'Comida libre', libre: true, items: [] } };
  assert.equal(L.totalDia(t, mar, { soloHechos: true, extras: false }).k, t.perfil.libre.kcal, 'comida libre cuenta sus kcal');
  assert.equal(L.platoDelDia(t, mar, 'desayuno').t, t.menu.fijos.desayuno.texto);
  t.menu.fijos.desayuno.on = false; assert.equal(L.platoDelDia(t, mar, 'desayuno'), null, 'un desayuno apagado no existe');
  // ejercicios de hoy
  const ses = L.sesionDelDia(t, L.parseISO('2026-10-26')), lunes = L.parseISO('2026-10-26'), fl = L.iso(lunes), n0 = ses.ej.length;
  assert.equal(L.ejerciciosDelDia(t, lunes).length, n0);
  t.dias[fl] = { hechos: {}, ejExtra: [{ n: 'Fondos', s: '4×12', c: true }], ejQuitar: [L.slug(ses.ej[0].n)] };
  const ej = L.ejerciciosDelDia(t, lunes); assert.equal(ej.length, n0, 'uno quitado y uno añadido'); assert.equal(ej[ej.length - 1].extra, true); assert.ok(!ej.some((e) => L.slug(e.n) === L.slug(ses.ej[0].n)));
  assert.equal(ses.ej.length, n0, 'la sesión del plan no se modifica');
  // sesiones sumadas (bloques)
  {
    const s1 = t.entreno.sesiones[0], s2 = t.entreno.sesiones[1], lunesD = L.parseISO('2026-10-26'), fL = L.iso(lunesD);
    const base = L.sesionDelDia(t, lunesD), otra = t.entreno.sesiones.find((x) => x.id !== base.id);
    t.dias[fL] = { hechos: {}, bloques: [otra.id, otra.id, 'no-existe', base.id] };
    assert.deepEqual(L.bloquesDelDia(t, lunesD).map((x) => x.id), [otra.id], 'sin repetidos, sin ids inexistentes y sin la propia sesión');
    assert.equal(L.tituloEntreno(t, lunesD), `${base.t} + ${otra.t}`);
    const todos = L.ejerciciosDelDia(t, lunesD), propios = new Set(base.ej.map((e) => L.slug(e.n))), deOtra = otra.ej.filter((e) => !propios.has(L.slug(e.n)));
    assert.equal(todos.length, base.ej.length + deOtra.length, 'suma los ejercicios de las dos sesiones');
    assert.ok(todos.filter((e) => e.bloque === otra.id).every((e) => e.origen === otra.t));
    t.dias[fL].ejQuitar = [L.slug(otra.ej[0].n)]; assert.ok(!L.ejerciciosDelDia(t, lunesD).some((e) => L.slug(e.n) === L.slug(otra.ej[0].n)), 'se puede quitar un ejercicio de un bloque');
    assert.equal(base.ej.length, L.sesionGym(t, 0).ej.length, 'las sesiones del plan no se modifican');
    t.dias[fL] = { hechos: {}, bloques: [otra.id], entreno: 'descanso' }; assert.deepEqual(L.bloquesDelDia(t, lunesD), [], 'sin sesión principal no hay bloques');
    // un ejercicio con el mismo nombre en dos sesiones sale una sola vez
    const copia = JSON.parse(JSON.stringify(otra)); copia.id = 'zz'; copia.ej = [{ ...base.ej[0] }, { n: 'Nuevo', s: '3×10', c: true }]; t.entreno.sesiones.push(copia);
    t.dias[fL] = { hechos: {}, bloques: ['zz'] }; const dd = L.ejerciciosDelDia(t, lunesD);
    assert.equal(dd.filter((e) => L.slug(e.n) === L.slug(base.ej[0].n)).length, 1, 'ejercicio repetido solo una vez'); assert.ok(dd.some((e) => e.n === 'Nuevo' && e.bloque === 'zz'));
    assert.deepEqual(normalize({ dias: { a: { bloques: ['x', 3, ''] }, b: { bloques: 'mal' } } }).dias, { a: { bloques: ['x'] }, b: {} }, 'normalize limpia los bloques');
  }
  // dos sesiones programadas el mismo día
  {
    const m = makeTemplate(); m.menu.ancla = '2026-10-26'; const [a, b, c] = m.entreno.sesiones, mar = L.parseISO('2026-10-27'), fM = L.iso(mar);
    assert.equal(L.sesionDelDia(m, mar), null, 'martes es descanso en la plantilla');
    a.dias = [...a.dias, 1]; b.dias = [...b.dias, 1];
    assert.deepEqual(L.sesionesGym(m, 1).map((x) => x.id), [a.id, b.id]); assert.equal(L.sesionDelDia(m, mar).id, a.id, 'la principal es la primera');
    assert.deepEqual(L.bloquesDelDia(m, mar).map((x) => x.id), [b.id], 'la otra se suma sola');
    assert.equal(L.tituloEntreno(m, mar), `${a.t} + ${b.t}`);
    assert.equal(L.ejerciciosDelDia(m, mar).length, new Set([...a.ej, ...b.ej].map((e) => L.slug(e.n))).size, 'ejercicios de las dos, sin repetir');
    m.dias[fM] = { hechos: {}, bloquesQuitar: [b.id] }; assert.deepEqual(L.bloquesDelDia(m, mar), [], 'se puede quitar la sesión programada solo ese día');
    m.dias[fM] = { hechos: {}, bloquesQuitar: [b.id], bloques: [b.id] }; assert.deepEqual(L.bloquesDelDia(m, mar).map((x) => x.id), [b.id], 'y volver a sumarla');
    m.dias[fM] = { hechos: {}, entreno: c.id }; assert.deepEqual(L.bloquesDelDia(m, mar), [], 'si hoy eliges otra sesión, las programadas dejan de sumarse');
    m.dias[fM] = { hechos: {}, entreno: c.id, bloques: [a.id] }; assert.deepEqual(L.bloquesDelDia(m, mar).map((x) => x.id), [a.id], 'solo las que sumes a mano');
    assert.equal(L.diasEntrenoSemana(m), new Set(m.entreno.sesiones.flatMap((x) => x.dias)).size, 'los días de entreno cuentan días distintos');
    assert.deepEqual(normalize({ dias: { a: { bloquesQuitar: ['x', 1] }, b: { bloquesQuitar: 3 } } }).dias, { a: { bloquesQuitar: ['x'] }, b: {} });
  }
  // extras de la compra
  const c = makeTemplate(); c.extrasCompra = [{ id: 'x1', n: 'Papel de cocina', q: '2 packs', s: 'otros', ok: false }, { id: 'x2', n: 'Pollo extra', q: '', s: 'carne', ok: false }];
  const txt = L.textoCompra(c, 2); assert.ok(txt.includes('OTROS') && txt.includes('- Papel de cocina: 2 packs') && txt.includes('- Pollo extra'), 'copiar lista incluye extras');
  // normalize arregla formas raras
  const roto = normalize({ perfil: { listo: true }, dias: { '2026-10-27': { cambios: 5, ejExtra: 'x', ejQuitar: {}, extras: 3 }, '2026-10-28': null, '2026-10-29': { cambios: { comida: { t: 'A', items: 'mal' }, cena: null } } }, extrasCompra: [null, { n: ' ', s: 'x' }, { n: 'Sal', s: 'inventada' }], platosPropios: [{ t: 'Bowl', items: [['arroz', 80], null] }, { t: '', items: [] }, 'x'] });
  assert.deepEqual(roto.dias['2026-10-27'], {}, 'campos de día con forma rara se descartan');
  assert.deepEqual(roto.dias['2026-10-28'], { hechos: {} }); assert.deepEqual(roto.dias['2026-10-29'].cambios, { comida: { t: 'A', items: [] } });
  assert.equal(roto.extrasCompra.length, 1); assert.equal(roto.extrasCompra[0].s, 'otros');
  assert.deepEqual(roto.platosPropios, [{ t: 'Bowl', items: [['arroz', 80]] }]);
  assert.ok(!('agenda' in normalize({ agenda: { x: 1 }, clima: {} })) && !('clima' in normalize({ clima: {} })), 'tiempo y recordatorios antiguos se limpian');
}
console.log('OK: logic tests');
