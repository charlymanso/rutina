// Funcionamiento sin conexión. La app se guarda en el dispositivo; los datos del usuario NO pasan por aquí.
// __BUILD__ lo sustituye el despliegue por el commit, así cada versión nueva renueva la copia guardada.
const CACHE = 'rutina-__BUILD__';
const ARCHIVOS = ['./', 'index.html', 'styles.css', 'app.js', 'logic.js', 'template.js', 'store.js', 'cloud.js', 'sync.js', 'config.js', 'update.js', 'weather.js', 'off.js', 'alimentos.js', 'objetivo.js', 'recetas.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('rutina-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'ACTUALIZAR') self.skipWaiting(); });

// Solo se sirven desde la copia los archivos de la propia app; todo lo demás (cuenta, tiempo, alimentos) va directo a internet.
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok && !u.search) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
    return r;
  }).catch(() => (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
