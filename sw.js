/* ============================================================================
   MEP · Service Worker
   Estrategia:
   · Navegación  → red primero con timeout de 4 s, respaldo en caché (index.html).
   · Estáticos   → stale-while-revalidate (respuesta inmediata + refresco en 2º plano).
   · Cross-origin (PocketBase, fuentes, YouTube) → NO se intercepta nunca.
     Eso protege el realtime (SSE) y las descargas de /api/files/.
   ========================================================================== */

const VERSION = 'mep-v23';
const STATIC_CACHE = 'mep-static-' + VERSION;
const RUNTIME_CACHE = 'mep-runtime-' + VERSION;
const MAX_ESTATICOS = 90;
const TIMEOUT_NAVEGACION = 4000;

const PRECACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/estatutos.html',
  '/etica.html', /* <-- NUEVA LÍNEA AGREGADA AQUÍ */
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png'
];

/* ------------------------------------------------------------- instalación */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // allSettled: si un archivo falla no aborta toda la instalación.
    await Promise.allSettled(
      PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
    await self.skipWaiting();
  })());
});

/* ---------------------------------------------------------------- activación */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
        .map((k) => caches.delete(k))
    );
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) { }
    }
    await self.clients.claim();
  })());
});

/* ------------------------------------------------------------------ helpers */
async function recortarCache(nombre, maximo) {
  const cache = await caches.open(nombre);
  const keys = await cache.keys();
  if (keys.length <= maximo) return;
  const sobran = keys.slice(0, keys.length - maximo);
  await Promise.all(sobran.map((k) => cache.delete(k)));
}

async function fetchConTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function respuestaOffline() {
  return new Response(
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>MEP · Sin conexión</title></head>' +
    '<body style="margin:0;background:#080212;color:#f8f6fc;font-family:system-ui,sans-serif;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px">' +
    '<div><h1 style="color:#ffd700;font-size:22px;margin:0 0 12px">Sin conexión</h1>' +
    '<p style="color:#c8bce0;max-width:340px">No pudimos cargar la aplicación. ' +
    'Revisa tu conexión e inténtalo de nuevo.</p>' +
    '<p><button onclick="location.reload()" style="margin-top:16px;padding:12px 22px;border:0;border-radius:12px;' +
    'background:#ffd700;color:#110424;font-weight:700;font-size:15px">Reintentar</button></p></div>' +
    '</body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/* ------------------------------------------------------------ navegación */
async function manejarNavegacion(request) {
  const url = new URL(request.url);
  const esApp = url.pathname === '/' || url.pathname === '/index.html';

  try {
    const respuesta = await fetchConTimeout(request, TIMEOUT_NAVEGACION);
    if (respuesta && respuesta.ok) {
      const cache = await caches.open(STATIC_CACHE);
      // Solo la app se guarda bajo /index.html. Las demás páginas
      // (estatutos.html, etica.html) se guardan con su propia URL para no pisar la portada.
      await cache.put(esApp ? '/index.html' : request, respuesta.clone());
    }
    return respuesta;
  } catch (_) {
    const cache = await caches.open(STATIC_CACHE);
    const exacta = await cache.match(request, { ignoreSearch: true });
    if (exacta) return exacta;
    if (esApp) {
      const portada = await cache.match('/index.html', { ignoreSearch: true });
      if (portada) return portada;
    }
    return respuestaOffline();
  }
}

/* --------------------------------------------------------------- estáticos */
async function manejarEstatico(request) {
  const cache = await caches.open(STATIC_CACHE);
  const guardado = await cache.match(request, { ignoreSearch: true });

  const actualizacion = fetch(request)
    .then(async (respuesta) => {
      if (respuesta && respuesta.ok && respuesta.type === 'basic') {
        await cache.put(request, respuesta.clone());
        await recortarCache(STATIC_CACHE, MAX_ESTATICOS);
      }
      return respuesta;
    })
    .catch(() => null);

  if (guardado) return guardado;

  const respuesta = await actualizacion;
  if (respuesta) return respuesta;

  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" fill="#1a0b30"/>' +
      '<text x="50%" y="50%" fill="#ffd700" font-size="16" text-anchor="middle" font-family="sans-serif">Sin conexión</text></svg>',
      { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }

  return new Response('', { status: 504, statusText: 'Sin conexión' });
}

/* ------------------------------------------------------------------- fetch */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (_) { return; }

  // Solo gestionamos el propio origen: PocketBase, fuentes y YouTube pasan directo.
  if (url.origin !== self.location.origin) return;

  // Rutas de API o del panel de PocketBase (por si algún día se sirven aquí).
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(manejarNavegacion(request));
    return;
  }

  event.respondWith(manejarEstatico(request));
});

/* ----------------------------------------------------------------- mensajes */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* -------------------------------------------------------- notificaciones */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const ventana of ventanas) {
      if ('focus' in ventana) return ventana.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('/');
  })());
});
