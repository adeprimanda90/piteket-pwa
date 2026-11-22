const CACHE_NAME = 'piteket-pwa-v13';
const STATIC_ASSETS = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/js/auth-sync.js',
  '/js/calendar-engine.js',
  '/js/dewasa-engine.js',
  '/js/ics-export.js',
  '/js/checklists.js',
  '/js/smart-search.js',
  '/assets/tutorial-1-dresta.gif',
  '/assets/tutorial-2-kalender.gif',
  '/assets/tutorial-3-otonan.gif',
  '/assets/tutorial-4-search-piteket.gif',
  '/manifest.json',
  '/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put('/', copy));
          }
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  if (req.url.includes('/data/') || req.url.includes('/js/config.js')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && !res.redirected && req.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
