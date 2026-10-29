// Open Food Facts: productos de supermercado con su información nutricional por 100 g / 100 ml.
import { NUBE } from './config.js';
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

// null = no disponible aquí. En el ordenador va por la app; en la web, por un pequeño puente en la nube de la cuenta
// (el navegador no puede consultar directamente el buscador). Lanza si no hay conexión.
async function hits(q) {
  if (puente() && puente().buscarAlimentos) return puente().buscarAlimentos(q);
  if (!NUBE.url) return null;
  const r = await fetch(`${NUBE.url}/functions/v1/alimentos?q=${encodeURIComponent(q)}`, { headers: { apikey: NUBE.anonKey, Authorization: `Bearer ${NUBE.anonKey}` } });
  if (!r.ok) throw new Error('sin conexión'); return (await r.json()).hits || [];
}
export async function buscarOnline(q) {
  const lista = await hits(q); if (lista === null) return null;
  const vistos = new Set();
  return lista.map(aAlimento).filter((a) => a && !vistos.has(a.n.toLowerCase()) && vistos.add(a.n.toLowerCase()));
}
export async function porCodigo(codigo) {
  const prod = puente() && puente().alimentoPorCodigo ? await puente().alimentoPorCodigo(codigo)
    : (await (await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}?fields=code,product_name,brands,quantity,nutriments`)).json()).product;
  return prod ? aAlimento(prod) : null;
}
export const esCodigoDeBarras = (q) => /^\d{8,14}$/.test(String(q).trim());
