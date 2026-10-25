/* =============================================================
   Nexo · Teléfonos útiles (ronda 27, 2026-10-16)
   Pestaña en el borde izquierdo de index.html (ADM) e inicio-embolsado.html:
   se toca o se arrastra hacia la derecha y abre un panel con los teléfonos de
   la hoja TEL_UTILES_<TIENDA PRE> (planilla DATABASE). Tocar uno marca el número.
   · Solo ADM y departamento EMBOLSADO.
   · La lista se guarda en este móvil (localStorage) y se usa al instante, sin conexión.
     Se descarga sola la primera vez; después solo al pulsar «Actualizar» (en el panel o,
     el ADM, «Cargar desde la hoja» en Config).
   · Si la tienda no tiene hoja de teléfonos, no aparece la pestaña.
   API para Config: window.NexoTelefonos.{cargar(), estado()}.
   ============================================================= */
(function () {
  var u = null;
  try { u = JSON.parse(sessionStorage.getItem('sad_user') || 'null'); } catch (e) {}
  if (!u || !u.usuario) return;
  var nivel = String(u.nivel || '').toLowerCase().trim();
  var depto = String(u.departamento || '').toUpperCase().trim();
  var elegible = nivel === 'admin' || depto === 'EMBOLSADO';
  var EMBOLSADO_URL = 'https://script.google.com/macros/s/AKfycbxvyzpNQObvloq0tuoDisEn4qrGWh0tEGfGHn4NXoEqP1ShODyIWQ1bzYyWfcuz_Pqh/exec';
  var PROXY_BASE = 'https://sad-proxy.colatino-ventas-enlinea.workers.dev/';
  var CLAVE = 'nexo_tel_' + String(u.usuario).toLowerCase();
  var pagina = document.documentElement.getAttribute('data-pagina') || '';

  function leer() { try { return JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; } }
  function guardar(d) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) {} }
  function borrar() { try { localStorage.removeItem(CLAVE); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function numero(t) { return String(t || '').split('/')[0].replace(/[^\d+]/g, ''); }
  function fechaTxt(ms) {
    if (!ms) return '';
    var d = new Date(ms), h = new Date();
    var hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (d.toDateString() === h.toDateString()) return 'hoy ' + hhmm;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + hhmm;
  }

  /** Descarga la lista del servidor y la guarda. Devuelve { ok, existe, count, cargado, error }. */
  function cargar() {
    if (!elegible) return Promise.resolve({ ok: false, error: 'Sin permiso.' });
    return fetch(PROXY_BASE + '?url=' + encodeURIComponent(EMBOLSADO_URL), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'telefonosUtiles', usuario: u.usuario })
    }).then(function (r) { return r.text(); }).then(function (t) {
      var d; try { d = JSON.parse(t); } catch (e) { return { ok: false, error: 'Respuesta inesperada del servidor.' }; }
      if (!d || !d.ok) return { ok: false, error: (d && d.error) || 'No se pudo cargar.' };
      if (!d.existe) { borrar(); refrescarPestana(); return { ok: true, existe: false, count: 0, tienda: d.tienda }; }
      var n = (d.items || []).filter(function (i) { return !i.sep; }).length;
      var reg = { tienda: d.tienda, titulo: d.titulo, items: d.items, cargado: d.cargado || Date.now() };
      guardar(reg); refrescarPestana(); pintarLista();
      return { ok: true, existe: true, count: n, tienda: d.tienda, titulo: d.titulo, cargado: reg.cargado };
    }).catch(function () { return { ok: false, error: 'Sin conexión. Se sigue usando la lista guardada.' }; });
  }
  function estado() {
    var c = leer();
    var n = c && c.items ? c.items.filter(function (i) { return !i.sep; }).length : 0;
    return { guardado: !!c, count: n, tienda: c && (c.titulo || c.tienda) || '', cargado: c && c.cargado || 0, texto: c ? fechaTxt(c.cargado) : '' };
  }
  window.NexoTelefonos = { cargar: cargar, estado: estado, elegible: elegible };

  if (!elegible || (pagina !== 'index' && pagina !== 'inicio-embolsado')) return;

  var asa, vel, panel, lista, pie, tit1, tit2, ultimoFoco = null;
  var PH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>';
  var CH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var XI = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function montar() {
    if (asa) return;
    asa = document.createElement('button');
    asa.type = 'button'; asa.className = 'tl-asa'; asa.hidden = true;
    asa.setAttribute('aria-label', 'Abrir teléfonos útiles');
    asa.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>' + CH;
    vel = document.createElement('div'); vel.className = 'tl-vel';
    panel = document.createElement('aside');
    panel.className = 'tl-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'tlT1');
    panel.innerHTML = '<div class="tl-cab"><div><h2 class="tl-t1" id="tlT1">Teléfonos útiles</h2><div class="tl-t2" id="tlT2"></div></div>' +
      '<button type="button" class="tl-x" aria-label="Cerrar">' + XI + '</button></div>' +
      '<div class="tl-lista" id="tlLista"></div>' +
      '<div class="tl-pie"><span id="tlPie"></span><button type="button" id="tlAct">Actualizar</button></div>';
    document.body.appendChild(asa); document.body.appendChild(vel); document.body.appendChild(panel);
    lista = panel.querySelector('#tlLista'); pie = panel.querySelector('#tlPie'); tit2 = panel.querySelector('#tlT2');
    asa.addEventListener('click', abrir);
    vel.addEventListener('click', cerrar);
    panel.querySelector('.tl-x').addEventListener('click', cerrar);
    panel.querySelector('#tlAct').addEventListener('click', function () {
      var b = this; b.disabled = true; b.textContent = 'Actualizando…';
      cargar().then(function (r) {
        b.disabled = false; b.textContent = 'Actualizar';
        if (!r.ok) pie.textContent = r.error;
      });
    });
    document.addEventListener('keydown', function (ev) {
      if (!panel.classList.contains('on')) return;
      if (ev.key === 'Escape') { cerrar(); return; }
      if (ev.key !== 'Tab') return;
      var f = panel.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); }
      else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); }
    });
    // Gestos: arrastrar desde el borde izquierdo abre; arrastrar el panel hacia la izquierda cierra.
    var x0 = null, y0 = null, desdeBorde = false;
    document.addEventListener('touchstart', function (ev) {
      var t = ev.touches[0]; x0 = t.clientX; y0 = t.clientY;
      desdeBorde = !panel.classList.contains('on') && t.clientX <= 22;
    }, { passive: true });
    document.addEventListener('touchend', function (ev) {
      if (x0 === null) return;
      var t = ev.changedTouches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0);
      if (desdeBorde && dx > 60 && dy < 50 && !asa.hidden) abrir();
      else if (panel.classList.contains('on') && dx < -60 && dy < 50) cerrar();
      x0 = null; desdeBorde = false;
    }, { passive: true });
    pintarLista();
    refrescarPestana();
  }
  function pintarLista() {
    if (!lista) return;
    var c = leer();
    if (!c || !c.items || !c.items.length) { lista.innerHTML = '<div class="tl-vacio">Todavía no hay teléfonos guardados en este móvil.</div>'; pie.textContent = ''; tit2.textContent = ''; return; }
    tit2.textContent = String(c.titulo || c.tienda || '').toUpperCase();
    var h = '';
    c.items.forEach(function (i) {
      if (i.sep) { h += '<div class="tl-sep" role="separator"></div>'; return; }
      var num = numero(i.t);
      h += '<div class="tl-fila"><span class="tl-n">' + esc(i.n) + '</span>' +
        (num ? '<a class="tl-t" href="tel:' + esc(num) + '">' + PH + esc(i.t) + '</a>' : '<span class="tl-t">' + esc(i.t) + '</span>') + '</div>';
    });
    lista.innerHTML = h;
    pie.textContent = 'Guardado en este móvil · cargado ' + fechaTxt(c.cargado);
  }
  function refrescarPestana() { if (asa) { var c = leer(); asa.hidden = !(c && c.items && c.items.length); if (asa.hidden && panel.classList.contains('on')) cerrar(); } }
  function abrir() {
    ultimoFoco = document.activeElement;
    pintarLista();
    panel.classList.add('on'); vel.classList.add('on'); document.body.classList.add('tl-bloq');
    setTimeout(function () { var x = panel.querySelector('.tl-x'); if (x) x.focus(); }, 50);
  }
  function cerrar() {
    panel.classList.remove('on'); vel.classList.remove('on'); document.body.classList.remove('tl-bloq');
    if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) {} }
  }
  function iniciar() {
    montar();
    // Primera vez en este móvil: se descarga sola (los usuarios de Embolsado no tienen Config).
    if (!leer()) cargar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
