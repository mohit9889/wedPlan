// WedPlan Service Worker
const CACHE_NAME = 'wedplan-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests and same-origin / static assets
  if (request.method !== 'GET') return;

  // Skip supabase API requests and auth callbacks to avoid caching dynamic DB requests
  if (url.pathname.includes('/auth') || url.hostname.includes('supabase')) {
    return;
  }

  // Network-first for HTML page navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Stale-while-revalidate for static assets (images, css, js)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});
