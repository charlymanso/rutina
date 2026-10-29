// Puente hacia Open Food Facts para la versión web (el navegador no puede llamar directamente al buscador).
// Solo reenvía búsquedas de texto; no guarda nada. Se despliega con la clave pública de la app (verify_jwt activo).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const CAMPOS = 'code,product_name,brands,quantity,nutriments';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (q.length < 2) return json({ hits: [] });
  const u = new URL('https://search.openfoodfacts.org/search');
  u.searchParams.set('q', q); u.searchParams.set('page_size', '20'); u.searchParams.set('langs', 'es'); u.searchParams.set('fields', CAMPOS);
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'Rutina/web (https://github.com/charlymanso/rutina)' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return json({ error: 'upstream' }, 502);
    const j = await r.json();
    return json({ hits: Array.isArray(j.hits) ? j.hits : [] });
  } catch { return json({ error: 'upstream' }, 502); }
});
