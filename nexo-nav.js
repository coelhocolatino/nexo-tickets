/* =============================================================
   Nexo · barra de accesos directos (ronda 25, 2026-10-16)
   Iconos de las demás páginas, debajo de la cabecera. Solo salen las que
   ese usuario tiene permitidas; si no caben, se deslizan hacia los lados.
   Reglas (las mismas que los botones del inicio):
     · Inicio, %DIA, Incidencias e Informe: todos.
     · Asignar y Reservas: ADM o tienda TRAVESIA.
     · Embolsado: ADM o departamento EMBOLSADO.
     · Config: solo ADM.
   Se coloca solo tras <header class="nx-cab">. Estilos en nexo-tema.css (.nx-nav).
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
  var usr = encodeURIComponent(u.usuario);
  var EMBOLSADO_URL = 'https://script.google.com/macros/s/AKfycbxvyzpNQObvloq0tuoDisEn4qrGWh0tEGfGHn4NXoEqP1ShODyIWQ1bzYyWfcuz_Pqh/exec';

  function ic(d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var ITEMS = [
    { k: 'index', t: 'Inicio', href: (emb && !admin) ? 'inicio-embolsado.html' : 'index.html', ic: '<path d="M4 11l8-7 8 7v9H4z"/>', ok: true, alt: ['inicio-embolsado'] },
    { k: 'dia', t: '%DIA', href: 'dia.html', ic: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>', ok: true },
    { k: 'incidencias', t: 'Incidencias', href: 'incidencias.html', ic: '<path d="M12 4l9 16H3zM12 10v4M12 17v.5"/>', ok: true },
    { k: 'asignar', t: 'Asignar', href: 'asignar.html', ic: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>', ok: admin || trav },
    { k: 'reservas', t: 'Reservas', href: 'reservas.html?u=' + usr, ic: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', ok: admin || trav },
    { k: 'embolsado', t: 'Embolsado', href: EMBOLSADO_URL + '?u=' + usr, ic: '<path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2"/>', ok: admin || emb },
    { k: 'informe', t: 'Informe', href: 'informe.html', ic: '<path d="M5 20V10M12 20V4M19 20v-7"/>', ok: true },
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
      html += '<a href="' + i.href + '"' + (on ? ' class="on" aria-current="page"' : '') + (i.k === 'embolsado' ? ' target="_top"' : '') + '>' + ic(i.ic) + '<span>' + i.t + '</span></a>';
    });
    wrap.innerHTML = html + '</nav>';
    cab.parentNode.insertBefore(wrap, cab.nextSibling);
    var nav = wrap.firstChild, on = nav.querySelector('.on');
    function borde() { wrap.classList.toggle('sin-mas', nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4); wrap.classList.toggle('sin-scroll', nav.scrollWidth <= nav.clientWidth + 1); }
    nav.addEventListener('scroll', borde, { passive: true });
    window.addEventListener('resize', borde);
    if (on) nav.scrollLeft = Math.max(0, on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2);
    borde();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
