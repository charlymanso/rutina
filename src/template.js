// Plan de ejemplo para quien empieza, y estructura vacía.
import { iso, lunesDe, hoy, SECC } from './logic.js';
import { buscarPorNombre } from './alimentos.js';

// Ingrediente de la base de alimentos, listo para guardar en el plan
const desdeBase = (nombre) => { const { origen, ...a } = buscarPorNombre(nombre); return a; };
const comida = (t, items) => ({ t, items });
const libre = () => ({ t: 'Comida libre', libre: true, items: [] });
const ej = (n, s, c = false) => ({ n, s, c });

export function emptyData() {
  return {
    version: 1,
    perfil: { listo: false, nombre: '', hogar: [], objetivos: { gym: { kcal: 2400, prot: 140 }, sin: { kcal: 2100, prot: 130 } }, libre: { kcal: 800, prot: 35 } },
    ingredientes: {},
    menu: { ancla: iso(lunesDe(hoy())), horas: { comida: '14:30', cena: '21:00' }, fijos: {
      desayuno: { on: true, hora: '08:00', texto: 'Desayuno', items: [] },
      media: { on: false, hora: '11:00', texto: 'Media mañana', items: [] },
      merienda: { on: false, hora: '17:30', texto: 'Merienda', items: [] } },
      semanas: [Array.from({ length: 7 }, () => ({ comida: null, cena: null }))] },
    entreno: { hora: '18:30', sesiones: [] },
    dias: {}, compra: {}, extrasCompra: [], platosPropios: [],
  };
}

export function makeTemplate() {
  const d = emptyData();
  const base = { pollo: 'Pechuga de pollo', pavo: 'Pechuga de pavo', salmon: 'Salmón', merluza: 'Merluza', atun: 'Atún al natural (lata)', huevo: 'Huevo', yogur: 'Yogur griego 0 %', tofu: 'Tofu firme',
    arroz: 'Arroz blanco', pasta: 'Pasta', lentejas: 'Lentejas (secas)', garbanzos: 'Garbanzos (secos)', avena: 'Copos de avena', almendras: 'Almendras', aceite: 'Aceite de oliva',
    patata: 'Patata', brocoli: 'Brócoli', espinacas: 'Espinacas', tomate: 'Tomate', pimiento: 'Pimiento', cebolla: 'Cebolla', calabacin: 'Calabacín', platano: 'Plátano', manzana: 'Manzana', pan: 'Pan integral' };
  d.ingredientes = Object.fromEntries(Object.entries(base).map(([id, nombre]) => [id, desdeBase(nombre)]));
  d.perfil.objetivos = { gym: { kcal: 1700, prot: 100 }, sin: { kcal: 1550, prot: 95 } };
  d.menu.fijos.desayuno = { on: true, hora: '08:00', texto: 'Avena con yogur y plátano', items: [['avena', 50], ['yogur', 150], ['platano', 1]] };
  d.menu.fijos.media = { on: true, hora: '11:00', texto: 'Una manzana y un puñado de almendras', items: [['manzana', 1], ['almendras', 20]] };
  d.menu.fijos.merienda = { on: false, hora: '17:30', texto: 'Yogur con fruta', items: [['yogur', 125], ['manzana', 1]] };
  d.menu.semanas = [[
    { comida: comida('Pollo con arroz y brócoli', [['pollo', 150], ['arroz', 80], ['brocoli', 150], ['aceite', 10]]), cena: comida('Tortilla de espinacas', [['huevo', 3], ['espinacas', 100], ['aceite', 5]]) },
    { comida: comida('Lentejas con verduras', [['lentejas', 80], ['pimiento', 80], ['cebolla', 50], ['aceite', 10]]), cena: comida('Merluza al horno con patata', [['merluza', 180], ['patata', 200], ['aceite', 8]]) },
    { comida: comida('Pasta con atún y tomate', [['pasta', 90], ['atun', 80], ['tomate', 150], ['aceite', 10]]), cena: comida('Ensalada de pollo', [['pollo', 120], ['tomate', 150], ['pimiento', 80], ['pan', 40], ['aceite', 10]]) },
    { comida: comida('Salmón con patata y brócoli', [['salmon', 150], ['patata', 200], ['brocoli', 100]]), cena: comida('Crema de calabacín y huevo', [['calabacin', 250], ['huevo', 2], ['cebolla', 40], ['pan', 40]]) },
    { comida: comida('Garbanzos con espinacas', [['garbanzos', 80], ['espinacas', 150], ['cebolla', 40], ['aceite', 10]]), cena: comida('Pavo a la plancha con ensalada', [['pavo', 160], ['tomate', 150], ['pan', 40], ['aceite', 10]]) },
    { comida: comida('Arroz con tofu y verduras', [['arroz', 80], ['tofu', 150], ['pimiento', 100], ['cebolla', 50], ['aceite', 10]]), cena: libre() },
    { comida: libre(), cena: comida('Tortilla de patata ligera', [['huevo', 3], ['patata', 150], ['cebolla', 50], ['aceite', 10]]) },
  ]];
  d.entreno.sesiones = [
    { id: 's1', dias: [0], t: 'Empuje: pecho y hombro', min: '60 min', ej: [ej('Press banca', '4×8', true), ej('Press militar con mancuernas', '3×10', true), ej('Fondos en banco', '3×12'), ej('Elevaciones laterales', '3×15', true), ej('Plancha', '3×40 s')] },
    { id: 's2', dias: [2], t: 'Tirón: espalda y bíceps', min: '60 min', ej: [ej('Remo con barra', '4×8', true), ej('Jalón al pecho', '3×10', true), ej('Remo en polea', '3×12', true), ej('Curl de bíceps', '3×12', true), ej('Face pull', '3×15', true)] },
    { id: 's3', dias: [4], t: 'Pierna y core', min: '60 min', ej: [ej('Sentadilla', '4×8', true), ej('Peso muerto rumano', '3×10', true), ej('Zancadas', '3×12', true), ej('Elevación de gemelos', '3×15', true), ej('Rueda abdominal', '3×10')] },
  ];
  return d;
}

// Rellena lo que falte si los datos vienen de una versión anterior o de un archivo importado.
export function normalize(raw) {
  const base = emptyData();
  const d = raw && typeof raw === 'object' ? raw : {};
  const out = { ...base, ...d };
  out.perfil = { ...base.perfil, ...(d.perfil || {}), objetivos: { ...base.perfil.objetivos, ...((d.perfil || {}).objetivos || {}) }, libre: { ...base.perfil.libre, ...((d.perfil || {}).libre || {}) } };
  out.menu = { ...base.menu, ...(d.menu || {}), fijos: { ...base.menu.fijos, ...((d.menu || {}).fijos || {}) }, horas: { ...base.menu.horas, ...((d.menu || {}).horas || {}) } };
  if (!Array.isArray(out.menu.semanas) || !out.menu.semanas.length) out.menu.semanas = base.menu.semanas;
  out.menu.semanas = out.menu.semanas.map((w) => Array.from({ length: 7 }, (_, i) => ({ comida: null, cena: null, ...((w || [])[i] || {}) })));
  out.entreno = { ...base.entreno, ...(d.entreno || {}) };
  if (!Array.isArray(out.entreno.sesiones)) out.entreno.sesiones = [];
  const usados = new Set();                                    // versiones anteriores: una sesión = un día (dia) y sin identificador
  out.entreno.sesiones = out.entreno.sesiones.map((x, i) => {
    const { dia, ...r } = x || {}; r.dias = Array.isArray(r.dias) ? [...new Set(r.dias.filter((n) => n >= 0 && n <= 6))].sort() : (Number.isInteger(dia) ? [dia] : []);
    let id = r.id && !usados.has(r.id) ? r.id : `s${i + 1}`; while (usados.has(id)) id += 'x'; usados.add(id); r.id = id; if (!Array.isArray(r.ej)) r.ej = []; return r;
  });
  for (const g of Object.values(out.ingredientes || {})) {          // datos de versiones anteriores: añade hidratos y grasa si el alimento está en la base
    if (g && g.c == null && g.f == null) { const b = buscarPorNombre(g.n); if (b && b.u === g.u) { g.c = b.c; g.f = b.f; } }
  }
  for (const k of ['ingredientes', 'dias', 'compra']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  delete out.agenda; delete out.clima; if (out.perfil) delete out.perfil.ciudad;                 // versiones anteriores: tiempo y recordatorios ya no existen
  // Con quién comes: personas que comparten algunas de tus comidas. (Antes había un número de "personas en casa" que multiplicaba todo.)
  const COM = ['desayuno', 'media', 'comida', 'merienda', 'cena'], antes = (d.perfil || {}).personas;
  if (Array.isArray((d.perfil || {}).hogar)) out.perfil.hogar = out.perfil.hogar.filter((x) => x && typeof x === 'object').slice(0, 8).map((x, i) => ({ id: String(x.id || 'h' + (i + 1)), n: String(x.n || 'Persona').slice(0, 30), f: Number.isFinite(+x.f) ? Math.min(2, Math.max(0.1, +x.f)) : 1, comidas: Array.isArray(x.comidas) ? COM.filter((c) => x.comidas.includes(c)) : ['comida', 'cena'] }));
  else out.perfil.hogar = Number.isInteger(antes) && antes > 1 ? Array.from({ length: Math.min(antes - 1, 8) }, (_, i) => ({ id: 'h' + (i + 1), n: `Persona ${i + 2}`, f: 1, comidas: [...COM] })) : [];   // mismo resultado que antes: todo para todos, ración igual
  delete out.perfil.personas;
  for (const [f, r] of Object.entries(out.dias)) {                // registros de un día: si algo viene con otra forma (datos viejos o dañados), se corrige sin romper la app
    if (!r || typeof r !== 'object' || Array.isArray(r)) { out.dias[f] = { hechos: {} }; continue; }
    if (r.cambios && typeof r.cambios === 'object' && !Array.isArray(r.cambios)) {
      for (const k of Object.keys(r.cambios)) { const c = r.cambios[k]; if (!c || typeof c.t !== 'string') delete r.cambios[k]; else c.items = Array.isArray(c.items) ? c.items.filter((it) => Array.isArray(it) && it[0]) : []; }
      if (!Object.keys(r.cambios).length) delete r.cambios;
    } else delete r.cambios;
    if (Array.isArray(r.ejExtra)) { r.ejExtra = r.ejExtra.filter((e) => e && typeof e.n === 'string' && e.n.trim()); if (!r.ejExtra.length) delete r.ejExtra; } else delete r.ejExtra;
    if (!Array.isArray(r.ejQuitar)) delete r.ejQuitar;
    if (Array.isArray(r.bloquesQuitar)) { r.bloquesQuitar = r.bloquesQuitar.filter((x) => typeof x === 'string' && x); if (!r.bloquesQuitar.length) delete r.bloquesQuitar; } else delete r.bloquesQuitar;
    if (Array.isArray(r.bloques)) { r.bloques = r.bloques.filter((x) => typeof x === 'string' && x); if (!r.bloques.length) delete r.bloques; } else delete r.bloques;
    if (!Array.isArray(r.extras)) delete r.extras;
  }
  out.platosPropios = (Array.isArray(out.platosPropios) ? out.platosPropios : []).filter((x) => x && typeof x.t === 'string' && x.t.trim() && Array.isArray(x.items)).map((x) => ({ t: x.t.trim(), items: x.items.filter((it) => Array.isArray(it) && it[0]) }));
  out.extrasCompra = (Array.isArray(out.extrasCompra) ? out.extrasCompra : []).filter((x) => x && typeof x.n === 'string' && x.n.trim())
    .map((x, i) => ({ id: String(x.id || 'x' + i), n: x.n.trim(), q: String(x.q || ''), s: SECC.some(([v]) => v === x.s) ? x.s : 'otros', ok: !!x.ok }));
  return out;
}
