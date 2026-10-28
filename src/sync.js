// Sincronización: una copia de tu plan por cuenta. Nunca pisa datos sin avisar:
// si hay cambios en los dos lados, pregunta cuáles conservar.
import * as Nube from './cloud.js';
import { normalize } from './template.js';

let ctx = null, timer = null, enCurso = false, pendiente = false;
export const init = (c) => { ctx = c; };

const limpio = (d) => { const { meta, clima, ...resto } = d; return resto; };
const sinEmpezar = (d) => !d.perfil.listo;
const estado = (e, msg) => ctx && ctx.onEstado({ estado: e, msg, ultima: (ctx.getData().meta || {}).ultima });

export function programar() { if (!ctx || !Nube.haySesion()) return; clearTimeout(timer); timer = setTimeout(sincronizar, 4000); }

export async function sincronizar() {
  if (!ctx || !Nube.haySesion()) return;
  if (enCurso) { pendiente = true; return; }
  enCurso = true; estado('sincronizando');
  try { await ciclo(); estado('ok'); }
  catch (e) { estado(e.offline ? 'offline' : 'error', e.message); if (e.auth) ctx.onSesionCaducada(); }
  finally { enCurso = false; if (pendiente) { pendiente = false; sincronizar(); } }
}

function marcar(d, ts) { d.meta.base = ts; d.meta.sucio = false; d.meta.ultima = Date.now(); return ctx.guardar(); }
function aplicar(remoto) {
  const nuevo = normalize(remoto.contenido); nuevo.perfil.listo = true;
  nuevo.meta = { base: remoto.actualizado, sucio: false, ultima: Date.now() };
  ctx.setData(nuevo); ctx.guardar(); ctx.render();
}

async function ciclo() {
  const d = ctx.getData(); d.meta = d.meta || {};
  const remoto = await Nube.bajar();
  if (!remoto) { if (sinEmpezar(d)) return; return marcar(d, (await Nube.subir(limpio(d), null)).actualizado); }
  if (!d.meta.base) return sinEmpezar(d) ? aplicar(remoto) : ctx.onConflicto({ remoto });   // primera vez en este dispositivo
  if (remoto.actualizado !== d.meta.base) return d.meta.sucio ? ctx.onConflicto({ remoto }) : aplicar(remoto);
  if (d.meta.sucio) {
    try { await marcar(d, (await Nube.subir(limpio(d), d.meta.base)).actualizado); }
    catch (e) { if (e.conflicto) return ciclo(); throw e; }
  }
}

// Respuesta a la pregunta de conflicto: 'nube' conserva lo de la cuenta, 'local' lo de este ordenador.
export async function resolver(eleccion, remoto) {
  const d = ctx.getData(); d.meta = d.meta || {};
  if (eleccion === 'nube') return aplicar(remoto);
  estado('sincronizando');
  try { await marcar(d, (await Nube.subir(limpio(d), remoto.actualizado)).actualizado); estado('ok'); }
  catch (e) { estado(e.offline ? 'offline' : 'error', e.message); }
}
export function olvidar() { if (ctx) { const d = ctx.getData(); d.meta = {}; ctx.guardar(); } }
