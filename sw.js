// Network-first: siempre intenta traer la última versión (config/fondo actualizados);
// sin conexión sirve lo cacheado.
const CACHE = 'procard-20261008145725';
const SHELL = ['./', 'index.html', 'app.js', 'config.json', 'manifest.json',
  'assets/fondo.jpg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/fonts/fonts.css',
  'assets/fonts/fira-sans-condensed-latin-400-normal.woff2',
  'assets/fonts/fira-sans-condensed-latin-500-normal.woff2',
  'assets/fonts/fira-sans-condensed-latin-600-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
