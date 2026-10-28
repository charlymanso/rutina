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
assert.equal(L.objetivo(d, lun).kcal, 1700);

// nutrición: lunes = avena50+yogur150+plátano + manzana+almendras + pollo/arroz/brócoli/aceite + tortilla
const t = L.totalDia(d, lun);
const esperado = 370 / 2 + 59 * 1.5 + 90 + 80 + 120 + 120 * 1.5 + 360 * .8 + 34 * 1.5 + 88.4 + 72 * 3 + 23 * 1 + 44.2;
assert.ok(Math.abs(t.k - esperado) < 1, `kcal ${t.k} vs ${esperado}`);
assert.ok(t.p > 80 && t.p < 160, `proteína ${t.p}`);
// día con comida libre suma el valor de comida libre
const sab = L.totalDia(d, L.addDays(lun, 5));
assert.equal(sab.libre, true);
console.log('kcal lunes', Math.round(t.k), 'prot', Math.round(t.p), '| sábado', Math.round(sab.k), Math.round(sab.p));

// lista de la compra
d.perfil.personas = 1;
const c1 = L.listaCompra(d, 0, lun);
// huevos: 3 (lun) + 2 (jue) + 3 (dom) + 0 = 8 ; aceite incluido
assert.equal(c1.huevo, 8);
d.perfil.personas = 2;
assert.equal(L.listaCompra(d, 0, lun).huevo, 16);
assert.equal(L.listaCompra(d, 2, lun).huevo, 16 * 2); // dos semanas del mismo ciclo
// comida libre no aporta ingredientes; fijos cuentan los 7 días (7 × 50 g de avena)
d.perfil.personas = 1;
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
assert.equal(L.semaforo(2), 'verde'); assert.equal(L.semaforo(4), 'ambar'); assert.equal(L.semaforo(7), 'rojo');

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
console.log('OK: logic tests');
