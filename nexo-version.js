/* =============================================================
   Nexo · comprobación de versión
   ─────────────────────────────────────────────────────────────
   Cada página declara en <html> su nombre y su versión:
     <html lang="es" data-pagina="inicio-embolsado" data-version="v3.10.1">
   Al entrar, se lee version.json (siempre de la red, nunca de la caché).

   DOS COMPROBACIONES:

   1) VERSIÓN GENERAL DE LA APP  (ronda 47, punto 8)
      version.json trae "app": la versión general de Nexo. Cuando cambia, se
      avisa en pantalla: «Hay una versión nueva de Nexo». Al pulsar
      «Actualizar ahora» se borra TODA la caché del móvil y se recarga, así que
      quedan al día TODAS las páginas y módulos de golpe, no solo la que se
      tiene abierta. Es lo que hace falta cuando el cambio toca varias páginas:
      antes cada una se actualizaba sola, pero solo al entrar en ella, y el
      repartidor podía pasar días con media app vieja.
      Si se pulsa «Más tarde» no se insiste hasta la próxima vez que abra la app.

   2) VERSIÓN DE ESTA PÁGINA  (como hasta ahora)
      Si en version.json pone otra versión para esta página, se borra la caché
      y la página se recarga sola, sin preguntar. Solo se intenta una vez por
      sesión, para que nunca se quede recargando en bucle.

   Formato de versión: v3.MES.ACTUALIZACIÓN (ej. v3.10.19).
   ============================================================= */
(function () {
  var html = document.documentElement;
  var pagina = html.getAttribute('data-pagina');
  var actual = html.getAttribute('data-version');
  if (!window.fetch) return;

  var CLAVE_APP   = 'nexo_app_version';      // localStorage: la última versión general aceptada
  var CLAVE_LUEGO = 'nexo_app_mas_tarde';    // sessionStorage: «más tarde» en esta sesión

  function guardado(almacen, k) { try { return almacen.getItem(k); } catch (e) { return null; } }
  function guardar(almacen, k, v) { try { almacen.setItem(k, v); } catch (e) {} }

  // Muestra la versión en cualquier elemento con data-nexo-version.
  function pintarVersion() {
    if (!actual) return;
    var els = document.querySelectorAll('[data-nexo-version]');
    for (var i = 0; i < els.length; i++) els[i].textContent = els[i].getAttribute('data-nexo-version') + ' ' + actual;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintarVersion); else pintarVersion();

  /* Borra la caché de la app y actualiza el service worker. */
  function limpiarTodo() {
    var tareas = [];
    if (window.caches && caches.keys) {
      tareas.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
    }
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      tareas.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
        return Promise.all(rs.map(function (r) { return r.update().catch(function () {}); }));
      }));
    }
    return Promise.all(tareas).catch(function () {});
  }

  function recargar(v) {
    var u = new URL(window.location.href);
    u.searchParams.set('v', v);
    window.location.replace(u.toString());
  }

  /* ---------- 1) aviso de versión general ---------- */
  function avisarApp(nueva) {
    if (guardado(sessionStorage, CLAVE_LUEGO) === nueva) return;   // ya dijo «más tarde»
    function pintar() {
      if (document.getElementById('nexoAvisoVersion')) return;
      var d = document.createElement('div');
      d.id = 'nexoAvisoVersion';
      d.setAttribute('role', 'status');
      d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;' +
        'background:#10243D;color:#fff;border-radius:16px;padding:14px 16px;' +
        'box-shadow:0 10px 30px rgba(0,0,0,.35);display:flex;flex-wrap:wrap;gap:10px;align-items:center;' +
        'font:700 15px/1.3 system-ui,-apple-system,"Hanken Grotesk",sans-serif';
      d.innerHTML =
        '<span style="flex:1 1 180px">Hay una versión nueva de Nexo (' + nueva + ').<br>' +
        '<span style="font-weight:600;font-size:13px;opacity:.85">Al actualizar se ponen al día todas las páginas y módulos de este móvil.</span></span>' +
        '<button type="button" id="nexoVerLuego" style="min-height:44px;padding:0 14px;border:0;border-radius:12px;' +
        'background:rgba(255,255,255,.14);color:#fff;font:700 14px system-ui,sans-serif">Más tarde</button>' +
        '<button type="button" id="nexoVerYa" style="min-height:44px;padding:0 16px;border:0;border-radius:12px;' +
        'background:#2BD37A;color:#06301B;font:800 14px system-ui,sans-serif">Actualizar ahora</button>';
      document.body.appendChild(d);
      document.getElementById('nexoVerLuego').onclick = function () {
        guardar(sessionStorage, CLAVE_LUEGO, nueva);
        d.remove();
      };
      document.getElementById('nexoVerYa').onclick = function () {
        d.innerHTML = '<span style="flex:1">Actualizando Nexo…</span>';
        guardar(localStorage, CLAVE_APP, nueva);
        limpiarTodo().then(function () { recargar(nueva); });
      };
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar); else pintar();
  }

  /* ---------- 2) versión de esta página ---------- */
  function comprobarPagina(v) {
    if (!pagina || !actual) return;
    var nueva = v && v[pagina];
    var clave = 'nexo_actualizando_' + pagina;
    if (!nueva || nueva === actual) { try { sessionStorage.removeItem(clave); } catch (e) {} return; }
    try {
      if (sessionStorage.getItem(clave) === nueva) return;
      sessionStorage.setItem(clave, nueva);
    } catch (e) { return; }
    limpiarTodo().then(function () { recargar(nueva); });
  }

  fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (v) {
      if (!v) return;
      // La versión general de la app, si la hay.
      var app = v.app ? String(v.app) : '';
      if (app) {
        var vista = guardado(localStorage, CLAVE_APP);
        if (!vista) {
          // Primera vez en este móvil: se apunta y no se molesta al usuario.
          guardar(localStorage, CLAVE_APP, app);
        } else if (vista !== app) {
          avisarApp(app);
          return;   // el aviso manda: no se recarga nada por la espalda
        }
      }
      comprobarPagina(v);
    })
    .catch(function () { /* sin conexión: se sigue con la versión que hay */ });
})();
