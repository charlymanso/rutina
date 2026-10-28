import assert from 'node:assert/strict';
import { calcularObjetivo as calc } from '../src/objetivo.js';
import { RECETAS, totales, etiquetas, generarSemana, recetasPermitidas, escalar } from '../src/recetas.js';
import { BASE, normalizar } from '../src/alimentos.js';

// ---- calculadora: mismos números que Macrómetro ----
const h = calc({ sexo: 'h', edad: 30, peso: 80, altura: 180, actividad: 1.55, meta: 'def', entrenos: 3 });
assert.equal(h.bmr, 1780); assert.equal(h.tdee, 2759); assert.ok(Math.abs(h.kcal - 2207) <= 5, 'déficit del 20 %');
assert.equal(h.prot, 160, '2 g/kg al perder grasa'); assert.equal(h.grasa, 64, 'máx(25 % kcal, 0,8 g/kg)'); assert.ok(Math.abs(h.carb - 248) <= 1);
assert.ok(Math.abs(h.kcal - (h.prot * 4 + h.carb * 4 + h.grasa * 9)) <= 20, 'los macros suman las calorías');
const media = (3 * h.gym + 4 * h.sin) / 7; assert.ok(Math.abs(media - h.kcal) <= 10, `la media semanal es el objetivo (${media} vs ${h.kcal})`); assert.ok(h.gym > h.sin);
const m = calc({ sexo: 'm', edad: 28, peso: 60, altura: 165, actividad: 1.375, meta: 'man', entrenos: 0 });
assert.equal(m.bmr, 1330); assert.equal(m.kcal, 1830); assert.equal(m.gym, m.sin, 'sin entrenos, mismo objetivo todos los días'); assert.equal(m.prot, 108, '1,8 g/kg en mantenimiento');
const v = calc({ sexo: 'h', edad: 25, peso: 70, altura: 175, actividad: 1.2, meta: 'vol' }); assert.ok(v.kcal > calc({ sexo: 'h', edad: 25, peso: 70, altura: 175, actividad: 1.2, meta: 'man' }).kcal, 'ganar > mantener');
// sexo "prefiero no decirlo": a medio camino entre hombre y mujer
const [bh, bm, bo] = ['h', 'm', 'o'].map((s) => calc({ sexo: s, edad: 40, peso: 70, altura: 170, actividad: 1.2, meta: 'man' }).bmr); assert.ok(bo > bm && bo < bh);
// seguridad: mínimos y avisos
const bajo = calc({ sexo: 'm', edad: 30, peso: 45, altura: 155, actividad: 1.2, meta: 'def' }); assert.ok(bajo.kcal >= 1200 && bajo.avisos.some((a) => a.includes('mínimo')));
assert.ok(calc({ sexo: 'h', edad: 17, peso: 60, altura: 170, actividad: 1.55, meta: 'man' }).avisos.some((a) => a.includes('menor de 18')));
assert.ok(calc({ sexo: 'm', edad: 30, peso: 45, altura: 175, actividad: 1.55, meta: 'def' }).avisos.some((a) => a.includes('perder grasa no suele')));
for (const mal of [{ edad: 10 }, { edad: 120 }, { peso: 10 }, { peso: 500 }, { altura: 50 }, { altura: 300 }, { sexo: 'x' }, { meta: 'zzz' }, { actividad: 3 }, { edad: 'abc' }])
  assert.ok(calc({ sexo: 'h', edad: 30, peso: 80, altura: 180, actividad: 1.55, meta: 'man', ...mal }).error, 'rechaza ' + JSON.stringify(mal));

// ---- recetas ----
const existe = (n) => BASE.some((a) => normalizar(a.n) === normalizar(n));
for (const r of RECETAS) { for (const [n] of r.items) assert.ok(existe(n), `${r.t}: "${n}" no está en la base`); const t = totales(r.items); assert.ok(t.k > 250 && t.k < 800, `${r.t}: ${Math.round(t.k)} kcal fuera de rango`); }
assert.ok(RECETAS.length >= 40 && new Set(RECETAS.map((r) => r.t)).size === RECETAS.length, 'recetas únicas');
assert.ok(RECETAS.filter((r) => r.tipo !== 'cena').length >= 15 && RECETAS.filter((r) => r.tipo !== 'comida').length >= 15);
assert.ok(etiquetas([['Pechuga de pollo', 100]]).has('carne') && etiquetas([['Pasta', 90]]).has('gluten') && etiquetas([['Yogur natural', 100]]).has('lacteo') && etiquetas([['Almendras', 10]]).has('frutos-secos') && etiquetas([['Gambas', 100]]).has('pescado') && etiquetas([['Huevo', 2]]).has('huevo'));
assert.equal(etiquetas([['Arroz blanco', 80], ['Brócoli', 100]]).size, 0);

// ---- dietas y exclusiones ----
const animal = new Set(['carne', 'pescado', 'huevo', 'lacteo']);
for (const [dieta, prohibido] of [['pescetariana', ['carne']], ['vegetariana', ['carne', 'pescado']], ['vegana', ['carne', 'pescado', 'huevo', 'lacteo']]]) {
  const ok = recetasPermitidas({ dieta }); assert.ok(ok.length >= 5, `${dieta}: ${ok.length} recetas`);
  for (const r of ok) for (const x of prohibido) assert.ok(!etiquetas(r.items).has(x), `${dieta}: "${r.t}" lleva ${x}`);
}
for (const [ex, etq] of [['gluten', 'gluten'], ['lactosa', 'lacteo'], ['frutos-secos', 'frutos-secos'], ['huevo', 'huevo'], ['pescado', 'pescado']])
  for (const r of recetasPermitidas({ excluir: [ex] })) assert.ok(!etiquetas(r.items).has(etq), `sin ${ex}: "${r.t}"`);
assert.ok(recetasPermitidas({ dieta: 'vegana', excluir: ['gluten', 'frutos-secos'] }).length >= 4, 'vegana sin gluten ni frutos secos aún tiene opciones');

// ---- generador ----
for (const [k, p] of [[800, 55], [1100, 80], [1300, 95], [1500, 110], [1800, 130]]) { // lo que aportan comida y cena (tras desayuno y media mañana)
  for (const dieta of ['omnivora', 'vegetariana']) {
    const s = generarSemana({ dias: Array(7).fill({ k, p }), dieta, semilla: 3 }); assert.equal(s.length, 7);
    for (const d of s) {
      assert.ok(Math.abs(d.k - k) / k < 0.1, `${dieta} ${k}: día con ${d.k} kcal`);
      assert.notEqual(d.comida.t, d.cena.t);
      for (const [n, q] of [...d.comida.items, ...d.cena.items]) assert.ok(existe(n) && q > 0, `cantidad válida: ${n} ${q}`);
    }
    const veces = {}; s.forEach((d) => [d.comida.t, d.cena.t].forEach((t) => (veces[t] = (veces[t] || 0) + 1))); assert.ok(Math.max(...Object.values(veces)) <= 2, `variedad ${dieta} ${k}: ${JSON.stringify(veces)}`);
  }
}
const a = generarSemana({ dias: Array(7).fill({ k: 1500, p: 100 }), semilla: 5 }), b = generarSemana({ dias: Array(7).fill({ k: 1500, p: 100 }), semilla: 5 }), c = generarSemana({ dias: Array(7).fill({ k: 1500, p: 100 }), semilla: 6 });
assert.deepEqual(a, b, 'misma semilla = misma propuesta'); assert.notDeepEqual(a.map((d) => d.comida.t), c.map((d) => d.comida.t), 'otra semilla = otra propuesta');
// proteína: con objetivo alto se eligen platos más proteicos que con objetivo bajo
const pAlta = generarSemana({ dias: Array(7).fill({ k: 1500, p: 140 }), semilla: 2 }).reduce((s, d) => s + d.p, 0), pBaja = generarSemana({ dias: Array(7).fill({ k: 1500, p: 50 }), semilla: 2 }).reduce((s, d) => s + d.p, 0);
assert.ok(pAlta >= pBaja, 'prioriza la proteína cuando el objetivo es alto');
// días con objetivos distintos (entreno / descanso)
const mix = generarSemana({ dias: [{ k: 1600, p: 110 }, { k: 1400, p: 100 }, { k: 1600, p: 110 }, { k: 1400, p: 100 }, { k: 1600, p: 110 }, { k: 1400, p: 100 }, { k: 1400, p: 100 }], semilla: 1 });
assert.ok(mix[0].k > mix[1].k && mix[2].k > mix[3].k, 'los días de entreno llevan más calorías');
assert.equal(generarSemana({ dias: Array(7).fill({ k: 1500, p: 100 }), dieta: 'vegana', excluir: ['gluten', 'frutos-secos', 'huevo', 'lacteo', 'pescado'], semilla: 1 }) === null, false, 'combinaciones válidas devuelven menú');
assert.equal(escalar(RECETAS[0], 10000).factor, 1.9, 'el escalado tiene tope'); assert.equal(escalar(RECETAS[0], 1).factor, 0.5);
console.log('OK: objetivo y generador de menús');
