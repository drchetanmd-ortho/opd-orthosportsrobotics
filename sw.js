// Network-first service worker — always serves the latest deployed files when
// online; the cache is only a fallback for offline use. Bump CACHE on breaking
// changes to purge old caches.
const CACHE = 'sportsmed-opd-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Bypass the browser's HTTP cache for our own app files so a fresh deploy
  // always shows immediately. External requests (fonts, CDNs) use normal caching.
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  const fetchOpts = sameOrigin ? { cache: 'no-store' } : undefined;
  e.respondWith(
    fetch(e.request, fetchOpts)
      .then(resp => {
        // Cache a copy of successful same-app responses for offline fallback
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
