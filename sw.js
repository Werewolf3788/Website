// ============================================================================
// Werewolf Project - service worker (site root, covers every page)
//   - Installable app + offline fallback (network first, cache when offline)
//   - Web Push notifications sent by .github/workflows/send-push.yml
// Bump CACHE_NAME when the app shell files change.
// ============================================================================
const CACHE_NAME = 'ww-shell-v1';
const SHELL = [
    './',
    'index.html',
    'manifest.json',
    'assets/ww-shell.js',
    'assets/ww-shell.css',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/badge-96.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Network first for this site's own files; everything else (Firebase, Google,
// YouTube, PSN, CDNs) goes straight to the network untouched.
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.includes('/__/')) return; // Firebase sign-in helper pages

    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.status === 200 && res.type === 'basic') {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return res;
            })
            .catch(async () => {
                const hit = await caches.match(req, { ignoreSearch: true });
                if (hit) return hit;
                if (req.mode === 'navigate') {
                    const home = await caches.match('index.html');
                    if (home) return home;
                }
                return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
            })
    );
});

// ------------------------------------------------------------ push messages
// Payload (JSON): { title, body, url, icon, image, tag }
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
    const title = data.title || 'Werewolf Project';
    const options = {
        body: data.body || '',
        icon: data.icon || 'icons/icon-192.png',
        badge: 'icons/badge-96.png',
        image: data.image || undefined,
        tag: data.tag || undefined,
        data: { url: data.url || './' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            for (const w of wins) {
                if (w.url === target && 'focus' in w) return w.focus();
            }
            return self.clients.openWindow(target);
        })
    );
});
