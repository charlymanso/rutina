// Sincronización entre dos dispositivos contra una nube simulada (fetch falso): los cambios en partes distintas se juntan solos.
import assert from 'node:assert/strict';
const almacen = { 'rutina-sesion-v1': JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 9999, user: { id: 'u1', email: 'a@b.c' } }) };
globalThis.localStorage = { getItem: (k) => almacen[k] ?? null, setItem: (k, v) => { almacen[k] = v; }, removeItem: (k) => { delete almacen[k]; } };
let fila = null, n = 0;   // la "nube": una fila con contenido y marca de versión
globalThis.fetch = async (url, o = {}) => {
  const u = String(url), res = (j, status = 200) => ({ ok: status < 300, status, text: async () => JSON.stringify(j) });
  if (!u.includes('/rest/v1/datos')) return res({}, 404);
  if (!o.method || o.method === 'GET') return res(fila ? [fila] : []);
  const body = JSON.parse(o.body);
  if (o.method === 'POST') { if (fila) return res({}, 409); fila = { contenido: body.contenido, actualizado: 'v' + (++n) }; return res([fila]); }
  const m = u.match(/actualizado=eq\.([^&]+)/); if (!fila || decodeURIComponent(m[1]) !== fila.actualizado) return res([]);   // otra versión en la nube: conflicto
  fila = { contenido: body.contenido, actualizado: 'v' + (++n) }; return res([fila]);
};
const Nube = await import('../src/cloud.js'), Sync = await import('../src/sync.js'), { makeTemplate, normalize } = await import('../src/template.js');
await Nube.cargarSesion();
const dispositivo = (datos) => { const x = { data: datos, conflictos: [] }; x.ctx = { getData: () => x.data, setData: (d) => { x.data = d; }, guardar: async () => {}, render: () => {}, onConflicto: (c) => x.conflictos.push(c), onEstado: () => {}, onSesionCaducada: () => {} }; return x; };
const usar = async (x) => { Sync.init(x.ctx); await Sync.sincronizar(); };
const cambiar = (x, f) => { f(x.data); x.data.meta = { ...(x.data.meta || {}), sucio: true }; };

const base = normalize(makeTemplate()); base.perfil.listo = true;
const movil = dispositivo(base); await usar(movil); assert.ok(fila && movil.data.meta.base === fila.actualizado && movil.data.meta.huellas, 'el primer dispositivo sube el plan y guarda sus huellas');
const pc = dispositivo(normalize({})); await usar(pc); assert.equal(pc.data.menu.horas.comida, base.menu.horas.comida, 'el segundo baja el plan'); assert.ok(pc.data.meta.huellas);
// cada uno cambia una parte distinta, sin conexión entre medias
cambiar(movil, (d) => { d.dias['2026-11-10'] = { hechos: { comida: true } }; d.entreno.hora = '07:15'; });
cambiar(pc, (d) => { d.menu.horas.cena = '22:15'; d.pesos = [{ f: '2026-11-10', kg: 80 }]; });
await usar(movil); await usar(pc);
assert.deepEqual(pc.conflictos, [], 'no pregunta: se juntan'); assert.equal(pc.data.entreno.hora, '07:15'); assert.equal(pc.data.menu.horas.cena, '22:15'); assert.ok(pc.data.dias['2026-11-10'].hechos.comida);
await usar(movil); assert.equal(movil.data.menu.horas.cena, '22:15', 'y el móvil recibe lo del ordenador'); assert.equal(movil.data.pesos.length, 1); assert.equal(movil.data.entreno.hora, '07:15');
// la misma parte en los dos: pregunta, y la respuesta solo afecta a esa parte
cambiar(movil, (d) => { d.entreno.hora = '08:00'; d.dias['2026-11-11'] = { hechos: { cena: true } }; });
cambiar(pc, (d) => { d.entreno.hora = '21:00'; });
await usar(pc); await usar(movil);
assert.equal(movil.conflictos.length, 1); assert.deepEqual(movil.conflictos[0].partes, ['Entrenos']);
Sync.init(movil.ctx); await Sync.resolver('nube', movil.conflictos[0].remoto);
assert.equal(movil.data.entreno.hora, '21:00', 'en lo que choca gana lo elegido'); assert.ok(movil.data.dias['2026-11-11'].hechos.cena, 'lo demás no se pierde');
await usar(pc); assert.ok(pc.data.dias['2026-11-11'].hechos.cena && pc.data.entreno.hora === '21:00');
console.log('OK: sincronización por partes');
