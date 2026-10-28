// Recetas de ejemplo y generador de menú semanal. Todas por persona; se escalan para ajustarse a tus calorías.
import { BASE, normalizar } from './alimentos.js';

const R = (t, tipo, items) => ({ t, tipo, items });
export const RECETAS = [
  R('Pollo con arroz y brócoli', 'comida', [['Pechuga de pollo', 150], ['Arroz blanco', 80], ['Brócoli', 150], ['Aceite de oliva', 10]]),
  R('Lentejas con verduras', 'comida', [['Lentejas (secas)', 80], ['Pimiento', 80], ['Cebolla', 50], ['Zanahoria', 60], ['Aceite de oliva', 10]]),
  R('Pasta con atún y tomate', 'comida', [['Pasta', 90], ['Atún al natural (lata)', 80], ['Tomate triturado', 150], ['Aceite de oliva', 10]]),
  R('Salmón con patata y brócoli', 'comida', [['Salmón', 150], ['Patata', 200], ['Brócoli', 100], ['Aceite de oliva', 5]]),
  R('Garbanzos con espinacas', 'comida', [['Garbanzos (secos)', 80], ['Espinacas', 150], ['Cebolla', 40], ['Aceite de oliva', 10]]),
  R('Arroz con tofu y verduras', 'comida', [['Arroz blanco', 80], ['Tofu firme', 150], ['Pimiento', 100], ['Cebolla', 50], ['Salsa de soja', 10], ['Aceite de oliva', 10]]),
  R('Ternera con patatas y pimientos', 'comida', [['Ternera magra', 150], ['Patata', 200], ['Pimiento', 100], ['Aceite de oliva', 10]]),
  R('Pavo con quinoa y calabacín', 'comida', [['Pechuga de pavo', 150], ['Quinoa', 80], ['Calabacín', 150], ['Aceite de oliva', 10]]),
  R('Macarrones con carne y tomate', 'comida', [['Pasta', 90], ['Ternera picada', 120], ['Tomate triturado', 150], ['Cebolla', 40], ['Aceite de oliva', 5]]),
  R('Merluza con arroz y judías', 'comida', [['Merluza', 180], ['Arroz blanco', 70], ['Judías verdes', 150], ['Aceite de oliva', 10]]),
  R('Alubias con verduras', 'comida', [['Alubias (secas)', 80], ['Zanahoria', 60], ['Puerro', 60], ['Aceite de oliva', 10]]),
  R('Pollo al horno con patata', 'comida', [['Pechuga de pollo', 160], ['Patata', 250], ['Cebolla', 50], ['Aceite de oliva', 10]]),
  R('Ensalada de pasta con atún', 'comida', [['Pasta', 70], ['Atún al natural (lata)', 80], ['Tomate', 120], ['Maíz dulce', 50], ['Aceite de oliva', 10]]),
  R('Cuscús con pollo y verduras', 'comida', [['Cuscús', 80], ['Pechuga de pollo', 130], ['Calabacín', 100], ['Pimiento', 80], ['Aceite de oliva', 10]]),
  R('Dorada al horno con boniato', 'comida', [['Dorada', 200], ['Boniato', 200], ['Calabacín', 100], ['Aceite de oliva', 10]]),
  R('Hamburguesa de ternera con patatas', 'comida', [['Hamburguesa de ternera', 150], ['Patata', 200], ['Lechuga', 50], ['Tomate', 80], ['Aceite de oliva', 5]]),
  R('Revuelto de gambas con arroz', 'comida', [['Gambas', 150], ['Huevo', 2], ['Arroz blanco', 70], ['Pimiento', 80], ['Aceite de oliva', 10]]),
  R('Lentejas con arroz', 'comida', [['Lentejas (secas)', 70], ['Arroz blanco', 40], ['Cebolla', 50], ['Zanahoria', 50], ['Aceite de oliva', 10]]),
  R('Bowl de quinoa y garbanzos', 'comida', [['Quinoa', 70], ['Garbanzos cocidos', 150], ['Tomate', 100], ['Pepino', 80], ['Aguacate', 50], ['Aceite de oliva', 5]]),
  R('Tempeh con arroz integral y brócoli', 'comida', [['Tempeh', 120], ['Arroz integral', 80], ['Brócoli', 150], ['Salsa de soja', 10], ['Aceite de oliva', 5]]),
  R('Pasta integral con pollo y espinacas', 'comida', [['Pasta integral', 90], ['Pechuga de pollo', 130], ['Espinacas', 100], ['Tomate frito', 60], ['Aceite de oliva', 5]]),
  R('Estofado de ternera', 'comida', [['Ternera magra', 150], ['Patata', 200], ['Zanahoria', 80], ['Cebolla', 50], ['Aceite de oliva', 10]]),
  R('Garbanzos con calabaza', 'comida', [['Garbanzos cocidos', 200], ['Calabaza', 200], ['Cebolla', 50], ['Aceite de oliva', 10], ['Pan integral', 40]]),
  R('Sardinas con patata y tomate', 'comida', [['Sardinas en lata', 100], ['Patata', 250], ['Tomate', 100]]),
  R('Tortilla de espinacas', 'cena', [['Huevo', 3], ['Espinacas', 100], ['Aceite de oliva', 5], ['Pan integral', 40]]),
  R('Merluza al horno con patata', 'cena', [['Merluza', 180], ['Patata', 200], ['Aceite de oliva', 8]]),
  R('Crema de calabacín y huevo', 'cena', [['Calabacín', 250], ['Huevo', 2], ['Cebolla', 40], ['Pan integral', 40]]),
  R('Pavo a la plancha con ensalada', 'cena', [['Pechuga de pavo', 160], ['Tomate', 150], ['Lechuga', 60], ['Pan integral', 40], ['Aceite de oliva', 10]]),
  R('Ensalada de pollo', 'cena', [['Pechuga de pollo', 120], ['Tomate', 150], ['Pimiento', 80], ['Pan integral', 40], ['Aceite de oliva', 10]]),
  R('Salmón con espárragos', 'cena', [['Salmón', 130], ['Espárragos', 150], ['Pan integral', 30], ['Aceite de oliva', 5]]),
  R('Tortilla de patata ligera', 'cena', [['Huevo', 3], ['Patata', 150], ['Cebolla', 50], ['Aceite de oliva', 10]]),
  R('Revuelto de champiñones y jamón', 'cena', [['Huevo', 2], ['Champiñones', 150], ['Jamón cocido', 40], ['Pan integral', 40], ['Aceite de oliva', 5]]),
  R('Wok de tofu y verduras', 'cena', [['Tofu firme', 150], ['Pimiento', 100], ['Calabacín', 100], ['Cebolla', 50], ['Salsa de soja', 10], ['Aceite de oliva', 5], ['Arroz blanco', 40]]),
  R('Yogur griego con fresas y avena', 'cena', [['Yogur griego 0 %', 200], ['Fresas', 150], ['Almendras', 20], ['Copos de avena', 30]]),
  R('Sándwich de pavo y aguacate', 'cena', [['Pan integral', 80], ['Fiambre de pavo', 60], ['Tomate', 80], ['Aguacate', 30]]),
  R('Ensalada de garbanzos y atún', 'cena', [['Garbanzos cocidos', 150], ['Atún al natural (lata)', 80], ['Tomate', 120], ['Cebolla', 30], ['Aceite de oliva', 10]]),
  R('Bacalao con verduras al vapor', 'cena', [['Bacalao fresco', 180], ['Judías verdes', 150], ['Patata', 150], ['Aceite de oliva', 10]]),
  R('Hummus con verduras y pan', 'cena', [['Hummus', 80], ['Pan integral', 60], ['Zanahoria', 100], ['Pepino', 100], ['Tomate', 80]]),
  R('Tortilla francesa con ensalada', 'cena', [['Huevo', 3], ['Lechuga', 80], ['Tomate', 100], ['Pan integral', 40], ['Aceite de oliva', 8]]),
  R('Pollo salteado con verduras', 'cena', [['Pechuga de pollo', 150], ['Calabacín', 100], ['Pimiento', 100], ['Champiñones', 100], ['Aceite de oliva', 8], ['Arroz blanco', 40]]),
  R('Pasta con calabacín y queso fresco', 'comida', [['Pasta', 90], ['Calabacín', 100], ['Tomate triturado', 150], ['Queso fresco batido 0 %', 100], ['Aceite de oliva', 8]]),
  R('Arroz con huevo y verduras', 'comida', [['Arroz blanco', 80], ['Huevo', 2], ['Guisantes', 100], ['Zanahoria', 60], ['Aceite de oliva', 10]]),
  R('Curry de garbanzos con arroz', 'comida', [['Garbanzos cocidos', 200], ['Arroz blanco', 70], ['Tomate triturado', 100], ['Cebolla', 50], ['Espinacas', 50], ['Aceite de oliva', 10]]),
  R('Pasta con tomate y tofu', 'comida', [['Pasta', 90], ['Tofu firme', 120], ['Tomate triturado', 150], ['Cebolla', 40], ['Aceite de oliva', 8]]),
  R('Quinoa con berenjena y calabacín', 'comida', [['Quinoa', 70], ['Berenjena', 150], ['Calabacín', 100], ['Tomate', 100], ['Aceite de oliva', 10]]),
  R('Tortilla de calabacín', 'cena', [['Huevo', 3], ['Calabacín', 150], ['Cebolla', 40], ['Pan integral', 40], ['Aceite de oliva', 8]]),
  R('Ensalada de quinoa y aguacate', 'cena', [['Quinoa', 60], ['Aguacate', 60], ['Tomate', 100], ['Pepino', 80], ['Garbanzos cocidos', 100], ['Aceite de oliva', 5]]),
  R('Sopa de lentejas y verduras', 'cena', [['Lentejas cocidas', 250], ['Zanahoria', 80], ['Puerro', 60], ['Pan integral', 40], ['Aceite de oliva', 8]]),
  R('Tostadas de hummus y aguacate', 'cena', [['Pan integral', 70], ['Hummus', 60], ['Aguacate', 50], ['Tomate', 100]]),
  R('Gambas al ajillo con ensalada', 'cena', [['Gambas', 200], ['Ajo', 5], ['Tomate', 100], ['Lechuga', 60], ['Pan integral', 50], ['Aceite de oliva', 10]]),
];

export const DIETAS = [['omnivora', 'De todo'], ['pescetariana', 'Sin carne'], ['vegetariana', 'Vegetariana'], ['vegana', 'Vegana']];
export const EXCLUSIONES = [['gluten', 'Sin gluten'], ['lactosa', 'Sin lactosa'], ['frutos-secos', 'Sin frutos secos'], ['huevo', 'Sin huevo'], ['pescado', 'Sin pescado ni marisco']];

const porNombre = new Map(BASE.map((a) => [normalizar(a.n), a]));
const al = (n) => porNombre.get(normalizar(n));
const CARNE = /pollo|pavo|ternera|cerdo|jamón|chorizo|salchicha|hamburguesa|fiambre/i, MARISCO = /gambas|calamar|mejillones/i, PESCADO = /salmón|merluza|atún|bacalao|dorada|lubina|sardinas/i;
const LACTEO = /yogur|queso|leche|mantequilla|mozzarella|requesón|kéfir/i, GLUTEN = /^pasta|pan |pan$|tortilla de trigo|cuscús|harina|seitán|galletas|cereales/i, FRUTOS = /almendras|nueces|cacahuetes|anacardos|pistachos/i;

// Etiquetas de una receta calculadas a partir de sus ingredientes (no a mano, para no equivocarnos)
export function etiquetas(items) {
  const t = new Set();
  for (const [n] of items) {
    if (CARNE.test(n)) t.add('carne'); if (PESCADO.test(n) || MARISCO.test(n)) t.add('pescado'); if (/^huevo|clara de huevo/i.test(n)) t.add('huevo');
    if (LACTEO.test(n)) t.add('lacteo'); if (GLUTEN.test(n)) t.add('gluten'); if (FRUTOS.test(n)) t.add('frutos-secos');
  }
  return t;
}
export function totales(items) {
  let k = 0, p = 0, c = 0, f = 0;
  for (const [n, q] of items) { const a = al(n); if (!a) continue; const m = a.u === 'ud' ? q : q / 100; k += a.k * m; p += a.p * m; c += a.c * m; f += a.f * m; }
  return { k, p, c, f };
}
const principal = (items) => items.reduce((m, [n, q]) => { const a = al(n), p = a ? a.p * (a.u === 'ud' ? q : q / 100) : 0; return p > m.p ? { n, p } : m; }, { n: '', p: -1 }).n;

function redondear(unidad, q) {
  if (unidad === 'ud') return q < 2 ? Math.max(0.5, Math.round(q * 2) / 2) : Math.round(q);
  if (q <= 20) return Math.max(1, Math.round(q)); return q > 200 ? Math.round(q / 10) * 10 : Math.round(q / 5) * 5;
}
export function escalar(receta, kObjetivo) {
  const base = totales(receta.items).k, f = Math.min(1.9, Math.max(0.5, kObjetivo / base));
  const items = receta.items.map(([n, q]) => [n, redondear(al(n).u, q * f)]);
  return { t: receta.t, items, factor: f, ...totales(items), etq: etiquetas(items), main: principal(items) };
}

const rng = (semilla) => { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

export function recetasPermitidas({ dieta = 'omnivora', excluir = [] } = {}) {
  const prohibidas = new Set(excluir.map((x) => (x === 'lactosa' ? 'lacteo' : x))); // las casillas se llaman distinto que las etiquetas
  if (dieta !== 'omnivora') prohibidas.add('carne');
  if (dieta === 'vegetariana' || dieta === 'vegana') prohibidas.add('pescado');
  if (dieta === 'vegana') { prohibidas.add('huevo'); prohibidas.add('lacteo'); }
  return RECETAS.filter((r) => { const e = etiquetas(r.items); return ![...prohibidas].some((x) => e.has(x)); });
}

// dias: [{ k, p }] calorías y proteína que deben aportar comida + cena de cada día (lunes a domingo).
// Devuelve 7 × { comida, cena, k, p }, cada plato con items [[nombre de la base, cantidad]].
export function generarSemana({ dias, dieta, excluir = [], semilla = 1 }) {
  const ok = recetasPermitidas({ dieta, excluir }), comidas = ok.filter((r) => r.tipo !== 'cena'), cenas = ok.filter((r) => r.tipo !== 'comida');
  if (!comidas.length || !cenas.length) return null;
  const rand = rng(semilla), usos = new Map(), res = []; let previo = null;
  for (const d of dias) {
    const C = comidas.map((r) => escalar(r, d.k * 4 / 7)), N = cenas.map((r) => escalar(r, d.k * 3 / 7)), cand = [];
    for (const c of C) for (const n of N) {
      if (c.t === n.t) continue;
      const k = c.k + n.k, p = c.p + n.p, desvio = Math.abs(Math.log(c.factor)) + Math.abs(Math.log(n.factor));
      const rep = (usos.get(c.t) || 0) * 0.4 + (usos.get(n.t) || 0) * 0.4 + (previo && (previo.main === c.main || previo.main === n.main) ? 0.15 : 0) + (c.main === n.main ? 0.12 : 0);
      cand.push({ c, n, k, p, score: Math.abs(k - d.k) / d.k * 3 + Math.max(0, d.p - p) / Math.max(1, d.p) * 1.4 + desvio * 0.12 + rep });
    }
    const libres = cand.filter((x) => (usos.get(x.c.t) || 0) < 2 && (usos.get(x.n.t) || 0) < 2);
    const pool = libres.length ? libres : cand; pool.sort((a, b) => a.score - b.score);
    const top = pool.slice(0, 5), pesos = top.map((_, i) => 1 / (i + 1) ** 1.6), total = pesos.reduce((a, b) => a + b, 0);
    let x = rand() * total, i = 0; while (i < top.length - 1 && x > pesos[i]) { x -= pesos[i]; i++; }
    const e = top[i]; usos.set(e.c.t, (usos.get(e.c.t) || 0) + 1); usos.set(e.n.t, (usos.get(e.n.t) || 0) + 1); previo = e.c;
    res.push({ comida: { t: e.c.t, items: e.c.items }, cena: { t: e.n.t, items: e.n.items }, k: Math.round(e.k), p: Math.round(e.p) });
  }
  return res;
}
