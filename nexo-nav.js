/* =============================================================
   Nexo · barra de accesos directos (ronda 25, 2026-10-16)
   Iconos de las demás páginas, debajo de la cabecera. Solo salen las que
   ese usuario tiene permitidas; si no caben, se deslizan hacia los lados.
   Reglas (las mismas que los botones del inicio):
     · Inicio, %DIA, Incidencias e Informe: todos.
     · Asignar: ADM o tienda TRAVESIA/GRANVIA. Reservas: ADM o TRAVESIA.
     · Embolsado: ADM o departamento EMBOLSADO.
     · Config: solo ADM.
   Se coloca solo tras <header class="nx-cab">. Estilos en nexo-tema.css (.nx-nav).
   Ronda 27: aquí viven también los AVISOS (globo amarillo de %DIA y rojo de Incidencias, con
   vibración y notificación cuando suben los pedidos %DIA) y, solo en el inicio del ADM, el
   botón «Actualizar» (reconstruir el control de tickets). Sustituyen al menú antiguo del index.
   ============================================================= */
(function () {
  var u = null;
  try { u = JSON.parse(sessionStorage.getItem('sad_user') || 'null'); } catch (e) {}
  if (!u || !u.usuario) return;
  var nivel = String(u.nivel || '').toLowerCase().trim();
  var depto = String(u.departamento || '').toUpperCase().trim();
  var tienda = String(u.tiendaPre || '');
  var admin = nivel === 'admin';
  var emb = depto === 'EMBOLSADO';
  var trav = /trav[eé]s[ií]a/i.test(tienda);
  var gran = /granv[ií]a/i.test(tienda);
  var usr = encodeURIComponent(u.usuario);
  var EMBOLSADO_URL = 'https://script.google.com/macros/s/AKfycbxvyzpNQObvloq0tuoDisEn4qrGWh0tEGfGHn4NXoEqP1ShODyIWQ1bzYyWfcuz_Pqh/exec';

  function ic(d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var ITEMS = [
    { k: 'index', t: 'Inicio', href: (emb && !admin) ? 'inicio-embolsado.html' : 'index.html', ic: '<path d="M4 11l8-7 8 7v9H4z"/>', ok: true, alt: ['inicio-embolsado'] },
    { k: 'dia', t: '%DIA', href: 'dia.html', ic: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>', ok: true },
    { k: 'incidencias', t: 'Incidencias', href: 'incidencias.html', ic: '<path d="M12 4l9 16H3zM12 10v4M12 17v.5"/>', ok: true },
    { k: 'asignar', t: 'Asignar', href: 'asignar.html', ic: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>', ok: admin || trav || gran },
    { k: 'reservas', t: 'Reservas', href: 'reservas.html?u=' + usr, ic: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', ok: admin || trav },
    { k: 'embolsado', t: 'Embolsado', href: EMBOLSADO_URL + '?u=' + usr, ic: '<path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2"/>', ok: admin || emb },
    { k: 'informe', t: 'Informe', href: 'informe.html', ic: '<path d="M5 20V10M12 20V4M19 20v-7"/>', ok: true },
    { k: 'actualizar', t: 'Actualizar', accion: true, ic: '<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5"/>', ok: admin && (document.documentElement.getAttribute('data-pagina') === 'index') },
    { k: 'config', t: 'Config', href: 'config.html?u=' + usr, ic: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>', ok: admin }
  ];

  function montar() {
    if (document.querySelector('.nx-nav-wrap')) return;
    var cab = document.querySelector('header.nx-cab');
    if (!cab) return;
    var actual = (document.documentElement.getAttribute('data-pagina') || (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index');
    var lista = ITEMS.filter(function (i) { return i.ok; });
    var wrap = document.createElement('div');
    wrap.className = 'nx-nav-wrap';
    var html = '<nav class="nx-nav" aria-label="Accesos directos">';
    lista.forEach(function (i) {
      var on = i.k === actual || (i.alt || []).indexOf(actual) !== -1;
      var globo = i.k === 'dia' ? '<span class="nx-num dia" id="nxNumDia" role="status"></span>' : (i.k === 'incidencias' ? '<span class="nx-num" id="nxNumInc" role="status"></span>' : '');
      if (i.accion) html += '<a role="button" tabindex="0" data-accion="' + i.k + '">' + ic(i.ic) + '<span>' + i.t + '</span></a>';
      else html += '<a id="nxNav_' + i.k + '" href="' + i.href + '"' + (on ? ' class="on" aria-current="page"' : '') + (i.k === 'embolsado' ? ' target="_top"' : '') + '>' + ic(i.ic) + '<span>' + i.t + '</span>' + globo + '</a>';
    });
    wrap.innerHTML = html + '</nav>';
    cab.parentNode.insertBefore(wrap, cab.nextSibling);
    var nav = wrap.firstChild, on = nav.querySelector('.on');
    function borde() { wrap.classList.toggle('sin-mas', nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4); wrap.classList.toggle('sin-scroll', nav.scrollWidth <= nav.clientWidth + 1); }
    nav.addEventListener('scroll', borde, { passive: true });
    window.addEventListener('resize', borde);
    if (on) nav.scrollLeft = Math.max(0, on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2);
    borde();
    // Botón de acción (Actualizar pedidos): lo implementa la página que lo define.
    var act = wrap.querySelector('[data-accion="actualizar"]');
    if (act) {
      var lanzar = function () { if (typeof window.nexoActualizarPedidos === 'function') window.nexoActualizarPedidos(); };
      act.addEventListener('click', lanzar);
      act.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); lanzar(); } });
    }
    avisos();
  }

  /* ---------- Avisos (globos) ---------- */
  var DIA_URL = 'https://script.google.com/macros/s/AKfycbwrX90CKa7GQki-DUDZFpdGVlGIXZvmiHsRKCEW7ZwBbYkKfYPr3R1kx96Uz9GKL_0m/exec';
  var PROXY_BASE = 'https://sad-proxy.colatino-ventas-enlinea.workers.dev/';
  function postProxy(url, body) {
    return fetch(PROXY_BASE + '?url=' + encodeURIComponent(url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.text().then(function (t) { try { return JSON.parse(t); } catch (e) { return { ok: false }; } }); });
  }
  function pintar(id, n) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = n > 99 ? '99+' : String(n);
    el.style.display = n > 0 ? 'flex' : 'none';
    var a = el.parentNode;
    if (a && a.setAttribute) a.setAttribute('aria-label', a.getAttribute('data-t') ? a.getAttribute('data-t') + (n > 0 ? ': ' + n + ' aviso' + (n > 1 ? 's' : '') : '') : '');
  }
  function avisos() {
    // %DIA: contador amarillo. Repartidores: sus pedidos %DIA asignados y sin entregar.
    // Gestores (asignar_DIA / ADM / Embolsado / Reservas): pedidos %DIA sin asignar.
    // Se pinta al instante con el último número guardado en este móvil (dia.html lo actualiza)
    // y después se confirma con el servidor.
    var clave = 'nexo_dia_cnt_' + String(u.usuario).toLowerCase();
    function leerGuardado() { try { var v = parseInt(localStorage.getItem(clave) || '-1', 10); return isNaN(v) ? -1 : v; } catch (e) { return -1; } }
    var btnDia = document.getElementById('nxNav_dia');
    if (btnDia) btnDia.setAttribute('data-t', '%DIA');
    var btnInc = document.getElementById('nxNav_incidencias');
    if (btnInc) btnInc.setAttribute('data-t', 'Incidencias');
    pintar('nxNumDia', Math.max(0, leerGuardado()));
    var enCurso = false, fallos = 0, reintento = null;
    async function refrescarDia() {
      if (enCurso) return;
      enCurso = true;
      var bien = false;
      try {
        var r = await postProxy(DIA_URL, { accion: 'diaResumen', usuario: u.usuario });
        if (r && r.ok) {
          bien = true;
          var gestor = r.rol && r.rol.ver;
          var n = gestor ? (r.nuevos || 0) : (r.misPendientes || 0);
          pintar('nxNumDia', n);
          var antes = leerGuardado();
          if (antes >= 0 && n > antes) {
            if (btnDia) { btnDia.classList.remove('nuevo'); void btnDia.offsetWidth; btnDia.classList.add('nuevo'); }
            try { if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]); } catch (e) {}
            var t = gestor ? (n - antes) + ' pedido(s) %DIA nuevo(s)' : 'Tienes ' + (n - antes) + ' pedido(s) %DIA asignado(s)';
            try { document.dispatchEvent(new CustomEvent('nexo:dia-nuevo', { detail: { texto: t } })); } catch (e) {}
            try {
              if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
                navigator.serviceWorker.getRegistration().then(function (reg) {
                  if (reg) reg.showNotification('Nexo · %DIA', { body: t, icon: 'nexo-icon-192.png', vibrate: [300, 120, 300], tag: 'nexo-dia' });
                });
              }
            } catch (e) {}
          }
          try { localStorage.setItem(clave, String(n)); } catch (e) {}
        }
      } catch (e) { /* sin conexión: se deja el último valor */ }
      enCurso = false;
      clearTimeout(reintento);
      if (bien) fallos = 0;
      else if (fallos < 3) { fallos++; reintento = setTimeout(refrescarDia, 4000 * fallos); }
    }
    // Incidencias: globo rojo con las ABIERTAS que ese usuario puede ver (ADM y Embolsado todas; repartidor, las suyas).
    async function refrescarInc() {
      try {
        var r = await postProxy(EMBOLSADO_URL, { accion: 'contarIncidenciasAbiertas', usuario: u.usuario });
        pintar('nxNumInc', (r && r.ok) ? (r.total || 0) : 0);
      } catch (e) { /* sin conexión: se deja el último valor */ }
    }
    refrescarDia(); refrescarInc();
    setInterval(refrescarDia, 60000); setInterval(refrescarInc, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { refrescarDia(); refrescarInc(); } });
    window.addEventListener('online', function () { fallos = 0; refrescarDia(); refrescarInc(); });
    window.addEventListener('pageshow', function (ev) { if (ev.persisted) { pintar('nxNumDia', Math.max(0, leerGuardado())); fallos = 0; refrescarDia(); refrescarInc(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
