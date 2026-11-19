/* Home Base service worker. Bump VERSION when shipping a new app shell. */
const VERSION = '1';
const CACHE = 'home-base-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './manifest.webmanifest',
  './js/ui.js',
  './js/views.js',
  './js/html.js',
  './js/actions.js',
  './js/migrate.js',
  './js/defaults.js',
  './js/snapshot.js',
  './js/labels.js',
  './js/badges.js',
  './js/stats.js',
  './js/moon.js',
  './js/tracker.js',
  './js/quests.js',
  './js/now.js',
  './js/rooms.js',
  './js/days.js',
  './js/xp.js',
  './js/dates.js',
  './js/v2-data.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) client.postMessage({ type: 'updated', version: VERSION });
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      const copy = fresh.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const home = await caches.match('./index.html');
        if (home) return home;
      }
      throw err;
    }
  })());
});
