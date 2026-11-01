/* ==========================================================================
   FILE: movies-sw.js  (Werewolf Cinema service worker)
   VERSION: 5.0.0  ·  2026-10-31 20:30 EDT
   - Registered by Movies.html with scope "./Movies" (doesn't touch other pages)
   - Offline: keeps the Movies page and posters on the device
   - Push: shows Firebase Cloud Messaging alerts sent by the Apps Script
   ========================================================================== */
const VERSION = 'ww-cinema-v5.0.0';
const SHELL = 'ww-shell-' + VERSION;
const POSTERS = 'ww-posters-v1';
const POSTER_LIMIT = 400;
const SHELL_FILES = ['Movies', 'movies-manifest.json', 'icons/movies-192.png', 'icons/movies-512.png', 'icons/movies-badge-96.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => Promise.allSettled(SHELL_FILES.map(u => c.add(new Request(u, { cache: 'reload' }))))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [SHELL, POSTERS, 'ww-cinema-data-v1'];
    for (const k of await caches.keys()) if (k.startsWith('ww-') && !k.startsWith('ww-shell-v') && !keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isPoster = url => /image\.tmdb\.org|artworks\.thetvdb\.com|m\.media-amazon\.com|ia\.media-imdb\.com/i.test(url.hostname);

async function trimPosters() {
  const c = await caches.open(POSTERS); const keys = await c.keys();
  for (let i = 0; i < keys.length - POSTER_LIMIT; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Movies page: network first, saved copy when offline
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(SHELL); c.put('Movies', res.clone()); }
        return res;
      } catch (e) {
        return (await caches.match('Movies')) || (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }

  // Posters: from the device first, so scrolling the library costs no data twice
  if (isPoster(url)) {
    event.respondWith((async () => {
      const c = await caches.open(POSTERS);
      const hit = await c.match(req);
      if (hit) return hit;
      // Ask for a CORS copy so it can be stored without the huge "opaque" storage cost;
      // fall back to a normal image request if that host doesn't allow it.
      let res = null;
      try { res = await fetch(req.url, { mode: 'cors', credentials: 'omit' }); } catch (e) { res = null; }
      if (res && res.ok) { c.put(req, res.clone()); trimPosters(); return res; }
      try { return await fetch(req); } catch (e) { return Response.error(); }
    })());
    return;
  }

  // Same-origin app files (icons, manifest): cache, then refresh in background
  if (url.origin === self.location.origin && /\/(icons\/|movies-manifest\.json)/.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      const net = fetch(req).then(res => { if (res.ok) caches.open(SHELL).then(c => c.put(req, res.clone())); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
  // Everything else (the Google Sheet CSV, Firebase menu, analytics) goes straight to the network.
});

/* ---------- Push alerts (FCM data messages from the Apps Script) ---------- */
self.addEventListener('push', event => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch (e) { p = { data: { body: event.data && event.data.text() } }; }
  const d = Object.assign({}, p.notification || {}, p.data || {}, p.title ? p : {});
  const title = d.title || '🎬 New in Werewolf Cinema';
  const opts = {
    body: d.body || 'A new title was added to the library.',
    icon: d.icon || 'icons/movies-192.png',
    badge: 'icons/movies-badge-96.png',
    tag: d.tag || 'ww-new-title',
    renotify: true,
    data: { url: d.url || d.link || './Movies' }
  };
  if (d.image) opts.image = d.image;
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './Movies', self.location.href).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).pathname.replace(/\.html$/, '') === new URL(target).pathname.replace(/\.html$/, '') && 'navigate' in w) {
        await w.focus();
        return w.navigate(target);
      }
    }
    return self.clients.openWindow(target);
  })());
});
