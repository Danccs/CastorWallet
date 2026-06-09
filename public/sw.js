// Service worker minimal para soporte de PWA (instalabilidad)
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Pass-through a la red, necesario para cumplir con los criterios de Chrome PWA
  event.respondWith(
    fetch(event.request).catch(() => {
      // Intenta obtener del caché si no hay conexión (opcional)
      return caches.match(event.request);
    })
  );
});
