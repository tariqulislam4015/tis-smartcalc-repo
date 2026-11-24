/* TIS SmartCalc service worker — offline cache */
const CACHE = 'tis-smartcalc-v3';
const FILES = ['./', 'index.html', 'css/style.css', 'js/engine.js', 'js/scientific.js', 'js/models.js', 'js/tools.js', 'js/app.js',
  'manifest.webmanifest', 'assets/logo.svg', 'assets/profile.jpg', 'assets/channel.jpg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
