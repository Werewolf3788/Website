/**
 * Ghost Recon Wildlands Progression Hub - Service Worker
 * Verification: NYT-20260530-0459
 * * NO STRIPPING, NO COMPRESSING, DON'T CHANGE WHAT I DIDN'T SAY TO CHANGE
 * (Updated cache buster arrays to force client asset synchronization checks)
 */

const CACHE_NAME = 'ghost-hub-v2.4';
const ASSETS_TO_CACHE = [
  './index.html',
  './style.css?v=2.4',
  './app.js?v=2.4',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Force immediate caching of all master layout assets
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force active service worker activation loops instantly
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing deprecated ghost hub assets cache...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Skip intercepting live cross-origin calls targeting Firebase or your Google Sheet publishing logs
  if (event.request.url.includes('firebase') || event.request.url.includes('google') || event.request.url.includes('githack')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Fall back directly to the network fetch stream if cache arrays run dry
      return cachedResponse || fetch(event.request);
    })
  );
});
