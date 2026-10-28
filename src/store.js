// Guardado local. En la app de escritorio usa el puente del proceso principal (archivo en el ordenador);
// en un navegador usa localStorage.
const KEY = 'rutina-datos-v1';
const puente = () => (typeof window !== 'undefined' ? window.rutina : null);

export const store = {
  async load() {
    if (puente()) return puente().load();
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  },
  async save(data) {
    if (puente()) return puente().save(data);
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* sin almacenamiento */ }
  },
  async exportar(data) {
    if (puente()) return puente().exportar(data);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'rutina-copia.json'; a.click(); URL.revokeObjectURL(a.href); return true;
  },
  async importar() {
    if (puente()) return puente().importar();
    return new Promise((res) => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
      i.onchange = async () => { try { res(JSON.parse(await i.files[0].text())); } catch { res(null); } };
      i.click();
    });
  },
  isDesktop: () => !!puente(),
  platform: () => (puente() ? puente().platform : 'web'),
};
