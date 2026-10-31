/* =============================================================
   Nexo · Jessica en el INFORME (ronda 77, 2026-10-31)
   Micrófono flotante de Jessica para informe-repartidor-nivel1.html. El informe no cambia:
   solo se añade un botón fijo abajo a la derecha y un bocadillo con lo que dice Jessica.
   · Cerebro: jessica-parte.js (los mismos datos que el informe, la copia del móvil).
   · Voz: NEXO - MÓDULO JESSICA (jesVoz), la que tenga elegida en jessica.html (Laomedeia).
   · Micrófono ABIERTO hasta tocarlo otra vez; se pausa mientras Jessica habla.
   · Saludo: la PRIMERA vez se presenta y cuenta lo que sabe hacer. Después saluda solo la
     primera vez que se abre el informe por la mañana (antes de las 14h) y por la tarde-noche.
   ============================================================= */
(function () {
  if (!window.JesParte) return;
  var ses = {};
  try { ses = JSON.parse(sessionStorage.getItem('sad_user') || '{}'); } catch (e) {}
  if (!ses.usuario) return;
  var USU = String(ses.usuario).toLowerCase();
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var J = { abierto: false, hablando: false, rec: null, audio: null, turno: 0, voz: 'Laomedeia', habla: true, pendiente: null, salta: false };
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  J.voz = leer('jes_voz') || 'Laomedeia'; J.habla = leer('jes_habla') !== '0';

  /* ───────────── aspecto (estética de Jessica; solo dentro de .jx) ───────────── */
  var css = document.createElement('style');
  css.textContent =
    '.jx{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none;font-family:inherit}' +
    '.jx>*{pointer-events:auto}' +
    '.jx-orbe{position:relative;width:64px;height:64px;border-radius:50%;border:0;cursor:pointer;color:#fff;display:grid;place-items:center;' +
      'background:radial-gradient(circle at 35% 30%,#FCA5A5,#EF4444 50%,#7F1D1D);box-shadow:0 8px 24px rgba(0,0,0,.45),0 0 22px rgba(239,68,68,.4)}' +
    '.jx-orbe svg{width:28px;height:28px}' +
    '.jx-orbe .jx-eti{position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);padding:1px 7px;border-radius:8px;background:#0B2447;font:800 10px/1.4 inherit;letter-spacing:.5px;white-space:nowrap}' +
    '.jx-orbe.on{background:radial-gradient(circle at 35% 30%,#FDE68A,#FBBF24 50%,#92400E)}' +
    '.jx-orbe.on::before,.jx-orbe.on::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid rgba(251,191,36,.7);animation:jxOnda 1.4s ease-out infinite}' +
    '.jx-orbe.on::after{animation-delay:.7s}' +
    '.jx-orbe.piensa svg{animation:jxParpa .8s steps(1) infinite}' +
    '.jx-orbe:focus-visible{outline:3px solid #FBBF24;outline-offset:3px}' +
    '@keyframes jxOnda{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.7);opacity:0}}' +
    '@keyframes jxParpa{50%{opacity:.25}}' +
    '.jx-boc{position:relative;width:min(360px,calc(100vw - 32px));max-height:min(55vh,420px);overflow:auto;padding:14px 16px 12px;border-radius:18px;' +
      'background:rgba(5,14,31,.94);color:#F3F7FC;border:1px solid rgba(251,191,36,.45);box-shadow:0 16px 40px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
    '.jx-boc[hidden]{display:none}' +
    '.jx-boc b{display:block;padding-right:30px;font-size:19px;font-weight:800;line-height:1.15;color:#FBBF24}' +
    '.jx-boc p{margin:6px 0 0;font-size:15px;font-weight:600;line-height:1.45}' +
    '.jx-oido{margin-top:8px;font-size:12.5px;font-weight:700;color:rgba(243,247,252,.68)}' +
    '.jx-x{position:absolute;top:6px;right:6px;width:36px;height:36px;border:0;border-radius:10px;background:transparent;color:rgba(243,247,252,.75);font:700 22px/1 inherit;cursor:pointer}' +
    '@media (prefers-reduced-motion:reduce){.jx *,.jx *::before,.jx *::after{animation:none!important}}';
  document.head.appendChild(css);

  var caja = document.createElement('div');
  caja.className = 'jx';
  caja.innerHTML =
    '<section class="jx-boc" id="jxBoc" hidden aria-live="polite"><button type="button" class="jx-x" id="jxX" aria-label="Cerrar el bocadillo">×</button>' +
      '<b id="jxTit"></b><div id="jxTxt"></div><div class="jx-oido" id="jxOido"></div></section>' +
    '<button type="button" class="jx-orbe" id="jxOrbe" aria-pressed="false" aria-label="Hablar con Jessica">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>' +
      '<span class="jx-eti">Jessica</span></button>';
  document.body.appendChild(caja);
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mostrar(tit, frases) {
    el('jxBoc').hidden = false;
    el('jxTit').textContent = tit || '';
    el('jxTxt').innerHTML = (frases || []).map(function (f) { return '<p>' + esc(f) + '</p>'; }).join('');
  }
  function oido(t) { el('jxOido').textContent = t || ''; }
  el('jxX').onclick = function () { el('jxBoc').hidden = true; };

  /* ───────────── voz (igual que jessica.html) ───────────── */
  function sinEmoji(t) { return String(t || '').replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').replace(/\s+/g, ' ').trim(); }
  function vozMovil(texto, alFin) {
    if (!window.speechSynthesis) { if (alFin) alFin(); return; }
    var fem = /m[oó]nica|elvira|luc[ií]a|helena|laura|paulina|marisol|ximena|isabela|female|mujer|google espa[nñ]ol$/i;
    var vs = speechSynthesis.getVoices().filter(function (v) { return /^es/i.test(v.lang); });
    function p(v) { return (fem.test(v.name) ? 4 : 0) + (/natural|neural|online|premium|enhanced/i.test(v.name) ? 3 : 0) + (/es-ES/i.test(v.lang) ? 2 : 0); }
    vs.sort(function (a, b) { return p(b) - p(a); });
    var u = new SpeechSynthesisUtterance(texto); u.lang = 'es-ES'; if (vs[0]) u.voice = vs[0];
    u.pitch = 1.2; u.rate = 1.08; if (alFin) u.onend = u.onerror = alFin;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  function wav(b64, rate) {
    var bin = atob(b64), pcm = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
    var buf = new ArrayBuffer(44 + pcm.length), v = new DataView(buf);
    function s(o, t) { for (var k = 0; k < t.length; k++) v.setUint8(o + k, t.charCodeAt(k)); }
    s(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, pcm.length, true);
    new Uint8Array(buf, 44).set(pcm);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  function callar() { J.turno++; if (J.audio) try { J.audio.pause(); } catch (e) {} if (window.speechSynthesis) speechSynthesis.cancel(); }
  function finHabla() { clearTimeout(J.tHabla); J.hablando = false; if (J.abierto) setTimeout(escuchar, 300); }
  /* Trozos de frases enteras (≤ 350 letras) seguidos; el siguiente se pide mientras suena el anterior. */
  function hablarLista(frases, op) {
    op = op || {};
    if (!J.habla) return;
    var trozos = [], cur = '';
    (frases || []).map(sinEmoji).filter(Boolean).forEach(function (f) {
      if (cur && (cur + ' ' + f).length > 350) { trozos.push(cur); cur = f; } else cur = cur ? cur + ' ' + f : f;
    });
    if (cur) trozos.push(cur);
    if (!trozos.length) return;
    callar();
    var turno = J.turno;
    J.hablando = true; if (J.abierto) micPausa();   // no se oye a sí misma
    clearTimeout(J.tHabla); J.tHabla = setTimeout(finHabla, 90000);
    function fin() { if (turno === J.turno) finHabla(); }
    if (J.voz === 'movil') return vozMovil(trozos.join(' '), fin);
    var pide = [];
    function pedir(i) { if (i < trozos.length && !pide[i]) pide[i] = JesParte.llamar('jesVoz', { texto: trozos[i], voz: J.voz }); return pide[i]; }
    function resto(i) { if (turno === J.turno) vozMovil(trozos.slice(i).join(' '), fin); }
    (function suena(i) {
      if (turno !== J.turno) return;
      if (i >= trozos.length) return fin();
      pedir(i).then(function (r) {
        if (turno !== J.turno) return;
        pedir(i + 1);
        if (!r || !r.ok) return resto(i);
        try {
          J.audio = new Audio(wav(r.audio, r.rate || 24000));
          J.audio.onended = function () { suena(i + 1); };
          J.audio.play().catch(function (e) {
            if (e && e.name === 'NotAllowedError' && op.bloqueado) { op.bloqueado(); return fin(); }
            resto(i);
          });
        } catch (e) { resto(i); }
      });
    })(0);
  }

  /* ───────────── micrófono abierto hasta apagarlo ───────────── */
  function micPausa() { var r = J.rec; J.rec = null; if (r) try { r.onend = null; r.abort(); } catch (e) {} }
  function escuchar() {
    if (!J.abierto || J.hablando || J.rec || !SR) return;
    var r = new SR(), espera = 150; J.rec = r;
    r.lang = 'es-ES'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = true;
    r.onresult = function (ev) {
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript;
        oido('«' + t.trim() + '»');
        if (ev.results[i].isFinal && t.trim()) orden(t);
      }
    };
    r.onerror = function (ev) {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { cerrar(); mostrar('Necesito el micrófono', ['Dale permiso al micrófono para hablar conmigo.']); }
      else if (ev.error !== 'no-speech' && ev.error !== 'aborted') espera = 2000;
    };
    r.onend = function () { if (J.rec === r) J.rec = null; if (J.abierto && !J.hablando) setTimeout(escuchar, espera); };
    try { r.start(); } catch (e) { J.rec = null; setTimeout(escuchar, 1000); }
  }
  function marcar() {
    var o = el('jxOrbe');
    o.classList.toggle('on', J.abierto);
    o.setAttribute('aria-pressed', J.abierto ? 'true' : 'false');
    o.setAttribute('aria-label', J.abierto ? 'Apagar el micrófono de Jessica' : 'Hablar con Jessica');
  }
  function abrir(alSaludar) {
    if (!SR) { mostrar('Sin dictado', ['Este móvil no deja dictar aquí. Abre Jessica desde el inicio para escribirle.']); return; }
    if (!alSaludar) { callar(); clearTimeout(J.tHabla); J.hablando = false; }
    J.abierto = true; marcar();
    if (el('jxBoc').hidden) mostrar('Te escucho…', ['Pregúntame por tu informe: «¿cómo voy?», «mi conducción», «mi consumo y CCP»…']);
    oido('Micrófono abierto · tócalo para terminar');
    escuchar();
  }
  function cerrar() {
    J.abierto = false; micPausa(); callar(); clearTimeout(J.tHabla); J.hablando = false; marcar();
    oido('Micrófono apagado · tócalo para hablar');
  }
  el('jxOrbe').onclick = function () {
    if (J.salta) { J.salta = false; return; }
    if (J.abierto) cerrar(); else abrir(false);
  };

  /* ───────────── lo que pregunta ───────────── */
  function orden(frase) {
    var i = JesParte.intencion(frase, true);
    i.enInforme = true;   // en el informe, «¿cómo voy?» es SU informe (también para Embolsado)
    var o = el('jxOrbe'); o.classList.add('piensa');
    mostrar('Déjame mirar…', []);
    JesParte.llamar('jesRegistrar', { frase: String(frase).slice(0, 400), accion: 'informe:' + i.q, id: '' });
    JesParte.responder(i).then(function (r) {
      o.classList.remove('piensa');
      if (!r) return;
      mostrar(r.titulo, r.frases);
      hablarLista(r.frases);
    }).catch(function () { o.classList.remove('piensa'); mostrar('Uy', ['Se me ha cruzado un cable. ¿Me lo repites?']); });
  }

  /* ───────────── saludo ───────────── */
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function saludar() {
    var kP = 'jes_inf_presentada_' + USU, kS = 'jes_inf_saludo_' + USU;
    var turno = hoy() + (new Date().getHours() < 14 ? '-m' : '-n');   // mañana · tarde-noche
    var presentada = leer(kP) === '1';
    if (presentada && leer(kS) === turno) return;
    JesParte.dia().then(function () {        // para decir su nombre de verdad (DATABASE › USUARIOS)
      guardar(kS, turno);
      var fr;
      if (!presentada) { guardar(kP, '1'); fr = JesParte.presentacion(); }
      else fr = [JesParte.saludo('inf')];
      mostrar(presentada ? 'Jessica' : '¡Hola! Soy Jessica', fr);
      abrir(true);
      hablarLista(fr, { bloqueado: function () { J.pendiente = fr; } });
    });
  }
  // El navegador no deja sonar antes del primer toque: entonces suena al tocar (sin apagar el micro).
  document.addEventListener('pointerdown', function (ev) {
    if (!J.pendiente) return;
    var fr = J.pendiente; J.pendiente = null;
    if (el('jxOrbe').contains(ev.target) && J.abierto) J.salta = true;
    hablarLista(fr);
  }, true);

  marcar();
  setTimeout(saludar, 1200);   // después de que el informe se pinte
})();
