// ==============================
// Nexo · SAD Tickets - Service Worker v5
// ==============================
const CACHE_NAME = "nexo-tickets-v8";

const ASSETS = [
  "./",
  "./login.html",
  "./index.html",
  "./manifest.json",
  "./nexo-icon-192.png",
  "./nexo-icon-512.png",
  "./nexo-logo-full.png",
  "./nexo-rabbit-192.png",
  "./nexo-rabbit-512.png",
  "./nexo-wordmark.png"
];

// Instalación
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll falla si UNA sola URL falla. Hacemos add individual con catch:
      Promise.all(ASSETS.map(url =>
        cache.add(url).catch(err => console.warn("[SW] Skip:", url, err))
      ))
    )
  );
  self.skipWaiting();
});

// Activación: limpia cachés viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first con red de respaldo
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;

  // No interceptar Apps Script, proxy ni externos
  if (
    url.includes("script.google.com") ||
    url.includes("workers.dev") ||
    url.includes("googleapis.com") ||
    url.includes("google-analytics") ||
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com") ||
    url.startsWith("chrome-extension://") ||
    req.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Update background
        fetch(req).then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, response.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req)
        .then((response) => {
          if (response && response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
          }
          return response;
        })
        .catch(() => caches.match("./login.html"));
    })
  );
});

// CORS preflight
self.addEventListener("fetch", (event) => {
  if (event.request.method === "OPTIONS") {
    event.respondWith(
      new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      })
    );
  }
});
