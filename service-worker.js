const VERSION = 'v2';
const CACHE_NAME = `alqurandeep-${VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './assets/logo.svg',
  './offline.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

// Strategy helpers
const fromNetwork = (request) => fetch(request);
const fromCache = (request) => caches.match(request);
const putInCache = async (request, response) => {
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response);
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // HTML navigation requests: network-first with offline fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fromNetwork(req)
        .then((res) => {
          const resClone = res.clone();
          putInCache(req, resClone);
          return res;
        })
        .catch(async () => (await fromCache(req)) || caches.match('./offline.html'))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    fromCache(req).then((cached) => {
      const fetchPromise = fromNetwork(req)
        .then((res) => {
          const resClone = res.clone();
          putInCache(req, resClone);
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
