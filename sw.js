/* FORJA — service worker: instalación y uso sin conexión.
   Solo toca sus propias cachés (forja-*): otras apps del mismo github.io (p. ej. Bonsai) quedan intactas. */
const CACHE = 'forja-v6';
const SHELL = ['./', 'index.html', 'css/styles.css', 'js/data.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/icon.svg', 'icons/screen-1.png', 'icons/screen-2.png', 'icons/screen-3.png'];

self.addEventListener('install', (e) => {
  // Cada archivo por separado: si uno falla, el resto se guarda igual y la app sigue siendo instalable
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('forja-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Red primero (para recibir actualizaciones); caché si no hay conexión
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && (req.url.startsWith(self.location.origin) || req.url.includes('fonts.g'))) {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
