/* =============================================================
   Nexo · "Qué novedades hay" (ronda 24, 2026-10-09)
   Ventana que sale UNA vez por usuario y edición de novedades al entrar
   en index.html o inicio-embolsado.html. Cada perfil ve lo suyo:
     · Repartidor  · Embolsado  · ADM (ve lo suyo + lo de los demás)
   Después se puede volver a abrir con cualquier enlace/botón que tenga
   el atributo data-nexo-novedades (o llamando a NexoNovedades.abrir()).
   Para una edición nueva: cambiar EDICION y el contenido de NOVEDADES.
   ============================================================= */
(function () {
  var EDICION = '2026-10-ronda24';
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
    imagen: ic('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l4.5-4.5 3.5 3.5 3-3 5 5"/><circle cx="9" cy="9.5" r="1.4"/>')
  };

  /* ---- Contenido (frases cortas y prácticas) ---- */
  var NOVEDADES = {
    todos: {
      titulo: 'Para todos',
      items: [
        [I.diseno, 'Nueva imagen', 'Nexo tiene diseño y logo nuevos, más claros y con botones más grandes. La app se actualiza sola al entrar.'],
        [I.foto, 'Foto con un solo botón', 'Desliza a la DERECHA para sacar la foto con la cámara o a la IZQUIERDA para subirla de la galería. También vale tocar el dibujo.']
      ]
    },
    repartidor: {
      titulo: 'Repartidores',
      items: [
        [I.foto, 'Subir ticket', 'El botón de la foto está ahora al lado de "Subir ticket".'],
        [I.ok, 'Entregados de hoy', 'En Pedidos asignados, lo que ya entregaste queda abajo en "Entregados hoy", con el botón gris "Entregado · hora".'],
        [I.foto, '%DIA más rápido', '"Entregar" abre directamente la foto del ticket. Puedes sacarla o subirla de la galería.'],
        [I.campana, 'Aviso al móvil', 'En %DIA toca "Activar avisos": te llegará un aviso cuando te asignen un pedido, aunque tengas la app cerrada. En iPhone, instala antes la app en la pantalla de inicio (Compartir → "Añadir a pantalla de inicio").'],
        [I.tel, 'Cliente ausente sin esperar', 'Con las 3 llamadas hechas ya puedes registrar la incidencia. Ya no hay que esperar 10 minutos.'],
        [I.imagen, 'Más fotos en incidencias', 'Puedes añadir hasta 10 fotos en cualquier motivo.']
      ]
    },
    embolsado: {
      titulo: 'Embolsado',
      items: [
        [I.rayo, 'Lectura del ticket en segundos', 'La foto del ticket se lee ahora en 2–3 segundos.'],
        [I.ok, 'La tarjeta se rellena sola', 'Al guardar la foto, la caja, el nº de pedido y la dirección del ticket pasan a la tarjeta.'],
        [I.mano, 'Cajas, N, F y C a mano', 'Si no se leyó lo escrito a mano, toca la línea "Cajas · N · F · C" de la tarjeta, escríbelo y confirma.'],
        [I.mas, 'Botón amarillo "+"', 'Nueva reserva también desde el botón redondo amarillo. Puedes arrastrarlo donde te moleste menos.'],
        [I.panel, 'Incidencias', 'Puedes poner el responsable (usuario, cliente, tienda o no identificado) y finalizarlas. Hay un Panel con pendientes, solucionadas y rankings.'],
        [I.campana, 'Aviso de incidencia nueva', 'En Incidencias toca "Activar avisos": te llegará un aviso al móvil con cada incidencia nueva.'],
        [I.correo, 'Informe diario', 'El informe diario sale desde nexo@nexotransportes.com.']
      ]
    },
    adm: {
      titulo: 'ADM',
      items: [
        [I.filtro, '%DIA por repartidor', 'En Asignados y Cerrados puedes filtrar por repartidor y ver cuántos pedidos tiene.'],
        [I.deshacer, 'Deshacer entrega', 'Si un pedido se cerró por error hoy, "Deshacer entrega" lo devuelve al repartidor y borra la foto archivada (queda en la auditoría).'],
        [I.panel, 'Resolver incidencias', 'Restaurar o eliminar el pedido está ahora en la ventana "Resolver", junto al responsable y la solución.'],
        [I.campana, 'Avisos al móvil', 'Te llegan avisos de incidencias nuevas y de reservas automáticas creadas con la franja completa.'],
        [I.reloj, 'Reservas automáticas', 'En Configuración: clientes habituales cada semana o cada 15 días. La reserva se crea sola 3 días antes.']
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
    if (p === 'adm') return ['todos', 'adm', 'embolsado', 'repartidor'];
    return ['todos', p];
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
      h += '<div class="nxn-sec"><h3>' + esc(sec.titulo) + '</h3>' + sec.items.map(function (it) {
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
