// Service worker de Luis OS (versión web): guarda la app para abrirla sin internet.
const VERSION = 'luisos-v2';
const SHELL = ['./', 'app.js', 'apple-touch-icon.png', 'art.js', 'board.js', 'core.js', 'events.js', 'f1.js', 'files.js', 'finance-data.js', 'finance.js', 'gym.js', 'home.js', 'icon-192.png', 'icon-512.png', 'icon.png', 'index.html', 'lock.js', 'manifest.webmanifest', 'notes.js', 'nutrition.js', 'platform.js', 'settings.js', 'sports.js', 'spotify.js', 'styles.css', 'tasks.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Archivos de la app: primero la red (para recibir actualizaciones) y, sin conexión, la copia guardada.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./'))));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./'))); });
