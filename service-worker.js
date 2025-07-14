// service-worker.js

// --- CONFIGURAÇÃO DO CACHE ---
// Um nome único para o cache. Mude este nome sempre que atualizar os arquivos
// para forçar o service worker a instalar a nova versão e limpar o cache antigo.
const CACHE_NAME = 'foco-total-core-v1.6';

// Lista de arquivos essenciais para o funcionamento offline do aplicativo.
const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
  'icon-180x180.png',
  'icon-192x192.png',
  'icon-512x512.png'
  // Adicione aqui outros ícones ou assets que você queira cachear, como 'icon-badge-72x72.png'.
];

// --- EVENTOS DO CICLO DE VIDA DO SERVICE WORKER ---

/**
 * Evento 'install': Acionado quando o service worker é registrado pela primeira vez.
 * Usado para salvar os arquivos principais (App Shell) em cache.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cacheando App Shell');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Força o novo service worker a se tornar ativo imediatamente.
});

/**
 * Evento 'activate': Acionado quando o service worker se torna ativo.
 * Usado para limpar caches antigos que não são mais necessários.
 */
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
    }).then(() => self.clients.claim()) // Garante que o service worker controle a página imediatamente.
  );
});

/**
 * Evento 'fetch': Acionado para cada requisição de rede feita pela página.
 * Intercepta a requisição e tenta servi-la primeiro do cache (estratégia Cache-First).
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se a resposta for encontrada no cache, retorna-a.
        if (response) {
          return response;
        }
        // Se não, faz a requisição à rede.
        return fetch(event.request).then(
          networkResponse => {
            // Verifica se a resposta da rede é válida antes de cachear.
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


// --- EVENTOS DE NOTIFICAÇÃO PUSH ---

/**
 * Evento 'push': Acionado quando uma notificação é recebida do servidor.
 * Responsável por exibir a notificação para o usuário.
 */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Foco Total Core';
  const options = {
    body: data.body || 'Sua sessão terminou!',
    icon: 'icon-192x192.png',
    badge: 'icon-192x192.png', // Ícone para a barra de status (Android)
    vibrate: [200, 100, 200], // Padrão de vibração
    data: {
      url: self.location.origin, // URL para abrir ao clicar
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/**
 * Evento 'notificationclick': Acionado quando o usuário clica na notificação.
 * Responsável por focar em uma aba existente ou abrir uma nova.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se uma janela do app já estiver aberta, foca nela.
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Se não, abre uma nova janela.
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
