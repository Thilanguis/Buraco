const CACHE_NAME = 'buraco-v110';

const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      let totalFiles = ASSETS.length;
      let loadedFiles = 0;

      for (const url of ASSETS) {
        try {
          await cache.add(url);
          loadedFiles++;

          // Dispara para o index.html qual arquivo acabou de ser baixado e o progresso real
          const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
          for (const client of allClients) {
            client.postMessage({
              type: 'DOWNLOAD_PROGRESS',
              current: loadedFiles,
              total: totalFiles,
              url: url,
            });
          }
        } catch (err) {
          console.error('[SW] Falha ao cachear recurso:', url, err);
        }
      }
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

// Escuta o comando disparado pela barra de progresso do index.html para assumir o controle
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(req).catch(() => {
        return new Response('Recurso offline indisponível.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      });
    }),
  );
});
