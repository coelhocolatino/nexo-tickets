/* =============================================================
   Nexo · "Qué novedades hay" (ronda 24, 2026-10-09)
   Ventana que sale UNA vez por usuario y edición de novedades al entrar
   en index.html o inicio-embolsado.html. Cada perfil ve lo suyo:
     · Repartidor  · Embolsado  · ADM (ve lo suyo + lo de los demás)
   Después se puede volver a abrir con cualquier enlace/botón que tenga
   el atributo data-nexo-novedades (o llamando a NexoNovedades.abrir()).
   Para una edición nueva: cambiar EDICION y el contenido de NOVEDADES.
   Ronda 45 (2026-10-20): MÓDULO FLOTA (el repartidor sube el ticket de combustible al repostar)
     y NUEVO INFORME. El repostaje no lo ve EMBOLSADO (no conducen); las facturas de taller y el
     panel de la flota son solo para ADM.
   Ronda 31 (2026-10-16): se mantiene el AVISO del Día Club Carrefour; novedades de %DIA (finalizar con/sin incidencia).
   Ronda 28 (2026-10-16): primero un AVISO destacado (Día Club Carrefour) para todos los perfiles; después las novedades de Pedidos asignados y GRANVIA.
   ============================================================= */
(function () {
  var EDICION = '2026-10-ronda45';
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
        [I.campana, 'DÍA CLUB CARREFOUR', 'Martes 20 y miércoles 21 de octubre: prepárate para un volumen alto de pedidos.']
      ]
    },
    flota: {
      titulo: 'Nuevo: módulo Flota',
      items: [
        [I.furgoneta, 'Botón nuevo en el inicio', 'Se llama "Flota". Es donde se graba cada repostaje de la furgoneta.'],
        [I.surtidor, 'Al repostar, foto del ticket', 'Siempre que repostes: entra en Flota, saca la foto del ticket de la gasolinera y guárdalo. Una foto por repostaje, el mismo día.'],
        [I.rayo, 'El ticket se lee solo', 'Saca la fecha, la hora, la matrícula, los litros y el importe. Lo que no se lea claro sale marcado en amarillo para que lo escribas tú.'],
        [I.cuenta, 'Los km los pones tú', 'Mira el cuentakilómetros y escribe los km que marca. Es lo único que el ticket casi nunca trae, y sin eso no se puede calcular el consumo.'],
        [I.reloj, '¿Mañana o tarde?', 'Lo pone solo por la hora del ticket, y se puede cambiar con un toque. Si repostas por la mañana ese día todavía no cuenta; si repostas por la tarde, sí.'],
        [I.panel, 'Lo que sale al guardar', 'Km recorridos desde el último repostaje, litros por cada 100 km, pedidos entregados en ese período y el coste de combustible por pedido.']
      ]
    },
    flotaAdm: {
      titulo: 'Flota · solo ADM',
      items: [
        [I.llave, 'Facturas de taller', 'Foto o PDF de la factura: se lee sola, sale para revisar y se graba en el HISTORIAL. El archivo se guarda en Drive, en la carpeta del trimestre.'],
        [I.ok, 'Mantenimiento al día', 'Si el trabajo es uno de los items (aceite, pastillas, ITV, correa…), se le actualizan la fecha y los km en ESTADO DE FLOTA y los semáforos se recalculan solos.'],
        [I.panel, 'Panel de la flota', 'Una tarjeta por furgoneta: km, vencidos y próximos, consumo medio, coste por pedido y gasto de taller del trimestre.']
      ]
    },
    informe: {
      titulo: 'Nuevo Informe',
      items: [
        [I.panel, 'Tus números, no solo el día', 'El botón "Informe" trae pantallas nuevas con todo tu reparto.'],
        [I.filtro, 'Filtro de período', 'Eliges el período y todo se recalcula: el mes en curso, el anterior o el trozo que quieras mirar.'],
        [I.mas, 'Pedidos y extras', 'Pedidos P, XR y XP y el total, comparados con el período anterior y con el año pasado.'],
        [I.rayo, 'Proyección al cierre', 'Con el ritmo que llevas, cuántos pedidos vas a cerrar el mes.'],
        [I.imagen, 'Por tienda, día y franja', 'El reparto por tienda en %, el total de cada día y el detalle día > tienda > franja.']
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
    if (p === 'repartidor') return ['aviso', 'flota', 'informe'];
    if (p === 'embolsado') return ['aviso', 'informe'];                 // no conducen: el repostaje no les toca
    return ['aviso', 'flota', 'flotaAdm', 'informe'];                   // ADM lo ve todo
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
