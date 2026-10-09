/* =============================================================
   Nexo · selector de foto deslizante (ronda 24, 2026-10-09)
   Un solo control, pequeño y solo con dibujos (2026-10-09):
     · deslizar el botón a la IZQUIERDA → SUBIR una foto (galería)
     · deslizar el botón a la DERECHA   → SACAR una foto (cámara)
   También vale tocar directamente el dibujo de la galería o de la cámara. Uso:
     NexoFoto.crear(document.getElementById('miContenedor'), {
       alElegir: function (archivo, origen) { ... }   // origen: 'subir' | 'sacar'
       // o bien alAbrir: function (origen) { ... }  → la página abre su propio input
     });
   ============================================================= */
(function () {
  var CSS = '' +
    '.nxf{position:relative;width:184px;max-width:100%;height:56px;border-radius:16px;background:var(--nx-azul-fondo,#DCE7FB);color:var(--nx-azul,#17409E);' +
    'display:grid;grid-template-columns:1fr 1fr;align-items:center;user-select:none;-webkit-user-select:none;touch-action:pan-y;overflow:hidden}' +
    '.nxf button.lado{height:56px;border:0;background:transparent;color:inherit;display:flex;align-items:center;cursor:pointer;padding:0 14px}' +
    '.nxf button.izq{justify-content:flex-start}.nxf button.der{justify-content:flex-end}' +
    '.nxf .pomo{position:absolute;top:6px;left:50%;width:64px;height:44px;margin-left:-32px;border-radius:12px;background:var(--nx-tinta,#0B2447);' +
    'color:var(--nx-tinta-clara,#F3F7FC);display:flex;align-items:center;justify-content:center;gap:2px;cursor:grab;touch-action:none;' +
    'box-shadow:0 2px 8px rgba(11,36,71,.25);transition:transform .2s}' +
    '.nxf.arrastrando .pomo{transition:none;cursor:grabbing}' +
    '.nxf .pomo svg.f{opacity:.55}' +
    '.nxf.ir-izq{background:#C9D9F7}.nxf.ir-der{background:#C9D9F7}';
  function ic(d, w) { return '<svg width="' + (w || 20) + '" height="' + (w || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var I_GAL = ic('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l4.5-4.5 3.5 3.5 3-3 5 5"/><circle cx="9" cy="9.5" r="1.4"/>');
  var I_CAM = ic('<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.2"/>');
  var I_IZQ = '<svg class="f" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var I_DER = '<svg class="f" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  function ponerCss() {
    if (document.getElementById('nxf-css')) return;
    var st = document.createElement('style'); st.id = 'nxf-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  function crear(cont, opc) {
    opc = opc || {};
    ponerCss();
    cont.innerHTML = '<div class="nxf" role="group" aria-label="Foto del ticket">' +
      '<button type="button" class="lado izq" aria-label="Subir foto de la galería" title="Subir foto">' + I_GAL + '</button>' +
      '<button type="button" class="lado der" aria-label="Sacar foto con la cámara" title="Sacar foto">' + I_CAM + '</button>' +
      '<div class="pomo" aria-hidden="true">' + I_IZQ + I_CAM + I_DER + '</div>' +
      '<input type="file" accept="image/*" hidden class="in-subir">' +
      '<input type="file" accept="image/*" capture="environment" hidden class="in-sacar"></div>';
    var raiz = cont.firstChild, pomo = raiz.querySelector('.pomo');
    var inSubir = raiz.querySelector('.in-subir'), inSacar = raiz.querySelector('.in-sacar');
    function abrir(origen) { if (opc.alAbrir) { opc.alAbrir(origen); return; } (origen === 'subir' ? inSubir : inSacar).click(); }
    function elegido(origen) { return function (ev) { var f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (f && opc.alElegir) opc.alElegir(f, origen); }; }
    inSubir.addEventListener('change', elegido('subir'));
    inSacar.addEventListener('change', elegido('sacar'));
    raiz.querySelector('.izq').addEventListener('click', function () { abrir('subir'); });
    raiz.querySelector('.der').addEventListener('click', function () { abrir('sacar'); });

    var x0 = null, dx = 0, max = 0;
    pomo.addEventListener('pointerdown', function (e) {
      x0 = e.clientX; dx = 0; max = (raiz.clientWidth - pomo.offsetWidth) / 2 - 6;
      raiz.classList.add('arrastrando'); pomo.setPointerCapture(e.pointerId);
    });
    pomo.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      dx = Math.max(-max, Math.min(max, e.clientX - x0));
      pomo.style.transform = 'translateX(' + dx + 'px)';
      raiz.classList.toggle('ir-izq', dx < -max * 0.6); raiz.classList.toggle('ir-der', dx > max * 0.6);
    });
    function soltar() {
      if (x0 === null) return;
      x0 = null; raiz.classList.remove('arrastrando', 'ir-izq', 'ir-der');
      pomo.style.transform = '';
      if (dx < -max * 0.6) abrir('subir'); else if (dx > max * 0.6) abrir('sacar');
    }
    pomo.addEventListener('pointerup', soltar);
    pomo.addEventListener('pointercancel', soltar);
    return { abrir: abrir };
  }
  window.NexoFoto = { crear: crear };
})();
