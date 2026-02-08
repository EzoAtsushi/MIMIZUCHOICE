/* MIMIZU CHOICE - Service Worker */
const CACHE_NAME = 'mimizu-choice-v2';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // COREは必ずキャッシュ。失敗してもSW自体は入るようにする
    await Promise.allSettled(CORE_ASSETS.map((u) => cache.add(u)));
    // planck.min.js は同階層にある前提（無い場合は無視）
    await cache.add('./planck.min.js').catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// cache-first for same-origin GET, network fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigation: offline fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match('./index.html');
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (_) {
        return cached || new Response('OFFLINE', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  if (!sameOrigin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch (_) {
      return cached || new Response('OFFLINE', { status: 503, statusText: 'Offline' });
    }
  })());
});
