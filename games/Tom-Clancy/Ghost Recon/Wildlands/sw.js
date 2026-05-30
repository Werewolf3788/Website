const CACHE_NAME = 'ghost-hub-v1.1';
const ASSETS_TO_CACHE = [
  './index.html',
  './style.css?v=1.1',
  './app.js?v=1.1',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
