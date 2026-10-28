// Plan de ejemplo para quien empieza, y estructura vacía.
import { iso, lunesDe, hoy } from './logic.js';

const I = (n, u, k, p, s, pl) => ({ n, u, k, p, s, ...(pl ? { pl } : {}) });
const comida = (t, items) => ({ t, items });
const libre = () => ({ t: 'Comida libre', libre: true, items: [] });
const ej = (n, s, c = false) => ({ n, s, c });

export function emptyData() {
  return {
    version: 1,
    perfil: { listo: false, nombre: '', ciudad: '', personas: 1, objetivos: { gym: { kcal: 2400, prot: 140 }, sin: { kcal: 2100, prot: 130 } }, libre: { kcal: 800, prot: 35 } },
    ingredientes: {},
    menu: { ancla: iso(lunesDe(hoy())), horas: { comida: '14:30', cena: '21:00' }, fijos: {
      desayuno: { on: true, hora: '08:00', texto: 'Desayuno', items: [] },
      media: { on: false, hora: '11:00', texto: 'Media mañana', items: [] },
      merienda: { on: false, hora: '17:30', texto: 'Merienda', items: [] } },
      semanas: [Array.from({ length: 7 }, () => ({ comida: null, cena: null }))] },
    entreno: { hora: '18:30', sesiones: [] },
    dias: {}, compra: {}, agenda: {}, clima: null,
  };
}

export function makeTemplate() {
  const d = emptyData();
  d.ingredientes = {
    pollo: I('Pechuga de pollo', 'g', 120, 23, 'carne'), pavo: I('Pavo en filetes', 'g', 105, 22, 'carne'),
    salmon: I('Salmón', 'g', 208, 20, 'pescado'), merluza: I('Merluza', 'g', 80, 17, 'pescado'),
    atun: I('Atún al natural', 'g', 116, 26, 'despensa'),
    huevo: I('Huevo', 'ud', 72, 6.3, 'lacteos', 'huevos'), yogur: I('Yogur griego 0 %', 'g', 59, 10, 'lacteos'),
    tofu: I('Tofu firme', 'g', 120, 13, 'lacteos'),
    arroz: I('Arroz', 'g', 360, 7, 'despensa'), pasta: I('Pasta', 'g', 350, 12, 'despensa'),
    lentejas: I('Lentejas', 'g', 340, 24, 'despensa'), garbanzos: I('Garbanzos', 'g', 340, 20, 'despensa'),
    avena: I('Copos de avena', 'g', 370, 13, 'despensa'), almendras: I('Almendras', 'g', 600, 21, 'despensa'),
    aceite: I('Aceite de oliva', 'ml', 884, 0, 'despensa'),
    patata: I('Patata', 'g', 77, 2, 'verdura'), brocoli: I('Brócoli', 'g', 34, 2.8, 'verdura'),
    espinacas: I('Espinacas', 'g', 23, 2.9, 'verdura'), tomate: I('Tomate', 'g', 18, 0.9, 'verdura'),
    pimiento: I('Pimiento', 'g', 26, 1, 'verdura'), cebolla: I('Cebolla', 'g', 40, 1.1, 'verdura'),
    calabacin: I('Calabacín', 'g', 17, 1.2, 'verdura'),
    platano: I('Plátano', 'ud', 90, 1, 'verdura', 'plátanos'), manzana: I('Manzana', 'ud', 80, 0.4, 'verdura', 'manzanas'),
    pan: I('Pan integral', 'g', 250, 9, 'pan'),
  };
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
    { dia: 0, t: 'Empuje: pecho y hombro', min: '60 min', ej: [ej('Press banca', '4×8', true), ej('Press militar con mancuernas', '3×10', true), ej('Fondos en banco', '3×12'), ej('Elevaciones laterales', '3×15', true), ej('Plancha', '3×40 s')] },
    { dia: 2, t: 'Tirón: espalda y bíceps', min: '60 min', ej: [ej('Remo con barra', '4×8', true), ej('Jalón al pecho', '3×10', true), ej('Remo en polea', '3×12', true), ej('Curl de bíceps', '3×12', true), ej('Face pull', '3×15', true)] },
    { dia: 4, t: 'Pierna y core', min: '60 min', ej: [ej('Sentadilla', '4×8', true), ej('Peso muerto rumano', '3×10', true), ej('Zancadas', '3×12', true), ej('Elevación de gemelos', '3×15', true), ej('Rueda abdominal', '3×10')] },
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
  for (const k of ['ingredientes', 'dias', 'compra', 'agenda']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  return out;
}
