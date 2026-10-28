// Open Food Facts: productos de supermercado con su información nutricional por 100 g / 100 ml.
const puente = () => (typeof window !== 'undefined' ? window.rutina : null);
const r1 = (n) => Math.round(n * 10) / 10;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Convierte un producto de OFF en un alimento de Rutina. Devuelve null si faltan calorías o proteína (datos poco fiables).
export function aAlimento(p) {
  const nombre = String(p.product_name || '').trim(); if (!nombre) return null;
  const n = p.nutriments || {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) != null ? n['energy_100g'] / 4.184 : null), prot = num(n['proteins_100g']);
  if (kcal == null || kcal <= 0 || kcal > 950 || prot == null) return null;
  const marca = Array.isArray(p.brands) ? p.brands[0] : String(p.brands || '').split(',')[0].trim();
  const c = num(n['carbohydrates_100g']), f = num(n['fat_100g']);
  return { n: marca && !nombre.toLowerCase().includes(marca.toLowerCase()) ? `${nombre} (${marca})` : nombre, u: /\d\s*(ml|cl|l)\b/i.test(p.quantity || '') ? 'ml' : 'g',
    k: Math.round(kcal), p: r1(prot), ...(c != null ? { c: r1(c) } : {}), ...(f != null ? { f: r1(f) } : {}), s: 'despensa', por: 100, origen: 'off', code: p.code };
}

// null = no disponible aquí (navegador). Lanza si no hay conexión.
export async function buscarOnline(q) {
  if (!puente() || !puente().buscarAlimentos) return null;
  const vistos = new Set();
  return (await puente().buscarAlimentos(q)).map(aAlimento).filter((a) => a && !vistos.has(a.n.toLowerCase()) && vistos.add(a.n.toLowerCase()));
}
export async function porCodigo(codigo) {
  const prod = puente() && puente().alimentoPorCodigo ? await puente().alimentoPorCodigo(codigo)
    : (await (await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}?fields=code,product_name,brands,quantity,nutriments`)).json()).product;
  return prod ? aAlimento(prod) : null;
}
export const esCodigoDeBarras = (q) => /^\d{8,14}$/.test(String(q).trim());
