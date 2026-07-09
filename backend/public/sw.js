const CACHE_NAME = 'studio5-tickets-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700;900&display=swap'
];

// Instalar el Service Worker y almacenar recursos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Almacenando recursos estáticos en caché');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar el SW y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones para servir desde caché si está fuera de línea
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones de la API de backend para evitar cachear datos dinámicos o POSTs
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cachear dinámicamente nuevos recursos estáticos
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback offline para navegación HTML
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ─── Notificaciones Push Web ────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Studio 5 Film', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Studio 5 Film';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'studio5-notification',
    data: { url: data.url || '/' },
    requireInteraction: true,   // La notificación permanece hasta que el usuario la cierre
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Ver ahora' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Al hacer clic en la notificación, abrir la URL correspondiente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta con la app, enfocarla
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
