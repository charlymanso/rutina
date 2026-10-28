// Base de alimentos básica (funciona sin internet). Valores medios orientativos por 100 g / 100 ml, o por unidad.
// [nombre, unidad, kcal, proteína, hidratos, grasa, sección del súper, cantidad habitual, plural]
const B = [
  // Carne y charcutería
  ['Pechuga de pollo', 'g', 120, 22.5, 0, 2.6, 'carne', 150], ['Muslo de pollo (sin piel)', 'g', 140, 19, 0, 7, 'carne', 150], ['Pechuga de pavo', 'g', 105, 23, 0, 1.5, 'carne', 150],
  ['Ternera magra', 'g', 135, 21, 0, 5, 'carne', 150], ['Ternera picada', 'g', 215, 19, 0, 15, 'carne', 150], ['Lomo de cerdo', 'g', 143, 21, 0, 5.5, 'carne', 150],
  ['Hamburguesa de ternera', 'g', 240, 17, 0, 19, 'carne', 120], ['Jamón serrano', 'g', 241, 31, 0, 13, 'carne', 40], ['Jamón cocido', 'g', 110, 17, 1, 4, 'carne', 40],
  ['Fiambre de pavo', 'g', 90, 17, 1.5, 1.5, 'carne', 40], ['Chorizo', 'g', 455, 24, 2, 38, 'carne', 30], ['Salchichas', 'g', 300, 12, 3, 27, 'carne', 100],
  // Pescadería
  ['Salmón', 'g', 208, 20, 0, 13, 'pescado', 150], ['Merluza', 'g', 80, 17, 0, 1.3, 'pescado', 180], ['Atún fresco', 'g', 130, 24, 0, 3, 'pescado', 150],
  ['Atún al natural (lata)', 'g', 116, 26, 0, 1, 'despensa', 80], ['Bacalao fresco', 'g', 82, 18, 0, 0.7, 'pescado', 180], ['Dorada', 'g', 96, 18, 0, 2.5, 'pescado', 180],
  ['Lubina', 'g', 97, 18, 0, 2.5, 'pescado', 180], ['Gambas', 'g', 85, 18, 0.5, 1, 'pescado', 150], ['Calamar', 'g', 82, 15, 2, 1.4, 'pescado', 150],
  ['Sardinas en lata', 'g', 210, 24, 0, 12, 'despensa', 80], ['Mejillones', 'g', 86, 12, 3.5, 2, 'pescado', 150],
  // Huevos y lácteos
  ['Huevo', 'ud', 72, 6.3, 0.4, 4.8, 'lacteos', 2, 'huevos'], ['Clara de huevo', 'ud', 17, 3.6, 0.2, 0.1, 'lacteos', 3, 'claras'],
  ['Leche semidesnatada', 'ml', 46, 3.4, 4.8, 1.6, 'lacteos', 200], ['Leche entera', 'ml', 64, 3.3, 4.7, 3.6, 'lacteos', 200], ['Leche desnatada', 'ml', 34, 3.4, 4.8, 0.2, 'lacteos', 200],
  ['Yogur natural', 'g', 61, 3.5, 4.7, 3.3, 'lacteos', 125], ['Yogur griego 0 %', 'g', 57, 10, 4, 0.2, 'lacteos', 150], ['Yogur griego entero', 'g', 115, 5, 4, 9, 'lacteos', 125],
  ['Queso fresco batido 0 %', 'g', 46, 8, 4, 0.2, 'lacteos', 125], ['Requesón', 'g', 98, 11, 3.4, 4.3, 'lacteos', 100], ['Queso curado', 'g', 390, 25, 0.5, 32, 'lacteos', 30],
  ['Mozzarella', 'g', 250, 18, 1.5, 19, 'lacteos', 60], ['Queso en lonchas', 'g', 300, 20, 2, 23, 'lacteos', 30], ['Mantequilla', 'g', 740, 0.6, 0.1, 82, 'lacteos', 10],
  ['Kéfir', 'g', 55, 3.5, 4.5, 2, 'lacteos', 200], ['Tofu firme', 'g', 120, 13, 2, 7, 'lacteos', 150], ['Tempeh', 'g', 190, 19, 9, 11, 'lacteos', 100], ['Seitán', 'g', 140, 25, 4, 2, 'lacteos', 100],
  // Cereales, pan y legumbres
  ['Arroz blanco', 'g', 360, 7, 79, 0.6, 'despensa', 80], ['Arroz integral', 'g', 350, 7.5, 74, 2.7, 'despensa', 80], ['Pasta', 'g', 350, 12, 72, 1.5, 'despensa', 90],
  ['Pasta integral', 'g', 340, 13, 64, 2.5, 'despensa', 90], ['Copos de avena', 'g', 370, 13, 60, 7, 'despensa', 50], ['Quinoa', 'g', 365, 14, 64, 6, 'despensa', 80],
  ['Cuscús', 'g', 360, 12, 73, 1.6, 'despensa', 80], ['Harina de trigo', 'g', 350, 10, 73, 1, 'despensa', 50], ['Cereales de desayuno', 'g', 375, 7, 84, 1, 'despensa', 40],
  ['Galletas María', 'g', 440, 7, 75, 12, 'despensa', 30], ['Pan blanco', 'g', 265, 9, 50, 3, 'pan', 40], ['Pan integral', 'g', 250, 9, 43, 3.5, 'pan', 40],
  ['Pan de molde integral', 'g', 250, 9, 41, 4, 'pan', 50], ['Tortilla de trigo', 'g', 300, 8, 50, 7, 'pan', 60],
  ['Lentejas (secas)', 'g', 340, 24, 52, 1.5, 'despensa', 80], ['Garbanzos (secos)', 'g', 360, 20, 50, 5, 'despensa', 80], ['Alubias (secas)', 'g', 330, 22, 47, 1.5, 'despensa', 80],
  ['Garbanzos cocidos', 'g', 120, 7, 16, 2.5, 'despensa', 200], ['Lentejas cocidas', 'g', 105, 8, 15, 0.5, 'despensa', 200], ['Soja texturizada', 'g', 330, 50, 30, 1, 'despensa', 40],
  // Verdura
  ['Patata', 'g', 77, 2, 17, 0.1, 'verdura', 200], ['Boniato', 'g', 86, 1.6, 20, 0.1, 'verdura', 200], ['Brócoli', 'g', 34, 2.8, 7, 0.4, 'verdura', 150],
  ['Coliflor', 'g', 25, 2, 5, 0.3, 'verdura', 150], ['Espinacas', 'g', 23, 2.9, 3.6, 0.4, 'verdura', 100], ['Tomate', 'g', 18, 0.9, 3.9, 0.2, 'verdura', 150],
  ['Pimiento', 'g', 26, 1, 5, 0.3, 'verdura', 80], ['Cebolla', 'g', 40, 1.1, 9, 0.1, 'verdura', 50], ['Zanahoria', 'g', 41, 0.9, 10, 0.2, 'verdura', 80],
  ['Calabacín', 'g', 17, 1.2, 3, 0.3, 'verdura', 200], ['Berenjena', 'g', 25, 1, 6, 0.2, 'verdura', 150], ['Lechuga', 'g', 15, 1.4, 2.9, 0.2, 'verdura', 60],
  ['Pepino', 'g', 15, 0.7, 3.6, 0.1, 'verdura', 100], ['Champiñones', 'g', 22, 3, 3.3, 0.3, 'verdura', 150], ['Ajo', 'g', 149, 6.4, 33, 0.5, 'verdura', 5],
  ['Judías verdes', 'g', 31, 1.8, 7, 0.2, 'verdura', 200], ['Guisantes', 'g', 81, 5, 14, 0.4, 'verdura', 100], ['Maíz dulce', 'g', 86, 3.3, 19, 1.2, 'verdura', 80],
  ['Aguacate', 'g', 160, 2, 9, 15, 'verdura', 70], ['Calabaza', 'g', 26, 1, 6.5, 0.1, 'verdura', 200], ['Puerro', 'g', 31, 1.5, 7, 0.3, 'verdura', 100],
  ['Espárragos', 'g', 20, 2.2, 3.9, 0.1, 'verdura', 150], ['Remolacha cocida', 'g', 43, 1.7, 10, 0.2, 'verdura', 100],
  // Fruta
  ['Plátano', 'ud', 90, 1, 22, 0.3, 'verdura', 1, 'plátanos'], ['Manzana', 'ud', 80, 0.4, 21, 0.3, 'verdura', 1, 'manzanas'], ['Naranja', 'ud', 70, 1.4, 17, 0.2, 'verdura', 1, 'naranjas'],
  ['Mandarina', 'ud', 35, 0.6, 9, 0.2, 'verdura', 2, 'mandarinas'], ['Pera', 'ud', 95, 0.6, 25, 0.2, 'verdura', 1, 'peras'], ['Kiwi', 'ud', 45, 0.8, 11, 0.4, 'verdura', 2, 'kiwis'],
  ['Melocotón', 'ud', 60, 1.4, 14, 0.4, 'verdura', 1, 'melocotones'], ['Fresas', 'g', 32, 0.7, 7.7, 0.3, 'verdura', 150], ['Uvas', 'g', 69, 0.7, 18, 0.2, 'verdura', 120],
  ['Piña', 'g', 50, 0.5, 13, 0.1, 'verdura', 150], ['Sandía', 'g', 30, 0.6, 7.6, 0.2, 'verdura', 250], ['Melón', 'g', 34, 0.8, 8, 0.2, 'verdura', 250],
  ['Arándanos', 'g', 57, 0.7, 14, 0.3, 'verdura', 100], ['Mango', 'g', 60, 0.8, 15, 0.4, 'verdura', 150], ['Dátiles', 'g', 280, 2.5, 75, 0.4, 'despensa', 30],
  // Frutos secos, grasas y dulces
  ['Almendras', 'g', 580, 21, 22, 50, 'despensa', 25], ['Nueces', 'g', 654, 15, 14, 65, 'despensa', 25], ['Cacahuetes', 'g', 590, 26, 16, 50, 'despensa', 25],
  ['Anacardos', 'g', 555, 18, 30, 44, 'despensa', 25], ['Pistachos', 'g', 560, 20, 28, 45, 'despensa', 25], ['Crema de cacahuete', 'g', 600, 25, 20, 50, 'despensa', 15],
  ['Semillas de chía', 'g', 490, 17, 42, 31, 'despensa', 15], ['Aceite de oliva', 'ml', 810, 0, 0, 91, 'despensa', 10], ['Chocolate negro 70 %', 'g', 600, 8, 46, 43, 'despensa', 20],
  ['Miel', 'g', 300, 0.3, 82, 0, 'despensa', 15], ['Azúcar', 'g', 400, 0, 100, 0, 'despensa', 10], ['Mermelada', 'g', 250, 0.5, 60, 0.1, 'despensa', 20], ['Hummus', 'g', 180, 8, 14, 11, 'lacteos', 50],
  ['Proteína en polvo (whey)', 'g', 400, 80, 8, 6, 'despensa', 30],
  // Salsas y bebidas
  ['Tomate frito', 'g', 80, 1.4, 11, 3.5, 'despensa', 60], ['Tomate triturado', 'g', 24, 1.2, 4.5, 0.2, 'despensa', 150], ['Mayonesa', 'g', 680, 1, 1, 75, 'despensa', 15],
  ['Kétchup', 'g', 110, 1, 26, 0, 'despensa', 15], ['Salsa de soja', 'ml', 60, 8, 5, 0, 'despensa', 10],
  ['Bebida de soja', 'ml', 40, 3.3, 2.5, 2, 'lacteos', 200], ['Bebida de avena', 'ml', 45, 1, 9, 1, 'lacteos', 200], ['Bebida de almendras', 'ml', 25, 0.5, 3, 1.1, 'lacteos', 200],
  ['Zumo de naranja', 'ml', 45, 0.7, 10, 0.2, 'despensa', 200], ['Refresco de cola', 'ml', 42, 0, 10.6, 0, 'despensa', 330], ['Cerveza', 'ml', 43, 0.5, 3.6, 0, 'despensa', 330],
  ['Vino tinto', 'ml', 85, 0.1, 2.6, 0, 'despensa', 150], ['Café solo', 'ml', 2, 0.1, 0, 0, 'despensa', 50],
];

const sinTildes = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const aAlimento = ([n, u, k, p, c, f, s, por, pl]) => ({ n, u, k, p, c, f, s, por, ...(pl ? { pl } : {}), origen: 'base' });

export const BASE = B.map(aAlimento);
export const normalizar = sinTildes;

// Busca por nombre sin importar tildes ni mayúsculas. Primero los que empiezan por la búsqueda.
export function buscarLocal(q, lista = BASE, max = 25) {
  const t = sinTildes(q).trim(); if (!t) return [];
  const palabras = t.split(/\s+/);
  return lista.map((a) => ({ a, n: sinTildes(a.n) })).filter(({ n }) => palabras.every((w) => n.includes(w)))
    .sort((x, y) => (y.n.startsWith(t) - x.n.startsWith(t)) || x.a.n.length - y.a.n.length).slice(0, max).map(({ a }) => a);
}
export const buscarPorNombre = (nombre) => BASE.find((a) => sinTildes(a.n) === sinTildes(nombre)) || null;
