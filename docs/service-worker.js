const CACHE_NAME = 'foco-total-core-v1.5'; // Versão incrementada para forçar a atualização

const urlsToCache = [
    './', // CORRIGIDO: Garante que a raiz do app seja cacheada corretamente
    'index.html',
    'manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
    'icon-180x180.png',
    'icon-192x192.png',
    'icon-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cacheando App Shell');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Limpando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    networkResponse => {
                        // Apenas cacheia respostas válidas e de origens esperadas
                        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                            return networkResponse;
                        }
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return networkResponse;
                    }
                );
            })
    );
});

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Foco Total';
    const options = {
        body: data.body || 'Sua sessão de foco terminou!',
        icon: 'icon-192x192.png',
        badge: 'icon-192x192.png',
        vibrate: [200, 100, 200]
    };
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('./') // Abre a página raiz do app
    );
});
