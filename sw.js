const CACHE_NAME = 'mep-v3'; // Cambia este número cada vez que hagas un cambio mayor
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalación: guarda los archivos base
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Fuerza al nuevo SW a activarse de inmediato
});

// Activación: borra cachés viejas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // Toma el control de las páginas abiertas
});

// Estrategia: Red Primero, Caché después (Network First)
self.addEventListener('fetch', (e) => {
  // Solo interceptamos peticiones GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Si hay internet, guardamos la nueva versión en la caché y la mostramos
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return networkResponse;
      })
      .catch(() => {
        // Si falla el internet, buscamos en la caché (Modo Offline)
        return caches.match(e.request);
      })
  );
});
