// Tiempo del día con Open-Meteo (gratuito, sin clave). Falla en silencio si no hay conexión.
import { iso, hoy } from './logic.js';

const CODIGOS = [[[0], 'Despejado'], [[1, 2], 'Poco nuboso'], [[3], 'Nublado'], [[45, 48], 'Niebla'],
  [[51, 53, 55, 56, 57], 'Llovizna'], [[61, 63, 65, 66, 67, 80, 81, 82], 'Lluvia'], [[71, 73, 75, 77, 85, 86], 'Nieve'], [[95, 96, 99], 'Tormenta']];
export const textoClima = (c) => (CODIGOS.find(([cs]) => cs.includes(c)) || [0, 'Variable'])[1];

async function getJSON(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); } finally { clearTimeout(t); }
}

// Devuelve data.clima actualizado (o el anterior si no se puede).
export async function cargarClima(data) {
  const ciudad = (data.perfil.ciudad || '').trim(), f = iso(hoy());
  if (!ciudad) return null;
  if (data.clima && data.clima.fecha === f && data.clima.ciudad === ciudad) return data.clima;
  try {
    const g = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es`);
    const lugar = g.results && g.results[0]; if (!lugar) return { fecha: f, ciudad, error: 'No encuentro esa ciudad.' };
    const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lugar.latitude}&longitude=${lugar.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`);
    const x = w.daily;
    return { fecha: f, ciudad, lugar: lugar.name, texto: textoClima(x.weathercode[0]), max: Math.round(x.temperature_2m_max[0]), min: Math.round(x.temperature_2m_min[0]), lluvia: x.precipitation_probability_max[0] };
  } catch { return data.clima && data.clima.ciudad === ciudad ? data.clima : null; }
}
