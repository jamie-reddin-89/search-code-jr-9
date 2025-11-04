const CACHE_NAME = 'jr-app-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/icon-192.png',
  '/og-image.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cross-origin requests (analytics/supabase will go to network)
  if (url.origin !== self.location.origin) {
    // Network-first for external requests
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For navigation, serve index.html (App shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((resp) => resp || fetch('/index.html'))
    );
    return;
  }

  // For other resources, try cache first then network
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      // Optionally cache fetched assets
      if (event.request.method === 'GET' && res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return res;
    }).catch(() => {
      // fallback to cache if offline
      return caches.match('/index.html');
    }))
  );
});

// Background sync: ask clients to perform sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'sync-analytics' }));
      })
    );
  }
});

// Allow clients to trigger a sync via postMessage
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'trigger-sync') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'sync-analytics' }));
    });
  }
});
