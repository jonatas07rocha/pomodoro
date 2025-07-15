const CACHE_NAME = 'foco-total-v1.8'; // Nova versão para forçar atualização
let notificationTimer; // Variável para guardar o nosso temporizador

// Listener para mensagens vindas do app principal (index.html)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { duration } = event.data;
    console.log(`Service Worker: Notificação agendada para daqui a ${duration / 1000} segundos.`);
    
    // Cancela qualquer temporizador anterior para evitar notificações duplicadas
    clearTimeout(notificationTimer);

    // Agenda a nova notificação
    notificationTimer = setTimeout(() => {
      console.log('Service Worker: Disparando notificação agendada.');
      const title = 'Foco Total ⏰';
      const options = {
        body: 'A sua sessão de foco terminou. Hora de fazer uma pausa!',
        icon: 'icon-192x192.png',
        badge: 'icon-192x192.png',
        vibrate: [200, 100, 200]
      };
      // Mostra a notificação
      self.registration.showNotification(title, options);
    }, duration);
  } else if (event.data && event.data.type === 'CANCEL_NOTIFICATION') {
    console.log('Service Worker: Agendamento de notificação cancelado.');
    clearTimeout(notificationTimer);
  }
});

// O resto do arquivo (install, activate, fetch, push, notificationclick) permanece igual
// para garantir o funcionamento offline e o tratamento da notificação de boas-vindas.

const urlsToCache = [
    './', 'index.html', 'manifest.json',
    'icon-180x180.png', 'icon-192x192.png', 'icon-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(cacheName => {
                if (cacheWhitelist.indexOf(cacheName) === -1) {
                    return caches.delete(cacheName);
                }
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (!event.request.url.startsWith('http')) return;
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                return networkResponse;
            });
        })
    );
});

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Foco Total';
    const options = {
        body: data.body || 'A sua sessão de foco terminou!',
        icon: 'icon-192x192.png',
        badge: 'icon-192x192.png',
        vibrate: [200, 100, 200]
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow('./'));
});
