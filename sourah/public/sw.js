// Offline support: the app shell and the mushaf are cached. Audio streams from the network (media range requests are left to the browser).
const VERSION = 'sourah-v2';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/i18n.js', 'js/store.js', 'js/audio.js', 'js/config.js', 'js/planner.js',
  'quran.json', 'fonts/amiri-quran.woff2', 'fonts/manrope-latin-400-normal.woff2', 'fonts/manrope-latin-600-normal.woff2', 'fonts/manrope-latin-800-normal.woff2',
  'fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', 'fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2', 'fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2', 'manifest.webmanifest', 'icons/icon-192.png', 'privacy.html'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Firebase, fonts: handled by the network / Firebase cache
  // stale-while-revalidate for the app shell
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
