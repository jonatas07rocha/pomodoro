const CACHE_NAME = 'foco-total-core-v1.5'; // Versão incrementada para forçar a atualização

// URLs de CDN removidas desta lista para evitar erros de CORS na instalação.
// Elas serão cacheadas dinamicamente pelo evento 'fetch'.
const urlsToCache = [
    './',
    'index.html',
    'manifest.json',
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
                // Se o recurso estiver no cache, retorna ele.
                if (response) {
                    return response;
                }
                // Se não, busca na rede.
                return fetch(event.request).then(
                    networkResponse => {
                        // Apenas cacheia respostas válidas.
                        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                            return networkResponse;
                        }
                        
                        // Clona a resposta para poder enviá-la ao navegador e ao cache.
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

// Listener para receber a notificação push do servidor.
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

// Listener para quando o usuário clica na notificação.
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('./') // Abre a página raiz do app
    );
});
