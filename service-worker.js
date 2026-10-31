// ==============================
// Nexo · SAD Tickets - Service Worker v5
// ==============================
const CACHE_NAME = "nexo-tickets-v65";   // ronda 81: el ADM edita incidencias cerradas; ronda 74: Jessica para todos (parte del día e informe por voz), «Informe» abre siempre el informe nuevo; ronda 73: sin Reservas para los embolsadores, Jessica en la barra de iconos; ronda 71: tiendas por usuario en Asignar, Auto-Asignar bloqueado en TRAVESIA, Reservas para nivel 2; ronda 69: «Qué novedades hay» (Flota: CCP y tarjeta de puntos; Jessica); ronda 68: botón «Jessica» abre jessica.html (centro de mando por voz, micrófono directo); ronda 67: botón «Jessica» (Embolsado por voz) en el inicio de ADM y de Embolsado; ronda 59: Finalizar en segundo plano más rápido (2 a la vez, corte de peticiones colgadas); ronda 56: el ADM finaliza pedidos en nombre del repartidor; previsión del informe bajo Incidencias; ronda 54: «Clientes previstos» en %DIA, Pedidos asignados e informe; ronda 53: filtro por tienda y tareas «Qué hacer» en Incidencias; ronda 52: Finalizar en segundo plano en Pedidos asignados (cola en el móvil) y la lista se guarda entre aperturas; ronda 47: GRANVIA deja de contar los pedidos dos veces (la foto del lote ya no se archiva como ticket); «Finalizar sin / con incidencia» en Pedidos asignados; el repartidor informa las incidencias desde el pedido y tiene su propio panel; aviso de versión nueva de la app con la versión general en el login; ronda 46: vuelve el campo «Fecha del ticket» al revisar un ticket manual en Asignar; ronda 44: informe del repartidor (informe-repartidor-nivel1.html); ronda 43: entregar es subir el ticket (KM/XR/XP en la tarjeta, sin 2ª foto); ronda 41: Config → Informes automáticos (el informe diario y el mensual se encienden, se configuran y se envían por separado, por tienda); ronda 36: anotación F1-5 / C1-ARC de GRANVIA y fecha del ticket obligatoria; ronda 34: cobro confirmado con importe + incidencia automática, símbolo de incidencias del cliente en Reparto; ronda 33: se retira el Informe de Productividad; el informe diario deja de bloquear la app (candado corto + escritura por lotes) y reintento automático; ronda 31: finalizar con/sin incidencia (%DIA); ronda 29b: botón Fotos; ronda 29: selector de tienda del ADM en Reparto, límites por tienda en Config; ronda 28: asignar.html guardado para abrir SIN internet (GRANVIA), lotes de fotos; ronda 27: avisos en la barra, teléfonos útiles, Config plegable; ronda 26: accesibilidad; ronda 25: barra de iconos + cola; ronda 24: diseño nuevo + version.json + dia + avisos push + incidencias

const ASSETS = [
  "./",
  "./login.html",
  "./index.html",
  "./auto.html",
  "./inicio-embolsado.html",
  "./manifest.json",
  "./nexo-icon-192.png",
  "./nexo-icon-512.png",
  "./nexo-logo-full.png",
  "./nexo-logo-oficial.png",
  "./nexo-tema.css",
  "./nexo-version.js",
  "./nexo-foto.js",
  "./nexo-nav.js",
  "./nexo-telefonos.js",
  "./nexo-novedades.js",
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
  "./asignar.html",        // ronda 28: GRANVIA no tiene internet: la página debe abrir sin red
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
    url.includes("/mapa/") ||                // Mapa de NexoApp: siempre datos frescos
    url.includes("cdn.jsdelivr.net/npm/mermaid") ||
    url.startsWith("chrome-extension://") ||
    req.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    // Las páginas se buscan sin el ?parámetro (asignar.html?lote=… debe abrir sin red).
    caches.match(req, req.mode === 'navigate' ? { ignoreSearch: true } : undefined).then((cached) => {
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
