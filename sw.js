// 1. Subimos la versión a v6 para forzar la actualización
const CACHE_NAME = 'mep-v6'; 
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Solo procesar peticiones GET
  if (e.request.method !== 'GET') return;

  // 2. MUY IMPORTANTE: No interceptar las peticiones a la API de PocketBase
  // ni conexiones en tiempo real (SSE). Deja que fluyan directo a la red.
  if (e.request.url.includes('/api/')) {
    return; 
  }

  // Para el resto de archivos (html, imágenes, etc), intenta red primero, luego caché
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Solo guardar en caché si la respuesta es exitosa (status 200)
        if (networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
