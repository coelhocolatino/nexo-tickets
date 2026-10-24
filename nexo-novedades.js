/* =============================================================
   Nexo · "Qué novedades hay" (ronda 24, 2026-10-09)
   Ventana que sale UNA vez por usuario y edición de novedades al entrar
   en index.html o inicio-embolsado.html. Cada perfil ve lo suyo:
     · Repartidor  · Embolsado  · ADM (ve lo suyo + lo de los demás)
   Después se puede volver a abrir con cualquier enlace/botón que tenga
   el atributo data-nexo-novedades (o llamando a NexoNovedades.abrir()).
   Para una edición nueva: cambiar EDICION y el contenido de NOVEDADES.
   Ronda 47 (2026-10-24): GRANVIA deja de contar los pedidos dos veces (la foto del lote ya no se
     archiva como ticket); «Finalizar sin / con incidencia» en Pedidos asignados; el repartidor
     informa las incidencias desde el pedido y tiene su propio panel; aviso de versión nueva de la
     app. Se retira el aviso del Día Club Carrefour del 20 y 21 de octubre (ya pasó).
   Ronda 45 (2026-10-20): MÓDULO FLOTA y NUEVO INFORME (ya visto; se retira de esta edición).
   Ronda 31 (2026-10-16): %DIA, finalizar con/sin incidencia.
   ============================================================= */
(function () {
  var EDICION = '2026-10-ronda47';
  var TITULO_FECHA = 'Octubre 2026';

  function ic(d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var I = {
    diseno: ic('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16"/>'),
    foto: ic('<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.2"/>'),
    ok: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    campana: ic('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    tel: ic('<path d="M6 4h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z"/>'),
    rayo: ic('<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'),
    mano: ic('<path d="M4 20l1-4L16 5l3 3L8 19z"/>'),
    mas: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>'),
    panel: ic('<path d="M6 20V11M12 20V5M18 20v-6"/>'),
    correo: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    deshacer: ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    filtro: ic('<path d="M4 5h16l-6 8v6l-4-2v-4z"/>'),
    reloj: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    imagen: ic('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l4.5-4.5 3.5 3.5 3-3 5 5"/><circle cx="9" cy="9.5" r="1.4"/>'),
    surtidor: ic('<path d="M4 20V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15M3 20h12M6 7h5M16 9h3l1.5 2v7a1.5 1.5 0 0 1-3 0v-4h-1.5"/>'),
    llave: ic('<path d="M15 3a4 4 0 0 0-3.4 6.1L4 16.7V20h3.3l7.6-7.6A4 4 0 1 0 15 3z"/><circle cx="16" cy="7" r="1.1"/>'),
    furgoneta: ic('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>'),
    cuenta: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 12l4-2.5"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"/>')
  };

  /* ---- Contenido (frases cortas y prácticas) ---- */
  var NOVEDADES = {
    aviso: {
      titulo: 'Atención',
      aviso: true,
      items: [
        [I.campana, 'GRANVIA: LOS PEDIDOS SE CUENTAN AL ENTREGAR', 'La foto de la hoja con varios tickets ya NO cuenta pedidos. Cada pedido cuenta cuando lo entregas, uno a uno. Antes se contaba dos veces.']
      ]
    },
    granvia: {
      titulo: 'GRANVIA · la foto de los tickets',
      items: [
        [I.foto, 'Sacas la foto igual que siempre', 'Auto-Asignar, foto de la hoja con los tickets. La diferencia es que esa foto ya no se archiva como ticket: pasa directa a "Pedidos asignados" para repartirla.'],
        [I.mas, 'El número de "Pedidos (P)" es solo un aviso', 'Pon cuántos tickets hay en la foto. Ya no suma pedidos: sirve para avisarte si se leen más o menos de los que dijiste.'],
        [I.ok, 'Si el desglose no cuadra, te lo dice', 'Si dijiste 7 y se leen 5, sale en rojo y puedes añadir los que falten con "Añadir un ticket que falta".'],
        [I.rayo, 'Sin internet, igual', 'La foto se queda guardada en el móvil y los tickets se leen solos cuando vuelva la red. No se pierde nada.']
      ]
    },
    finalizar: {
      titulo: 'Pedidos asignados · dos botones',
      items: [
        [I.ok, 'Finalizar sin incidencia', 'Lo de siempre: el pedido se entrega y se sube su ticket.'],
        [I.campana, 'Finalizar con incidencia', 'El pedido se entrega igual (cuenta como entrega) y justo después se abre el registro de la incidencia. Igual que en %DIA.'],
        [I.mano, 'Llegaste al cliente, se computa', 'Aunque haya incidencia, si llegaste al cliente la entrega cuenta para ti. La incidencia queda apuntada para gestionarla después.']
      ]
    },
    incidencias: {
      titulo: 'Incidencias',
      items: [
        [I.mano, 'Se informan desde el pedido', 'Ya no se informa desde el botón de Incidencias: se hace desde la tarjeta del pedido, con "Finalizar con incidencia".'],
        [I.panel, 'Tienes tu propio panel', 'Al entrar en Incidencias lo primero que ves es tu panel: cuántas tienes pendientes, cuántas resueltas y por qué motivos.'],
        [I.filtro, 'Y la lista, para consultar', 'Desde el panel pasas a la lista con el botón "Lista" y ves el detalle de tus incidencias.']
      ]
    },
    incidenciasGestion: {
      titulo: 'Incidencias',
      items: [
        [I.mano, 'Tú sigues informando desde aquí', 'El botón "Informar incidencia" de la página de Incidencias se queda para ADM y Embolsado, igual que siempre.'],
        [I.campana, 'Los repartidores, desde el pedido', 'Ellos ya no informan desde esa página: lo hacen en la tarjeta del pedido, al finalizarlo. Así cada incidencia queda pegada a su pedido y a su entrega.'],
        [I.panel, 'Cada repartidor ve su panel', 'Al entrar en Incidencias le sale su propio panel, solo con sus números. Los rankings de repartidores y responsables siguen siendo vuestros.']
      ]
    },
    adm: {
      titulo: 'Solo ADM',
      items: [
        [I.deshacer, '%DIA queda limpio', 'Un pedido con la incidencia ya finalizada desaparece de "Cerrados". Antes se quedaba ahí para siempre (el caso de MARIA DEL MAR del 16/10).'],
        [I.surtidor, 'Combustible sin #ERROR!', 'El enlace al ticket de la hoja COMBUSTIBLE ya no da error: se graba como enlace, no como fórmula, así que no depende del idioma de la planilla.'],
        [I.campana, 'Las incidencias directas son tuyas', 'Informar una incidencia desde la página de Incidencias queda para ADM y Embolsado. Los repartidores lo hacen desde el pedido.']
      ]
    },
    actualizar: {
      titulo: 'La app se actualiza sola',
      items: [
        [I.rayo, 'Aviso de versión nueva', 'Cuando haya una versión nueva, sale un aviso abajo. Pulsa "Actualizar ahora" y se ponen al día TODAS las páginas y módulos de tu móvil de golpe.'],
        [I.reloj, 'O "Más tarde"', 'Si estás en medio de un reparto, pulsa "Más tarde" y no te vuelve a molestar hasta la próxima vez que abras la app.'],
        [I.panel, 'La versión, en el login', 'En la pantalla de entrada se ve abajo qué versión de Nexo tiene este móvil. Si está atrasada, lo dice y se actualiza con un toque.']
      ]
    }
  };

  function sesion() { try { return JSON.parse(sessionStorage.getItem('sad_user') || '{}'); } catch (e) { return {}; } }
  function perfil(s) {
    var nivel = String(s.nivel || '').toLowerCase(), dep = String(s.departamento || '').toUpperCase();
    if (nivel === 'admin' || dep === 'ADM') return 'adm';
    if (dep.indexOf('EMBOLSADO') !== -1) return 'embolsado';
    return 'repartidor';
  }
  function secciones(p) {
    if (p === 'repartidor') return ['aviso', 'granvia', 'finalizar', 'incidencias', 'actualizar'];
    if (p === 'embolsado')  return ['aviso', 'incidenciasGestion', 'actualizar'];   // no reparten: lo de entregar no les toca
    return ['aviso', 'granvia', 'finalizar', 'incidenciasGestion', 'adm', 'actualizar'];   // ADM lo ve todo
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var CSS = '' +
    '.nxn-velo{position:fixed;inset:0;z-index:500;background:rgba(11,36,71,.62);display:flex;align-items:flex-end;justify-content:center}' +
    '.nxn-hoja{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:var(--nx-superficie,#FBFCFA);color:var(--nx-tinta,#0B2447);' +
    'border-radius:24px 24px 0 0;padding:12px 20px calc(20px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:14px;' +
    'font-family:var(--nx-texto,"Hanken Grotesk",system-ui,sans-serif);animation:nxnSube .25s ease}' +
    '@keyframes nxnSube{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}' +
    '.nxn-hoja::before{content:"";align-self:center;width:40px;height:5px;border-radius:99px;background:var(--nx-linea,#CBD5E2);flex:0 0 auto}' +
    '.nxn-cab small{display:block;font-size:13px;font-weight:800;color:var(--nx-suave,#4F6078);text-transform:uppercase;letter-spacing:.04em}' +
    '.nxn-cab h2{margin:2px 0 0;font-family:var(--nx-display,"Big Shoulders Display","Arial Narrow",sans-serif);font-weight:800;font-size:34px;line-height:1.02}' +
    '.nxn-sec{display:flex;flex-direction:column;gap:8px}' +
    '.nxn-sec h3{margin:6px 0 0;font-size:13px;font-weight:800;color:var(--nx-suave,#4F6078);text-transform:uppercase;letter-spacing:.05em}' +
    '.nxn-it{display:grid;grid-template-columns:44px minmax(0,1fr);gap:12px;align-items:start;background:var(--nx-campo,#EEF2F7);border-radius:14px;padding:12px}' +
    '.nxn-it i{width:44px;height:44px;border-radius:12px;background:var(--nx-tinta,#0B2447);color:#FBBF24;display:grid;place-items:center;font-style:normal}' +
    '.nxn-it b{display:block;font-size:16px;font-weight:800;line-height:1.2}' +
    '.nxn-it span{display:block;margin-top:3px;font-size:14px;font-weight:600;line-height:1.4;color:var(--nx-suave,#4F6078)}' +
    '.nxn-aviso h3{color:#8A4B00}' +
    '.nxn-aviso .nxn-it{background:#FBBF24;border:3px solid #0B2447;padding:16px}' +
    '.nxn-aviso .nxn-it i{background:#0B2447;color:#FBBF24}' +
    '.nxn-aviso .nxn-it b{font-family:var(--nx-display,"Big Shoulders Display","Arial Narrow",sans-serif);font-size:26px;line-height:1.05;text-transform:uppercase;color:#0B2447}' +
    '.nxn-aviso .nxn-it span{font-size:16px;font-weight:800;color:#0B2447}' +
    '.nxn-ok{min-height:56px;border:0;border-radius:14px;background:var(--nx-tinta,#0B2447);color:var(--nx-tinta-clara,#F3F7FC);font-size:17px;font-weight:800;' +
    'font-family:inherit;cursor:pointer;position:sticky;bottom:0;box-shadow:0 -8px 16px var(--nx-superficie,#FBFCFA)}';

  function abrir() {
    if (document.querySelector('.nxn-velo')) return;
    if (!document.getElementById('nxn-css')) { var st = document.createElement('style'); st.id = 'nxn-css'; st.textContent = CSS; document.head.appendChild(st); }
    var s = sesion(), p = perfil(s);
    var h = '<div class="nxn-hoja" role="dialog" aria-modal="true" aria-labelledby="nxnTit">' +
      '<div class="nxn-cab"><small>' + TITULO_FECHA + '</small><h2 id="nxnTit">Qué novedades hay</h2></div>';
    secciones(p).forEach(function (k) {
      var sec = NOVEDADES[k]; if (!sec) return;
      h += '<div class="nxn-sec' + (sec.aviso ? ' nxn-aviso' : '') + '"><h3>' + esc(sec.titulo) + '</h3>' + sec.items.map(function (it) {
        return '<div class="nxn-it"><i>' + it[0] + '</i><div><b>' + esc(it[1]) + '</b><span>' + esc(it[2]) + '</span></div></div>';
      }).join('') + '</div>';
    });
    h += '<button type="button" class="nxn-ok">Entendido</button></div>';
    var velo = document.createElement('div'); velo.className = 'nxn-velo'; velo.innerHTML = h;
    function cerrar() { velo.remove(); marcarVisto(); }
    velo.addEventListener('click', function (e) { if (e.target === velo) cerrar(); });
    velo.querySelector('.nxn-ok').addEventListener('click', cerrar);
    document.body.appendChild(velo);
  }
  function clave() { var s = sesion(); return 'nexo_novedades_' + String(s.usuario || 'anon').toLowerCase(); }
  function marcarVisto() { try { localStorage.setItem(clave(), EDICION); } catch (e) {} }
  function yaVisto() { try { return localStorage.getItem(clave()) === EDICION; } catch (e) { return true; } }

  function iniciar() {
    document.querySelectorAll('[data-nexo-novedades]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); abrir(); });
    });
    var s = sesion();
    if (s.usuario && !yaVisto()) setTimeout(abrir, 700);   // una vez por usuario y edición
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.NexoNovedades = { abrir: abrir, edicion: EDICION };
})();
