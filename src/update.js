// Aviso de versión nueva: consulta la última versión publicada en GitHub (dato público, no se envía nada).
import { esVersionNueva } from './logic.js';

export const REPO = 'charlymanso/rutina';
export const WEB = 'https://rutina-fitness.netlify.app/';

export async function buscarActualizacion() {
  const puente = typeof window !== 'undefined' ? window.rutina : null;
  if (!puente || !puente.version) return null; // solo en la app de escritorio
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const actual = await puente.version();
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { signal: ctl.signal, headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    const rel = await r.json();
    return rel.tag_name && esVersionNueva(actual, rel.tag_name) ? { version: String(rel.tag_name).replace(/^v/, ''), actual, url: WEB } : null;
  } catch { return null; } finally { clearTimeout(t); }
}
