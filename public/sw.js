// ==============================================================================
// Service Worker: Offline Caching & App Shell
// Network first with cache fallback. Same-origin pages only.
// ==============================================================================

const CACHE_NAME = "trophy-tracker-v2";

// Relative paths resolve next to this file, so this works on
// werewolf3788.github.io/Website/ and on playstation-be936.web.app alike.
const ASSETS_TO_CACHE = [
  "./",
  "index.html",
  "settings.html",
  "privacy.html",
  "manifest.json"
];

// Install: pre-cache the shell. One missing file must not break the install.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(new Request(url, { cache: "reload" })))
      )
    )
  );
  self.skipWaiting();
});

// Activate: remove old caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, cache fallback.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Let Firebase, Google sign-in, DecAPI, Steam and every other site go straight to the network.
  if (url.origin !== self.location.origin) return;
  // Never touch Firebase's sign-in handler pages.
  if (url.pathname.includes("/__/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === "navigate") {
          const shell = await caches.match("index.html");
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
