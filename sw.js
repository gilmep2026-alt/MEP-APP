// Service Worker para PWA y Notificaciones
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

// Escuchar notificaciones push (si se envían desde el servidor)
self.addEventListener('push', function(e) {
    const data = e.data ? e.data.json() : { title: 'MEP', body: 'Nueva notificación' };
    const options = {
        body: data.body,
        icon: 'logo.png',
        badge: 'logo.png',
        vibrate: [200, 100, 200]
    };
    e.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});