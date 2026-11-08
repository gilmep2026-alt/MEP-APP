// 1. Subimos la versión a v21 para forzar la actualización en los navegadores de los usuarios
const CACHE_NAME = 'mep-v21'; 
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png'
  // Nota: He quitado icon-192 e icon-512 de aquí por seguridad. 
  // Si no los tienes creados aún, la instalación del SW fallaría por completo.
  // Si ya los tienes, puedes volver a agregarlos a esta lista.
];

// INSTALACIÓN: Guardar el "App Shell" en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos un bucle para que si un archivo falla, no rompa toda la instalación
      return Promise.all(
        ASSETS.map((url) => {
          return cache.add(url).catch((err) => {
            console.warn(`No se pudo cachear el archivo: ${url}`, err);
          });
        })
      );
    })
  );
  self.skipWaiting(); // Fuerza a que el nuevo SW tome el control de inmediato
});

// ACTIVACIÓN: Limpiar cachés antiguas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim(); // Toma el control de las pestañas abiertas
});

// FETCH: Interceptar peticiones
self.addEventListener('fetch', (e) => {
  // Solo procesar peticiones GET
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // 2. CRUCIAL: Ignorar peticiones a PocketBase (API, Realtime, etc.)
  // Esto evita que el chat o las notificaciones en vivo se congelen.
  if (url.pathname.includes('/api/') || url.pathname.includes('/_/')) {
    return; // Deja que el navegador maneje la petición directamente a la red
  }

  // Ignorar peticiones que no sean HTTP/HTTPS (ej. extensiones de Chrome)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 3. Estrategia: Network First (Red primero), Cache Fallback (Caché de respaldo)
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Si la respuesta es exitosa y es un archivo local, actualizamos la caché
        if (networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 4. Si falla la red (offline), buscamos en la caché
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // 5. Si el usuario recarga la página (navegación) y está offline, 
          // le mostramos el index.html guardado en caché.
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
