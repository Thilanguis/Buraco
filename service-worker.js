const CACHE_NAME = 'buraco-v118';

const ASSETS = [
  './',
  './index.html',
  './app.js',
  './bot.js',
  './js/audio.js',
  './js/firebase.js',
  './js/themes.js',
  './styles/base-menu.css',
  './styles/game.css',
  './styles/table-themes.css',
  './styles/domination.css',
  './styles/cards.css',
  './styles/hud.css',
  './styles/responsive.css',
  './styles/effects.css',
  './manifest.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const totalFiles = ASSETS.length;
      let loadedFiles = 0;

      for (const url of ASSETS) {
        try {
          await cache.add(url);
          loadedFiles++;

          const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
          for (const client of allClients) {
            client.postMessage({
              type: 'DOWNLOAD_PROGRESS',
              current: loadedFiles,
              total: totalFiles,
              url,
            });
          }
        } catch (error) {
          console.error('[SW] Falha ao cachear recurso:', url, error);
        }
      }
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

function unavailableResponse() {
  return new Response('Recurso offline indisponível.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Audio e video usam requisicoes Range (respostas 206). O Cache API nao
  // aceita armazenar essas respostas parciais e a rejeicao acabava virando 503.
  // Deixa o navegador cuidar do streaming e do buffer nativo desses arquivos.
  if (request.headers.has('range') || request.destination === 'audio' || request.destination === 'video') return;

  const isNavigation = request.mode === 'navigate';
  const isAppCode = /\.(?:css|html|js|json|webmanifest)$/i.test(url.pathname);

  if (isNavigation || isAppCode) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cacheKey = isNavigation ? './index.html' : request;
            const cache = await caches.open(CACHE_NAME);
            await cache.put(cacheKey, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = isNavigation ? await caches.match('./index.html') : await caches.match(request);
          return cached || unavailableResponse();
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => unavailableResponse());
    }),
  );
});
