/* =============================================================
   Nexo · comprobación de versión (ronda 24, 2026-10-09)
   Cada página declara en <html> su nombre y su versión:
     <html lang="es" data-pagina="inicio-embolsado" data-version="v3.10.1">
   Al entrar, se lee version.json (siempre de la red, nunca de la caché).
   Si allí pone otra versión para esta página, se borra la caché de la app
   y la página se recarga sola con la versión nueva. Solo se intenta una vez
   por sesión, para que nunca se quede recargando en bucle.
   Formato de versión: v3.MES.ACTUALIZACIÓN (ej. v3.10.19).
   ============================================================= */
(function () {
  var html = document.documentElement;
  var pagina = html.getAttribute('data-pagina');
  var actual = html.getAttribute('data-version');
  if (!pagina || !actual || !window.fetch) return;

  // Muestra la versión en cualquier elemento con data-nexo-version.
  function pintarVersion() {
    var els = document.querySelectorAll('[data-nexo-version]');
    for (var i = 0; i < els.length; i++) els[i].textContent = els[i].getAttribute('data-nexo-version') + ' ' + actual;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintarVersion); else pintarVersion();

  var clave = 'nexo_actualizando_' + pagina;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (v) {
      var nueva = v && v[pagina];
      if (!nueva || nueva === actual) { try { sessionStorage.removeItem(clave); } catch (e) {} return; }
      try { if (sessionStorage.getItem(clave) === nueva) return; sessionStorage.setItem(clave, nueva); } catch (e) { return; }
      var tareas = [];
      if (window.caches && caches.keys) {
        tareas.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
      }
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        tareas.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.update().catch(function () {}); }));
        }));
      }
      Promise.all(tareas).catch(function () {}).then(function () {
        var u = new URL(window.location.href);
        u.searchParams.set('v', nueva);
        window.location.replace(u.toString());
      });
    })
    .catch(function () { /* sin conexión: se sigue con la versión que hay */ });
})();
