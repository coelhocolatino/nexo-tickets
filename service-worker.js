// ==============================
// Nexo · SAD Tickets - Service Worker v5
// ==============================
const CACHE_NAME = "nexo-tickets-v31";   // ronda 24: diseño nuevo + version.json + dia.html + avisos push

const ASSETS = [
  "./",
  "./login.html",
  "./index.html",
  "./inicio-embolsado.html",
  "./manifest.json",
  "./nexo-icon-192.png",
  "./nexo-icon-512.png",
  "./nexo-logo-full.png",
  "./nexo-logo-oficial.png",
  "./nexo-tema.css",
  "./nexo-version.js",
  "./nexo-foto.js",
  "./nexo-rabbit-192.png",
  "./nexo-rabbit-512.png",
  "./nexo-wordmark.png",
  "./boton_asignar.png",
  "./boton_embolsado.png",
  "./boton_actualizar_pedidos.png",
  "./boton_config.png",
  "./boton_dia.png",
  "./dia.html",
  "./incidencias.html",
  "./boton_reservas.png",
  "./boton_informe.png"
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
    url.includes("version.json") ||          // ronda 24: la versión se lee siempre de la red
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

// Ronda 24 (2026-10-09): avisos push. Llegan aunque la app esté cerrada.
// El aviso trae { titulo, cuerpo, url, tag } (lo envía NEXO DIA a través de sad-proxy /push).
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { cuerpo: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.titulo || "Nexo", {
    body: d.cuerpo || "",
    icon: "nexo-icon-192.png",
    badge: "nexo-icon-192.png",
    tag: d.tag || "nexo",
    renotify: true,
    vibrate: [300, 120, 300, 120, 300],
    data: { url: d.url || "./dia.html" }
  }));
});

// Al tocar el aviso: abre (o enfoca) la página del pedido.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "./dia.html", self.registration.scope).href;
  event.waitUntil((async () => {
    const lista = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of lista) {
      if (c.url.indexOf(self.registration.scope) === 0 && "navigate" in c) {
        try { await c.focus(); return await c.navigate(destino); } catch (e) {}
      }
    }
    return self.clients.openWindow(destino);
  })());
});
