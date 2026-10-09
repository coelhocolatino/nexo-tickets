/* =============================================================
   Nexo · selector de foto deslizante (ronda 24, 2026-10-09)
   Un solo control, pequeño y solo con dibujos:
     · deslizar el botón a la IZQUIERDA → SUBIR una foto (galería)
     · deslizar el botón a la DERECHA   → SACAR una foto (cámara)
   También vale tocar directamente el dibujo de la galería o de la cámara.

   Uso 1 — un selector suelto (con sus propios inputs):
     NexoFoto.crear(contenedor, {
       alElegir: function (archivo, origen) { ... },  // origen: 'subir' | 'sacar'
       // o bien alAbrir: function (origen) { ... }  → la página abre su propio input
     });
   Uso 2 — muchos selectores en una lista que se repinta (tarjetas):
     '<div>' + NexoFoto.html({ id: 'R123', set: true, clase: 'mini' }) + '</div>'
     NexoFoto.activar(document, function (origen, id) { ... });   // una sola vez
   v3 (2026-10-09): html() + activar() por delegación; clase "set" (ya hay
   foto, botón verde) y "mini" (más estrecho, para las tarjetas).
   ============================================================= */
(function () {
  var CSS = '' +
    '.nxf{position:relative;width:184px;max-width:100%;height:56px;border-radius:16px;background:#DCE7FB;color:#17409E;flex:0 0 auto;' +
    'display:grid;grid-template-columns:1fr 1fr;align-items:center;user-select:none;-webkit-user-select:none;touch-action:pan-y;overflow:hidden;box-sizing:border-box}' +
    '.nxf button.lado{height:100%;border:0;background:transparent;color:inherit;display:flex;align-items:center;cursor:pointer;padding:0 14px;margin:0;min-width:0}' +
    '.nxf button.izq{justify-content:flex-start}.nxf button.der{justify-content:flex-end}' +
    '.nxf .pomo{position:absolute;top:6px;bottom:6px;left:50%;width:64px;margin-left:-32px;border-radius:12px;background:#0B2447;' +
    'color:#F3F7FC;display:flex;align-items:center;justify-content:center;gap:2px;cursor:grab;touch-action:none;' +
    'box-shadow:0 2px 8px rgba(11,36,71,.25);transition:transform .2s}' +
    '.nxf.arrastrando .pomo{transition:none;cursor:grabbing}' +
    '.nxf .pomo svg.f{opacity:.55}' +
    '.nxf.ir-izq,.nxf.ir-der{background:#C9D9F7}' +
    '.nxf.set{background:#DCFCE7;color:#15803D}.nxf.set .pomo{background:#15803D}' +
    '.nxf.mini{width:128px;height:52px;border-radius:12px}.nxf.mini button.lado{padding:0 9px}' +
    '.nxf.mini .pomo{width:50px;margin-left:-25px;top:5px;bottom:5px;border-radius:10px}.nxf.mini .pomo svg.f{display:none}';
  function ic(d, w) { return '<svg width="' + (w || 20) + '" height="' + (w || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var I_GAL = ic('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l4.5-4.5 3.5 3.5 3-3 5 5"/><circle cx="9" cy="9.5" r="1.4"/>');
  var I_CAM = ic('<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.2"/>');
  var I_OK = ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
  var I_IZQ = '<svg class="f" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var I_DER = '<svg class="f" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  function ponerCss() {
    if (document.getElementById('nxf-css')) return;
    var st = document.createElement('style'); st.id = 'nxf-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
  }
  function escA(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function html(o) {
    o = o || {}; ponerCss();
    return '<div class="nxf' + (o.set ? ' set' : '') + (o.clase ? ' ' + o.clase : '') + '" role="group" aria-label="Foto del ticket"' + (o.id != null ? ' data-id="' + escA(o.id) + '"' : '') + '>' +
      '<button type="button" class="lado izq" aria-label="Subir foto de la galería" title="Subir foto">' + I_GAL + '</button>' +
      '<button type="button" class="lado der" aria-label="Sacar foto con la cámara" title="Sacar foto">' + I_CAM + '</button>' +
      '<div class="pomo" aria-hidden="true">' + I_IZQ + (o.set ? I_OK : I_CAM) + I_DER + '</div></div>';
  }

  /* Delegación: un solo juego de eventos para todos los .nxf dentro de raiz. */
  function activar(raiz, alAbrir) {
    ponerCss();
    var arr = null; // { nxf, pomo, x0, dx, max }
    raiz.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.nxf button.lado'); if (!b) return;
      var nxf = b.closest('.nxf'); alAbrir(b.classList.contains('izq') ? 'subir' : 'sacar', nxf.getAttribute('data-id'), nxf);
    });
    raiz.addEventListener('pointerdown', function (e) {
      var pomo = e.target.closest && e.target.closest('.nxf .pomo'); if (!pomo) return;
      var nxf = pomo.closest('.nxf');
      arr = { nxf: nxf, pomo: pomo, x0: e.clientX, dx: 0, max: (nxf.clientWidth - pomo.offsetWidth) / 2 - 6 };
      nxf.classList.add('arrastrando');
      try { pomo.setPointerCapture(e.pointerId); } catch (er) {}
    });
    raiz.addEventListener('pointermove', function (e) {
      if (!arr) return;
      arr.dx = Math.max(-arr.max, Math.min(arr.max, e.clientX - arr.x0));
      arr.pomo.style.transform = 'translateX(' + arr.dx + 'px)';
      arr.nxf.classList.toggle('ir-izq', arr.dx < -arr.max * 0.6); arr.nxf.classList.toggle('ir-der', arr.dx > arr.max * 0.6);
    });
    function soltar() {
      if (!arr) return;
      var a = arr; arr = null;
      a.nxf.classList.remove('arrastrando', 'ir-izq', 'ir-der'); a.pomo.style.transform = '';
      if (a.dx < -a.max * 0.6) alAbrir('subir', a.nxf.getAttribute('data-id'), a.nxf);
      else if (a.dx > a.max * 0.6) alAbrir('sacar', a.nxf.getAttribute('data-id'), a.nxf);
    }
    raiz.addEventListener('pointerup', soltar);
    raiz.addEventListener('pointercancel', soltar);
  }

  /* Abre un input de archivo (galería o cámara) y devuelve el archivo elegido. */
  function elegirArchivo(origen, alElegir) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    if (origen === 'sacar') inp.setAttribute('capture', 'environment');
    inp.style.display = 'none'; document.body.appendChild(inp);
    inp.addEventListener('change', function () { var f = inp.files && inp.files[0]; inp.remove(); if (f) alElegir(f, origen); });
    inp.click();
  }

  function crear(cont, opc) {
    opc = opc || {};
    cont.innerHTML = html({ set: opc.set, clase: opc.clase });
    function abrir(origen) {
      if (opc.alAbrir) { opc.alAbrir(origen); return; }
      elegirArchivo(origen, function (f, o) { if (opc.alElegir) opc.alElegir(f, o); });
    }
    activar(cont, function (origen) { abrir(origen); });
    return { abrir: abrir, marcar: function (si) { cont.innerHTML = html({ set: si, clase: opc.clase }); } };
  }
  window.NexoFoto = { crear: crear, html: html, activar: activar, elegirArchivo: elegirArchivo };
})();
