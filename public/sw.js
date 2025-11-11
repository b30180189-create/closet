// sw.js
const CACHE_NAME = "virtual-closet-v1";

// Add any other static assets you host separately
const ASSETS = [
  "./",
  "./index.html",          // or your actual file name
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache POST/PUT/etc
  if (request.method !== "GET") {
    return;
  }

  // Always go to network for AI/backend calls
  if (
    url.pathname.includes("/api/scan-outfit") ||
    url.hostname.includes("ngrok-free.dev") ||
    url.hostname.includes("api.perplexity.ai")
  ) {
    return; // let the browser handle normally (network)
  }

  // Cache-first for everything else (app shell, icons, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Only cache basic OK same-origin GETs
          const isValid =
            response &&
            response.status === 200 &&
            response.type === "basic";

          if (isValid) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }

          return response;
        })
        .catch(() => {
          // Optional: return a fallback offline page or nothing
          return cached || Response.error();
        });
    })
  );
});
