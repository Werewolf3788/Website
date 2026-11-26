/* Bastion Builder shell cache: the installed app opens even with a bad signal.
   The page itself is network-first, so game updates still arrive as soon as there is a connection. */
const CACHE = 'bastion-shell-v1';
const SHELL = [
  '/games/mobile/bastion',
  '/games/mobile/icons/bastion-192.png',
  '/games/mobile/icons/bastion-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = url.origin === location.origin && url.pathname === '/games/mobile/bastion';
  const isIcon = url.origin === location.origin && url.pathname.startsWith('/games/mobile/icons/');
  const isCdn = url.hostname === 'cdn.jsdelivr.net' && url.pathname.indexOf('/three@') >= 0;
  if (!isPage && !isIcon && !isCdn) return;

  if (isPage) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('/games/mobile/bastion')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
