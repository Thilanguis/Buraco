const CACHE_NAME = 'buraco-v56';

// Removido o "/icons/" do caminho das imagens
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

// Instala: faz pré-cache dos assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
  self.skipWaiting();
});

// Ativa: limpa caches antigos se trocar de versão
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

// Estratégia simples: cache-first para assets estáticos
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só tenta cache para GET
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => cached);
    }),
  );
});
