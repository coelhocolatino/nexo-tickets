/* =============================================================
   Nexo · Jessica — EL PARTE DEL DÍA (ronda 74, 2026-10-31)
   «Buenos días, Jessica, ¿qué tenemos para hoy?» · «¿Cómo voy?» · «¿Y mi conducción?»
   Jessica contesta con los MISMOS datos que ya se ven en la app:
     · pedidos de hoy por franja y tienda ...... NEXO - MÓDULO JESSICA (jesDia, solo lee)
     · informe de producción, incidencias y
       estilo de conducción ................... Módulo Embolsado (los datos del informe del
                                                 repartidor; se comparte la copia del móvil
                                                 'nexo_informe_datos' con esa página)
     · clientes previstos ...................... Embolsado (clientesPrevistos) y NEXO · DIA
     · pedidos %DIA de su ruta ................ NEXO · DIA (diaListar «mios»)
   Repartidor: su parte. ADM: toda la empresa, o el de un repartidor («informe de Laura»).
   No cambia nada en las hojas.
   ============================================================= */
(function () {
  var PROXY = 'https://sad-proxy.colatino-ventas-enlinea.workers.dev/';
  var URL_JES = 'https://script.google.com/macros/s/AKfycbzo14OOZrwPqfXjPd1xjIn5EXr7EoFmLd6YdATo5QrC4piPaByEVrC4pUX9jpBwMl--/exec';
  var URL_EMB = 'https://script.google.com/macros/s/AKfycbxvyzpNQObvloq0tuoDisEn4qrGWh0tEGfGHn4NXoEqP1ShODyIWQ1bzYyWfcuz_Pqh/exec';
  var URL_DIA = 'https://script.google.com/macros/s/AKfycbwrX90CKa7GQki-DUDZFpdGVlGIXZvmiHsRKCEW7ZwBbYkKfYPr3R1kx96Uz9GKL_0m/exec';
  var FRANJAS = ['10-13H', '13-16H', '16-19H', '19-22H'];
  var FR_TXT = { '10-13H': 'de 10 a 1', '13-16H': 'de 1 a 4', '16-19H': 'de 4 a 7', '19-22H': 'de 7 a 10' };

  var ses = {};
  try { ses = JSON.parse(sessionStorage.getItem('sad_user') || '{}'); } catch (e) {}
  var USU = String(ses.usuario || '').toLowerCase();
  var REP = USU.toUpperCase();
  var NOMBRE = ses.nombre ? String(ses.nombre).split(' ')[0] : USU;
  NOMBRE = NOMBRE.charAt(0).toUpperCase() + NOMBRE.slice(1).toLowerCase();
  var ES_ADM = String(ses.nivel || '').toLowerCase().trim() === 'admin';
  var ES_EMB = String(ses.departamento || '').toUpperCase().trim() === 'EMBOLSADO';

  /* ───────────── llamadas ───────────── */
  function post(url, accion, extra) {
    return fetch(PROXY + '?url=' + encodeURIComponent(url), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ accion: accion, usuario: USU }, extra || {}))
    }).then(function (r) { return r.text(); })
      .then(function (t) { try { return JSON.parse(t); } catch (e) { return { ok: false, error: 'Respuesta ilegible.' }; } })
      .catch(function () { return { ok: false, red: true, error: 'Sin conexión.' }; });
  }
  function hoyLocal() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function leer(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* Pedidos de hoy (jesDia): siempre frescos, son pocos bytes. */
  var _dia = null;
  function dia() { return post(URL_JES, 'jesDia').then(function (r) { if (r && r.ok) _dia = r; return r; }); }

  /* Datos del informe: la misma copia que guarda informe-repartidor-nivel1.html. Solo se descarga si cambió. */
  var CLAVE_INF = 'nexo_informe_datos';
  var _inf = null;
  function informe() {
    if (ES_ADM && !_dia) return dia().then(function () { if (!_dia) _dia = { usuarios: [] }; return informe(); });
    if (_inf) return Promise.resolve(_inf);
    var local = leer(CLAVE_INF);
    return post(URL_EMB, 'informeRepartidorDatosVersion').then(function (v) {
      if (local && local.datos && local.datos.rows && (!v || !v.ok || v.generado === local.generado)) return (_inf = local.datos);
      return post(URL_EMB, 'informeRepartidorDatos').then(function (r) {
        if (r && r.ok && r.datos && r.datos.rows) { guardar(CLAVE_INF, { generado: r.generado || r.datos.generado || '', datos: r.datos }); return (_inf = r.datos); }
        return local && local.datos && local.datos.rows ? (_inf = local.datos) : null;
      });
    });
  }

  /* Clientes previstos de hoy: mismas claves que el informe (se calculan a las 5:00, una vez al día). */
  function previsto(clave, url, accion) {
    var c = leer(clave);
    if (c && c.ok && c.hoyLocal === hoyLocal()) return Promise.resolve(c);
    return post(url, accion, { dia: 'hoy' }).then(function (r) {
      if (r && r.ok) { r.hoyLocal = hoyLocal(); guardar(clave, r); }
      return r;
    });
  }
  function previstos() {
    return Promise.all([previsto('nexo_prev_hoy_crf', URL_EMB, 'clientesPrevistos'), previsto('nexo_prev_hoy_dia', URL_DIA, 'diaClientesPrevistos')]);
  }
  /* %DIA de su ruta (lo asignado a él y lo que ya entregó hoy). */
  function diaRuta() { return post(URL_DIA, 'diaListar', { vista: 'mios' }); }

  /* ───────────── cálculo (igual que el informe) ───────────── */
  function masDias(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function difDias(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5); }
  function mediana(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function periodo(D, id) { return (D.periodos || []).filter(function (p) { return p.id === id; })[0] || null; }
  function enPer(r, per) { return r[7] ? r[7] === per.id : (r[0] >= per.ini && r[0] <= per.fin); }
  function tot(r) { return (r[4] || 0) + (r[5] || 0) + (r[6] || 0); }   // P + XP + XR, como el informe

  /** Suma de un período. hasta: solo hasta esa fecha (para comparar «a la misma altura»). */
  function sumar(D, per, rep, hasta) {
    var o = { total: 0, porTienda: {}, dias: {} };
    if (!per) return o;
    D.rows.forEach(function (r) {
      if (!enPer(r, per) || (hasta && r[0] > hasta)) return;
      if (rep && D.reps[r[2]] !== rep) return;
      o.total += tot(r);
      var t = D.tiendas[r[1]]; o.porTienda[t] = (o.porTienda[t] || 0) + tot(r);
      o.dias[r[0]] = 1;
    });
    o.nDias = Object.keys(o.dias).length;
    return o;
  }
  /** Lo que lleva un repartidor (o la empresa con rep = null) en el período en curso, comparado. */
  function produccion(D, rep) {
    var act = periodo(D, 'act'), ant = periodo(D, 'ant');
    if (!act) return null;
    var n = Math.max(1, Math.min(difDias(act.ini, hoyLocal()) + 1, difDias(act.ini, act.fin) + 1));
    var a = sumar(D, act, rep), b = ant ? sumar(D, ant, rep, masDias(ant.ini, n - 1)) : null;
    // La media de la flota: pedidos por DÍA TRABAJADO de cada repartidor (ronda 48).
    var porRep = {};
    D.rows.forEach(function (r) {
      if (!enPer(r, act)) return;
      var k = D.reps[r[2]], x = porRep[k] || (porRep[k] = { tot: 0, dias: {} });
      x.tot += tot(r); x.dias[r[0]] = 1;
    });
    var reps = Object.keys(porRep).map(function (k) { var x = porRep[k], nd = Object.keys(x.dias).length; return { rep: k, media: nd ? x.tot / nd : 0, tot: x.tot }; })
      .filter(function (x) { return x.tot > 0 && x.rep && (D.niveles || {})[x.rep] !== 'ADMIN'; });
    var ranking = reps.slice().sort(function (x, y) { return y.tot - x.tot; });
    var yo = rep ? reps.filter(function (x) { return x.rep === rep; })[0] : null;
    return {
      act: act, ant: ant, n: n, total: a.total, porTienda: a.porTienda, nDias: a.nDias,
      antes: b ? b.total : 0, varPct: b && b.total ? (a.total - b.total) / b.total * 100 : null,
      media: yo ? yo.media : null, mediaFlota: mediana(reps.map(function (x) { return x.media; })),
      puesto: rep ? ranking.map(function (x) { return x.rep; }).indexOf(rep) + 1 : 0, deTantos: ranking.length,
      top: ranking.slice(0, 3)
    };
  }
  function incidencias(D, rep, act, ant, n) {
    var hoy = hoyLocal();
    var l = (D.incidencias || []).filter(function (i) { return !rep || i.u === rep; });
    var ahora = l.filter(function (i) { return i.f >= act.ini && i.f <= hoy; });
    var antes = ant ? l.filter(function (i) { return i.f >= ant.ini && i.f <= masDias(ant.ini, n - 1); }).length : null;
    var tipos = {};
    ahora.forEach(function (i) { var t = String(i.tipo || 'otra').replace(/_/g, ' ').toLowerCase(); tipos[t] = (tipos[t] || 0) + 1; });
    var abiertas = ahora.filter(function (i) { return !/RESUELT|FINALIZ|CERRAD/.test(i.estado); }).length;
    return { n: ahora.length, antes: antes, abiertas: abiertas, tipos: tipos };
  }
  function conduccion(D, rep) {
    var c = D.conduccion || {}, filas = (c.filas || []).slice().sort(function (a, b) { return b.score - a.score; });
    if (!filas.length) return null;
    var m = function (k) { return filas.reduce(function (s, f) { return s + (f[k] || 0); }, 0) / filas.length; };
    var mia = rep ? filas.filter(function (f) { return f.rep === rep; })[0] : null;
    return { periodo: c.periodo, filas: filas, mia: mia, puesto: mia ? filas.indexOf(mia) + 1 : 0, mScore: m('score'), mAcel: m('acel'), mFreno: m('freno') };
  }

  /* ───────────── cómo lo dice ───────────── */
  function una(l) { return l[Math.floor(Math.random() * l.length)]; }
  function nf(n) { return new Intl.NumberFormat('es-ES').format(Math.round(n)); }
  function saludo() { var h = new Date().getHours(); return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'; }
  function bonito(t) {   // «CARREFOUR TRAVESIA» → «Carrefour Travesía»
    return String(t || '').toLowerCase().replace(/(^|[\s-])(\S)/g, function (a, b, c) { return b + c.toUpperCase(); })
      .replace(/Travesia/g, 'Travesía').replace(/Granvia/g, 'Gran Vía').replace(/%dia/gi, '%DIA');
  }
  /** «WEXPOSITO» → «Willian» (nombre de pila de USUARIOS; lo trae jesDia para el ADM). */
  function nomRep(rep) {
    var u = ((_dia && _dia.usuarios) || []).filter(function (x) { return String(x.u).toUpperCase() === rep; })[0];
    return u && u.n ? bonito(String(u.n).split(/\s+/)[0]) : bonito(rep);
  }
  function corto(n) { return bonito(String(n || '').split(/[,·(]|\s\d/)[0].trim().split(/\s+/).slice(0, 3).join(' ')); }
  function lista(l) { return l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1]; }
  function pedidos(n) { return n + (n === 1 ? ' pedido' : ' pedidos'); }
  function tramoDia(t) {   // %DIA: «09:00-11:00» → «de 9 a 11»
    var m = /(\d{1,2})[:.h]?\d{0,2}\s*[-–a]\s*(\d{1,2})/.exec(String(t || ''));
    var h = function (x) { x = +x; return x > 12 ? x - 12 : x; };
    return m ? 'de ' + h(m[1]) + ' a ' + h(m[2]) : String(t || 'sin tramo');
  }
  function sumaTienda(x) {
    var o = { total: 0, listos: 0, asignados: 0, entregados: 0, conCaja: 0 };
    Object.keys(x || {}).forEach(function (f) { Object.keys(o).forEach(function (k) { o[k] += x[f][k] || 0; }); });
    return o;
  }
  function tiendaDe(d) {
    var t = String(ses.tiendaPre || (d && d.tiendaPre) || '').toUpperCase();
    if (/GRAN/.test(t)) return 'GRANVIA';
    if (/TRAV/.test(t)) return 'TRAVESIA';
    var max = '', n = -1;
    Object.keys((d && d.tiendas) || {}).forEach(function (k) { var s = sumaTienda(d.tiendas[k]).total; if (s > n) { n = s; max = k; } });
    return max || 'TRAVESIA';
  }
  function franjasTxt(x) {
    var l = FRANJAS.filter(function (f) { return x[f] && x[f].total; }).map(function (f) {
      return x[f].total + ' ' + (f === '10-13H' ? 'para primera hora' : FR_TXT[f]);
    });
    if (x['SIN FRANJA'] && x['SIN FRANJA'].total) l.push(x['SIN FRANJA'].total + ' sin franja');
    return lista(l);
  }
  function crfDeMiTienda(lista_, d) {
    if (ES_ADM || !d || !d.ok) return lista_;
    var gran = /GRAN/.test(tiendaDe(d));
    return lista_.filter(function (c) { return gran === /GRAN\s*V/i.test(c.tienda || ''); });
  }

  /* ───────────── las respuestas: { titulo, frases[] } ───────────── */
  /** «¿Qué tenemos para hoy?» */
  function parteHoy() {
    return Promise.all([dia(), diaRuta(), previstos()]).then(function (r) {
      var d = r[0], ruta = r[1], pv = r[2], fr = [];
      if (!d || !d.ok) return { titulo: 'Ahora no llego a los pedidos', frases: [(d && d.error) || 'Sin conexión. Prueba en un momento.'] };
      fr.push('¡' + saludo() + ', ' + NOMBRE + '! ' + una(['Vamos a por un día genial.', '¡Qué bien que estés aquí!', 'Hoy lo vamos a bordar.']));
      var tiendas = ES_ADM ? Object.keys(d.tiendas) : [tiendaDe(d)];
      if (!tiendas.length) fr.push('Todavía no hay pedidos para hoy. Van entrando a lo largo del día.');
      tiendas.forEach(function (t) {
        var x = d.tiendas[t] || {}, s = sumaTienda(x);
        if (!s.total) { fr.push('En ' + bonito(t) + ' todavía no hay pedidos para hoy. Van entrando a lo largo del día.'); return; }
        fr.push('Hasta ahora en ' + bonito(t) + ' tenemos ' + pedidos(s.total) + ': ' + franjasTxt(x) + '.');
        if (s.listos) fr.push(s.listos === s.total ? '¡Y todos están ya listos para reparto!' : 'De ellos, ' + s.listos + (s.listos === 1 ? ' ya está listo' : ' ya están listos') + ' para reparto.');
      });
      if (!ES_ADM && d.mios && d.mios.length) {
        var ent = d.mios.filter(function (m) { return /ENTREGADO/.test(m.estado); }).length;
        fr.push('Tú ya tienes ' + pedidos(d.mios.length) + ' asignados' + (ent ? ', y ' + ent + ' ya entregados. ¡Así me gusta!' : '.'));
      }
      if (!ES_ADM && ruta && ruta.ok && ruta.pedidos) {
        var enRuta = ruta.pedidos.filter(function (p) { return p.estadoNexo === 'ASIGNADO'; });
        if (enRuta.length) {
          var porT = {};
          enRuta.forEach(function (p) { var k = tramoDia(p.tramo); porT[k] = (porT[k] || 0) + 1; });
          fr.push('De %DIA llevas ' + pedidos(enRuta.length) + ' en tu ruta: ' + lista(Object.keys(porT).map(function (k) { return porT[k] + ' ' + k; })) + '.');
        }
      }
      var crf = crfDeMiTienda(pv[0] && pv[0].ok ? pv[0].clientes || [] : [], d), dd = pv[1] && pv[1].ok ? pv[1].clientes || [] : [];
      if (crf.length || dd.length) {
        var l = [];
        if (crf.length) l.push(crf.length + ' de ' + (ES_ADM ? 'Carrefour' : bonito(tiendaDe(d))) + ', como ' + lista(crf.slice(0, 3).map(function (c) { return corto(c.nombre); })));
        if (dd.length) l.push(dd.length + ' de %DIA, como ' + lista(dd.slice(0, 3).map(function (c) { return corto(c.nombre); })));
        fr.push('Y esperamos hoy clientes de siempre: ' + lista(l) + '.');
      }
      fr.push(una(['¡A por ello, que hoy salimos a ganar! 💪', '¡Mucho ánimo y conduce con cuidado!', '¡Vamos, que tú puedes con todo!']));
      return { titulo: saludo() + ', ' + NOMBRE, frases: fr };
    });
  }

  /** «¿Cómo voy?» (repartidor) o «¿Cómo vamos?» (ADM: la empresa). rep: otro repartidor (lo pide el ADM). */
  function comoVoy(rep, nombreRep) {
    return informe().then(function (D) {
      if (!D) return { titulo: 'No tengo el informe', frases: ['Ahora no puedo leer el informe. Prueba en un momento.'] };
      var quien = rep || (ES_ADM ? null : REP);
      if (quien && D.reps.indexOf(quien) === -1) return { titulo: 'Sin datos', frases: [rep ? (nombreRep || bonito(rep)) + ' todavía no sale en el informe de este período.' : 'Todavía no sales en el informe de este período. ¡En cuanto repartas, aquí te lo cuento!'] };
      var p = produccion(D, quien), fr = [], suNom = rep ? (nombreRep || bonito(rep)) : '';
      if (!p) return { titulo: 'Sin datos', frases: ['Todavía no hay datos de este período.'] };
      if (!quien) fr.push('¡Vamos con el informe de toda la empresa! Llevamos ' + nf(p.total) + ' pedidos en el ' + String(p.act.label).replace(/^Período actual · /, 'período del ') + '.');
      else fr.push((rep ? suNom + ' lleva ' : (p.varPct != null && p.varPct <= -5 ? 'Vamos a ver, ' + NOMBRE + '. Llevas ' : '¡Mira qué bien, ' + NOMBRE + '! Llevas ')) + nf(p.total) + ' pedidos este período, en ' + p.nDias + (p.nDias === 1 ? ' día trabajado.' : ' días trabajados.'));
      if (p.varPct != null) {
        var v = Math.round(p.varPct);
        fr.push(v >= 5 ? '¡Eso es un ' + v + '% más que el período anterior a estas alturas! ¡Va petando! 🚀'
          : v <= -5 ? 'Es un ' + Math.abs(v) + '% menos que el período anterior a estas alturas. ¡Hay margen para remontar!'
          : 'Va igual que el período anterior a estas alturas, muy estable.');
      }
      if (quien && p.media != null && p.mediaFlota) {
        var dif = (p.media - p.mediaFlota) / p.mediaFlota * 100, md = nf(p.media), mf = nf(p.mediaFlota), h = rep ? 'Hace ' : 'Haces ';
        fr.push(dif >= 15 ? h + md + ' pedidos por día, muy por encima de la media de la flota, que es ' + mf + '. ¡' + (rep ? 'Es' : 'Eres') + ' una máquina!'
          : dif >= -8 ? h + md + ' pedidos por día, justo en la media de la flota (' + mf + '). ¡Muy bien!'
          : h + md + ' pedidos por día, un poco por debajo de la media de la flota, que es ' + mf + '. ¡Seguro que lo subimos!');
        if (p.puesto && p.puesto <= 3) fr.push('¡Y ' + (rep ? 'es' : 'eres') + ' el número ' + p.puesto + ' de ' + p.deTantos + ' en pedidos! ¡Enhorabuena!');
      }
      var ts = Object.keys(p.porTienda).sort(function (a, b) { return p.porTienda[b] - p.porTienda[a]; });
      if (ts.length) fr.push('Por tienda: ' + lista(ts.slice(0, 4).map(function (t) { return nf(p.porTienda[t]) + ' en ' + bonito(t); })) + '.');
      if (!quien && p.top.length) fr.push('Los que más reparten: ' + lista(p.top.map(function (x) { return nomRep(x.rep) + ' con ' + nf(x.tot); })) + '. ¡Un aplauso!');
      fr.push(incTxt(incidencias(D, quien, p.act, p.ant, p.n), quien, rep));
      var c = conduccion(D, quien);
      if (c) fr.push(conducTxt(c, quien, rep, nombreRep, true));
      fr.push(quien ? una(['¡Sigue así, que lo estás haciendo genial!', '¡Gracias por el esfuerzo, se nota!', '¡Vamos a por más!']) : '¡Gran trabajo de todo el equipo!');
      return { titulo: quien ? (rep ? 'Informe de ' + suNom : 'Tu informe, ' + NOMBRE) : 'Informe de la empresa', frases: fr };
    });
  }
  function incTxt(inc, quien, rep) {
    var tipos = Object.keys(inc.tipos).sort(function (a, b) { return inc.tipos[b] - inc.tipos[a]; });
    if (!inc.n) return quien ? '¡Y cero incidencias este período! ¡Perfecto!' : '¡Ni una incidencia en el período!';
    var s = (quien ? (rep ? 'Lleva ' : 'Llevas ') : 'Llevamos ') + inc.n + (inc.n === 1 ? ' incidencia' : ' incidencias') + (tipos.length ? ', sobre todo ' + tipos[0] : '');
    if (inc.antes != null) s += inc.n < inc.antes ? ', menos que el período anterior a estas alturas (' + inc.antes + '). ¡Bien hecho!'
      : inc.n > inc.antes ? ', más que el período anterior a estas alturas (' + inc.antes + '). Vamos a cuidarlo.' : ', igual que el período anterior.';
    else s += '.';
    if (inc.abiertas) s += ' ' + inc.abiertas + (inc.abiertas === 1 ? ' sigue abierta.' : ' siguen abiertas.');
    return s;
  }
  function conducTxt(c, quien, rep, nombreRep, breve) {
    if (!quien) {
      var mejor = c.filas[0];
      return 'En conducción, la media de la flota es ' + Math.round(c.mScore) + ' sobre 100, y el mejor es ' + nomRep(mejor.rep) + ' con ' + Math.round(mejor.score) + '. ¡Enhorabuena!';
    }
    var m = c.mia, suNom = rep ? (nombreRep || bonito(rep)) : '';
    if (!m) return rep ? suNom + ' todavía no sale en la hoja de estilo de conducción.' : 'Todavía no sales en la hoja de estilo de conducción.';
    var sc = Math.round(m.score), tips = [], s;
    if (m.acel > c.mAcel * 1.15) tips.push('acelerar más suave al salir de semáforos y rotondas');
    if (m.freno > c.mFreno * 1.15) tips.push('anticipar las frenadas, dejando más distancia con el de delante');
    if (sc >= 90 || c.puesto <= 3) s = (rep ? suNom + ' tiene' : '¡Enhorabuena! Tienes') + ' un ' + sc + ' en conducción: de los mejores de la empresa, el número ' + c.puesto + ' de ' + c.filas.length + '. ¡Qué orgullo!';
    else if (sc >= 75) s = (rep ? suNom + ' tiene un ' + sc + ' en conducción, ' : 'Tu estilo de conducción está en ' + sc + ' sobre 100, ') + (sc >= c.mScore ? 'por encima' : 'cerca') + ' de la media de la flota (' + Math.round(c.mScore) + '). ¡Muy bien!';
    else s = (rep ? suNom + ' va en conducción' : 'Tu conducción va') + ' en ' + sc + ' sobre 100, un poco por debajo de lo normal (la media es ' + Math.round(c.mScore) + ').';
    if (tips.length) s += breve ? ' Un truco: ' + tips[0] + '.' : ' Para mejorar' + (rep ? ', que intente ' : ', intenta ') + lista(tips) + '.';
    else if (!breve && sc < 90) s += ' Conducir suave y con calma sube la nota rapidísimo.';
    return s;
  }
  function soloConduccion(rep, nombreRep) {
    return informe().then(function (D) {
      if (!D) return { titulo: 'No tengo el informe', frases: ['Ahora no puedo leer el informe.'] };
      var quien = rep || (ES_ADM ? null : REP), c = conduccion(D, quien);
      if (!c) return { titulo: 'Conducción', frases: ['Todavía no hay datos de estilo de conducción.'] };
      var fr = [conducTxt(c, quien, rep, nombreRep, false)];
      if (c.periodo) fr.push('Son los datos de la carga del ' + c.periodo + '.');
      if (quien && !rep) fr.push(una(['¡Conduce con cariño, que la furgo y tu espalda lo agradecen!', '¡Seguro y suave, así se llega lejos!']));
      return { titulo: 'Estilo de conducción', frases: fr };
    });
  }
  function soloIncidencias(rep) {
    return informe().then(function (D) {
      if (!D) return { titulo: 'No tengo el informe', frases: ['Ahora no puedo leer el informe.'] };
      var quien = rep || (ES_ADM ? null : REP), act = periodo(D, 'act');
      if (!act) return { titulo: 'Incidencias', frases: ['Todavía no hay datos de este período.'] };
      var n = Math.max(1, difDias(act.ini, hoyLocal()) + 1);
      return { titulo: 'Incidencias', frases: [incTxt(incidencias(D, quien, act, periodo(D, 'ant'), n), quien, rep)] };
    });
  }
  function soloPrevistos() {
    return Promise.all([previstos(), _dia ? Promise.resolve(_dia) : dia()]).then(function (r) {
      var pv = r[0], fr = [];
      var crf = crfDeMiTienda(pv[0] && pv[0].ok ? pv[0].clientes || [] : [], r[1]), dd = pv[1] && pv[1].ok ? pv[1].clientes || [] : [];
      if (!crf.length && !dd.length) return { titulo: 'Clientes previstos', frases: ['Hoy no hay clientes con un hábito claro. ¡Día de sorpresas!'] };
      function grupo(l, pre) { return pre + l.length + (l.length === 1 ? ' cliente: ' : ' clientes: ') + lista(l.slice(0, 6).map(function (c) { return corto(c.nombre); })) + (l.length > 6 ? ' y más' : '') + '.'; }
      if (crf.length) fr.push(grupo(crf, 'De Carrefour esperamos '));
      if (dd.length) fr.push(grupo(dd, 'De %DIA, '));
      fr.push('Los calculo con sus compras de las últimas semanas.');
      return { titulo: 'Clientes previstos para hoy', frases: fr };
    });
  }
  /** «¿Qué hay en el embolsado?» */
  function embolsado() {
    return dia().then(function (d) {
      if (!d || !d.ok) return { titulo: 'Ahora no llego al embolsado', frases: [(d && d.error) || 'Sin conexión.'] };
      var fr = [], tiendas = ES_ADM || d.embolsado ? Object.keys(d.tiendas) : [tiendaDe(d)];
      if (!tiendas.length) fr.push('En el embolsado aún no hay pedidos de hoy.');
      tiendas.forEach(function (t) {
        var x = d.tiendas[t] || {}, s = sumaTienda(x);
        if (!s.total) { fr.push('En el embolsado de ' + bonito(t) + ' aún no hay pedidos de hoy.'); return; }
        var enCaja = Math.max(0, s.conCaja - s.listos), sin = Math.max(0, s.total - Math.max(s.conCaja, s.listos));
        var partes = [s.listos + (s.listos === 1 ? ' listo' : ' listos') + ' para reparto'];
        if (enCaja) partes.push(enCaja + ' en caja preparándose');
        if (sin) partes.push(sin + ' por empezar');
        fr.push('En el embolsado de ' + bonito(t) + ' hay ' + pedidos(s.total) + ' de hoy: ' + lista(partes) + '.');
        var fl = FRANJAS.filter(function (f) { return x[f] && x[f].listos; });
        if (fl.length) fr.push('Listos por franja: ' + lista(fl.map(function (f) { return x[f].listos + ' ' + FR_TXT[f]; })) + '.');
        if (s.asignados) fr.push('Ya hay ' + s.asignados + ' asignados a repartidores' + (s.entregados ? ' y ' + s.entregados + (s.entregados === 1 ? ' entregado' : ' entregados') : '') + '.');
      });
      fr.push(una(['¡El equipo de embolsado está a tope!', '¡Todo va rodando!']));
      return { titulo: 'El embolsado ahora', frases: fr };
    });
  }

  /* ───────────── qué ha pedido ───────────── */
  function sa(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var NO_NOMBRE = /^(como|informe|dime|sobre|esta|estan|para|cual|cuanto|cuantos|pedidos|jessica|conduccion|incidencias|del|las|los|que|tal|hoy|lleva|va|van|vamos|el|la|de|su|sus)$/;
  /** El repartidor del que habla el ADM («informe de Laura», «cómo va wexposito»). */
  function repDe(t) {
    var D = _inf || (leer(CLAVE_INF) || {}).datos, reps = (D && D.reps) || [], us = (_dia && _dia.usuarios) || [];
    var pal = t.split(/[^a-z0-9ñ]+/).filter(function (w) { return w.length > 2 && !NO_NOMBRE.test(w); });
    for (var i = 0; i < reps.length; i++) if (pal.indexOf(sa(reps[i])) !== -1) return { rep: reps[i], nombre: nomRep(reps[i]) };
    for (var j = 0; j < us.length; j++) {
      var nom = sa(us[j].n).split(/\s+/), U = String(us[j].u).toUpperCase();
      if (reps.indexOf(U) !== -1 && pal.some(function (w) { return nom.indexOf(w) !== -1; })) return { rep: U, nombre: bonito(nom[0]) };
    }
    return null;
  }
  /** La intención si la frase es una pregunta de informe; si no, null (y sigue el Embolsado por voz).
      soloParte: el repartidor, que no tiene órdenes de Embolsado (lo que no entienda es «ayuda»). */
  function intencion(frase, soloParte) {
    var t = ' ' + sa(frase).replace(/^\s*(oye |hola )?jessica[, ]*/, '').replace(/[.,:;¿?¡!]/g, ' ').replace(/\s+/g, ' ') + ' ';
    // En el centro de mando, las órdenes de Embolsado mandan: «reserva para hoy de 1 a 4…» no es el parte.
    if (!soloParte && /reserv|caja|nevera|frio|congel|foto|ticket|elimin|borra|quita|cambi|pasa |mueve|confirm|finaliz|list[oa]|hueco|disponib|quedan/.test(t)) return null;
    var rep = ES_ADM && /\b(informe|conduccion|incidencias|pedidos) de \w|\bcomo (va|lleva|esta) \w/.test(t) ? repDe(t) : null;
    if (/conduc|conducir|volante/.test(t)) return { q: 'conduccion', rep: rep };
    if (/incidenc/.test(t) && !/registr|abr[ei]r? una|apunta/.test(t)) return { q: 'incidencias', rep: rep };
    if (/previst|clientes (de hoy|del dia|para hoy|de siempre)|quien (pide|suele)|que clientes/.test(t)) return { q: 'previstos' };
    if (/embolsad/.test(t) && (soloParte || /\b(como|que hay|que tal|resumen|cuantos)\b/.test(t))) return { q: 'embolsado' };
    if (/como (voy|vamos|estoy|estamos|va |lleva |esta )|mi informe|el informe|informe de|cuantos pedidos llevo|que tal (voy|vamos)|la empresa|produccion/.test(t)) return { q: 'informe', rep: rep };
    if (/buen(os|as) (dias|tardes|noches)|que (tenemos|hay|tengo|me toca)( para)? hoy|lo que (hay|tenemos)|para hoy|mi dia|mi ruta|mi parte|el parte|resumen/.test(t)) return { q: 'hoy' };
    return soloParte ? { q: 'ayuda' } : null;
  }
  function responder(i) {
    if (!i) return Promise.resolve(null);
    var rep = i.rep && i.rep.rep, nom = i.rep && i.rep.nombre;
    if (i.q === 'hoy') return parteHoy();
    if (i.q === 'informe' && ES_EMB && !ES_ADM && !rep) return embolsado();   // el embolsador no reparte: su «cómo vamos» es el embolsado
    if (i.q === 'informe') return comoVoy(rep, nom);
    if (i.q === 'conduccion') return soloConduccion(rep, nom);
    if (i.q === 'incidencias') return soloIncidencias(rep);
    if (i.q === 'previstos') return soloPrevistos();
    if (i.q === 'embolsado') return embolsado();
    return Promise.resolve({ titulo: '¿En qué te ayudo?', frases: ['Puedo contarte lo que tenemos hoy, cómo vas este período, tu conducción, tus incidencias, los clientes previstos o cómo va el embolsado. ¡Pregúntame lo que quieras!'] });
  }

  window.JesParte = {
    intencion: intencion, responder: responder, dia: dia,
    franjas: FRANJAS, frTxt: FR_TXT, tiendaDe: tiendaDe, sumaTienda: sumaTienda, bonito: bonito,
    _calc: { produccion: produccion, incidencias: incidencias, conduccion: conduccion }
  };
})();
