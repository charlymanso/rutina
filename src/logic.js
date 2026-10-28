// Lógica pura del plan (sin DOM): fechas, kcal/proteína, lista de la compra.
export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const SECC = [['carne', 'Carne y charcutería'], ['pescado', 'Pescadería'], ['verdura', 'Fruta y verdura'], ['lacteos', 'Huevos, lácteos y refrigerados'], ['despensa', 'Despensa'], ['pan', 'Panadería'], ['congelados', 'Congelados']];
export const FIJOS = [['desayuno', 'Desayuno'], ['media', 'Media mañana'], ['merienda', 'Merienda']];

export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const mediodia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const idxDia = (d) => (d.getDay() + 6) % 7;
export const lunesDe = (d) => addDays(mediodia(d), -idxDia(d));
export const hoy = () => mediodia(new Date());
export const minutos = (h) => { const [a, b] = String(h).split(':'); return (+a) * 60 + (+b || 0); };
export const fechaLarga = (d) => `${DIAS[idxDia(d)]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
export const fechaCorta = (d) => `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
export const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const slug = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
export const kgTxt = (n) => String(n).replace('.', ',');

// ---- ciclo de menú ----
export function semanaIdx(data, lunes) {
  const n = data.menu.semanas.length || 1;
  const ancla = lunesDe(parseISO(data.menu.ancla));
  const w = Math.round((lunes - ancla) / (7 * 864e5));
  return ((w % n) + n) % n;
}
export const semanaDe = (data, lunes) => data.menu.semanas[semanaIdx(data, lunes)] || [];
export const diaMenu = (data, d) => semanaDe(data, lunesDe(d))[idxDia(d)] || null;

// ---- entreno ----
export const sesionGym = (data, i) => data.entreno.sesiones.find((s) => s.dia === i) || null;
export const esDiaGym = (data, d) => !!sesionGym(data, idxDia(d));

// ---- ingredientes y nutrición ----
export const ing = (data, id) => data.ingredientes[id] || { n: id, u: 'g', k: 0, p: 0, s: 'despensa' };
const porUnidad = (g, q) => (g.u === 'ud' ? q : q / 100);
export const kcalDe = (data, id, q) => ing(data, id).k * porUnidad(ing(data, id), q);
export const protDe = (data, id, q) => ing(data, id).p * porUnidad(ing(data, id), q);
export const sumaItems = (data, items) => (items || []).reduce((a, [id, q]) => ({ k: a.k + kcalDe(data, id, q), p: a.p + protDe(data, id, q) }), { k: 0, p: 0 });
export const fijoOn = (data, clave) => { const f = data.menu.fijos[clave]; return f && f.on ? f : null; };
export const comidasDelDia = (data) => ['desayuno', 'media', 'merienda'].filter((c) => fijoOn(data, c)).concat(['comida', 'cena']);

export function totalDia(data, d) {
  const dm = diaMenu(data, d); if (!dm) return null;
  let k = 0, p = 0, libre = false;
  for (const c of ['desayuno', 'media', 'merienda']) { const f = fijoOn(data, c); if (f) { const s = sumaItems(data, f.items); k += s.k; p += s.p; } }
  for (const m of ['comida', 'cena']) {
    const pl = dm[m]; if (!pl) continue;
    if (pl.libre) { libre = true; k += data.perfil.libre.kcal; p += data.perfil.libre.prot; continue; }
    const s = sumaItems(data, pl.items); k += s.k; p += s.p;
  }
  return { k, p, libre };
}
export const objetivo = (data, d) => (esDiaGym(data, d) ? data.perfil.objetivos.gym : data.perfil.objetivos.sin);

// ---- textos ----
export function linea(data, [id, q]) {
  const g = ing(data, id);
  if (g.u === 'ud') return `${q} ${q > 1 ? (g.pl || g.n) : g.n}`;
  return `${g.n} ${q} ${g.u}`;
}
export function gramos(q, u) {
  if (q >= 1000) return `${(q / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${u === 'ml' ? 'L' : 'kg'}`;
  return `${Math.round(q)} ${u}`;
}
export function cantidadCompra(data, id, q) {
  const g = ing(data, id);
  if (g.u === 'ud') return `${q} ${q === 1 ? g.n : (g.pl || g.n)}`;
  return gramos(q, g.u);
}

// ---- lista de la compra ----
// sel: 0 esta semana, 1 la siguiente, 2 las dos. Devuelve { id: cantidad }
export function listaCompra(data, sel, desde = hoy()) {
  if (sel === 2) {
    const a = listaCompra(data, 0, desde), b = listaCompra(data, 1, desde);
    for (const k of Object.keys(b)) a[k] = (a[k] || 0) + b[k];
    return a;
  }
  const lun = addDays(lunesDe(desde), sel * 7), tot = {}, n = data.perfil.personas || 1;
  const suma = (id, q) => { tot[id] = (tot[id] || 0) + q * n; };
  semanaDe(data, lun).forEach((dm) => {
    for (const m of ['comida', 'cena']) { const pl = dm[m]; if (pl && !pl.libre) (pl.items || []).forEach(([id, q]) => suma(id, q)); }
    for (const c of ['desayuno', 'media', 'merienda']) { const f = fijoOn(data, c); if (f) (f.items || []).forEach(([id, q]) => suma(id, q)); }
  });
  return tot;
}
export const claveCompra = (sel, desde = hoy()) => (sel === 2 ? `dos-${iso(lunesDe(desde))}` : iso(addDays(lunesDe(desde), sel * 7)));
export function textoCompra(data, sel) {
  const tot = listaCompra(data, sel), ids = Object.keys(tot), out = [];
  for (const [sc, nombre] of SECC) {
    const its = ids.filter((i) => ing(data, i).s === sc).sort((a, b) => ing(data, a).n.localeCompare(ing(data, b).n, 'es'));
    if (!its.length) continue;
    out.push(nombre.toUpperCase());
    its.forEach((i) => out.push(`- ${ing(data, i).n}: ${cantidadCompra(data, i, tot[i])}`));
    out.push('');
  }
  return out.join('\n').trim();
}

// ---- registros ----
export const hechosDe = (data, f) => (data.dias[f] && data.dias[f].hechos) || {};
export const regGym = (data, f) => (data.dias[f] && data.dias[f].gym) || {};
export function ultimoPeso(data, k, antesDe) {
  let best = null;
  for (const f of Object.keys(data.dias)) {
    if (antesDe && f >= antesDe) continue;
    const g = data.dias[f].gym && data.dias[f].gym[k];
    if (g && g.kg != null && (!best || f > best.f)) best = { f, kg: g.kg };
  }
  return best;
}
export const semaforo = (n) => (n == null ? '' : n <= 3 ? 'verde' : n === 4 ? 'ambar' : 'rojo');
export function racha(data, d = hoy()) {
  const total = comidasDelDia(data).length, hechas = (x) => comidasDelDia(data).filter((c) => hechosDe(data, iso(x))[c]).length;
  let n = 0, r = d;
  if (hechas(r) < total) r = addDays(r, -1);
  while (hechas(r) === total && n < 400) { n++; r = addDays(r, -1); }
  return n;
}

// ---- versiones ----
// true si `remota` (p. ej. "v0.1.4") es más nueva que `actual` (p. ej. "0.1.3")
export function esVersionNueva(actual, remota) {
  const n = (v) => String(v).replace(/^v/, '').split('-')[0].split('.').map((x) => parseInt(x, 10) || 0);
  const a = n(actual), b = n(remota);
  for (let i = 0; i < 3; i++) { if ((b[i] || 0) !== (a[i] || 0)) return (b[i] || 0) > (a[i] || 0); }
  return false;
}
