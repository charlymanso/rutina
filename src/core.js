// Estado de la app (los datos y lo que se está viendo) y las acciones básicas para cambiarlos y guardarlos.
import { emptyData } from './template.js';
import { store } from './store.js';
import * as Sync from './sync.js';
import { render } from './app.js';

/* ---------- estado ---------- */
export let data = emptyData();
export function setData(d) { data = d; }   // los demás archivos cambian los datos por aquí
export const S = { tab: 'hoy', semSel: 0, compSel: 2, update: null, updateOculto: false, upd: null, autoUpdate: false, saltarInicio: false, animar: false, version: '', aj: null, ajBuscar: '', auth: null, authMsg: '', authForm: { correo: '', clave: '', clave2: '' } };
export const root = document.getElementById('root');
export let saveTimer;
export function commit() {
  data.meta = data.meta || {}; data.meta.sucio = true; data.meta.modificado = Date.now();
  clearTimeout(saveTimer); saveTimer = setTimeout(() => store.save(data), 200); render(); Sync.programar();
}
export function guardarLocal() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.save(data), 200); render(); }
/* ---------- acciones ---------- */
export function diaReg(f) { return (data.dias[f] ||= { hechos: {} }); }
export function toggleHecho(f, k) { const d = diaReg(f); d.hechos = d.hechos || {}; if (d.hechos[k]) delete d.hechos[k]; else d.hechos[k] = true; commit(); }
export function setEj(f, k, patch) { const d = diaReg(f); d.gym = d.gym || {}; d.gym[k] = { ...(d.gym[k] || {}), ...patch }; commit(); }
