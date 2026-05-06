// =============================================================================
// NEXO · SAD TICKETS — Code.gs
// =============================================================================
// HOJA: "database" → tabla USUARIOS
// Columnas (fila 1):
//   USUARIO | NOMBRE | ACTIVO | PASSWORD_HASH | NIVEL
// Valores de NIVEL: "admin" | "usuario 1" | "usuario 2"
// Valores de ACTIVO: "SI" o "NO"
// =============================================================================
//
// IMPORTANTE: Esta versión INTEGRA la autenticación al Apps Script existente.
// Si tu doPost actual tiene lógica para guardar tickets, reemplaza el cuerpo
// de procesarTicket() abajo por esa lógica.
// =============================================================================

/* ========================= doGet ========================= */
function doGet(e) {
  try {
    var data = {
      tiendas:      getTiendas(),
      repartidores: getRepartidores(),
      franjas:      getFranjas()
    };
    return buildJSON(data);
  } catch (err) {
    return buildJSON({ error: err.message });
  }
}

/* ========================= doPost ======================== */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Rutas de autenticación
    if (body.accion === 'verificarUsuario')   return buildJSON(verificarUsuario(body));
    if (body.accion === 'login')              return buildJSON(hacerLogin(body));
    if (body.accion === 'registrarPassword')  return buildJSON(registrarPassword(body));

    // Subida de ticket (comportamiento original)
    return buildText(procesarTicket(body));

  } catch (err) {
    Logger.log('doPost ERROR: ' + err.message + '\n' + err.stack);
    return buildText('ERROR: ' + err.message);
  }
}

/* ========================= helpers de respuesta ========== */
function buildJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function buildText(str) {
  return ContentService
    .createTextOutput(String(str))
    .setMimeType(ContentService.MimeType.TEXT);
}

/* =============================================================
   AUTENTICACIÓN
   ============================================================= */

/**
 * Verifica si el usuario existe y está activo.
 * Devuelve: { encontrado, activo, tienePwd, nombre, usuario, nivel }
 */
function verificarUsuario(body) {
  var usuario = String(body.usuario || '').trim().toLowerCase();
  if (!usuario) return { error: 'Usuario vacío' };

  var row = encontrarFilaUsuario(usuario);
  if (!row) return { encontrado: false };

  var activo  = String(row.ACTIVO  || '').trim().toUpperCase() === 'SI';
  var pwdHash = String(row.PASSWORD_HASH || '').trim();
  var nombre  = String(row.NOMBRE  || usuario).trim();
  var nivel   = String(row.NIVEL   || 'usuario 1').trim().toLowerCase();

  return {
    encontrado: true,
    activo:     activo,
    tienePwd:   pwdHash.length > 0,
    nombre:     nombre,
    usuario:    usuario,
    nivel:      nivel
  };
}

/**
 * Login: verifica contraseña.
 * Devuelve: { ok, nombre, nivel, token } | { ok: false, error? }
 */
function hacerLogin(body) {
  var usuario = String(body.usuario || '').trim().toLowerCase();
  var pwd     = String(body.password || '');
  if (!usuario || !pwd) return { ok: false, error: 'Datos incompletos' };

  var row = encontrarFilaUsuario(usuario);
  if (!row) return { ok: false, error: 'Usuario no encontrado' };

  var activo = String(row.ACTIVO || '').trim().toUpperCase() === 'SI';
  if (!activo) return { ok: false, error: 'Usuario desactivado' };

  var storedHash = String(row.PASSWORD_HASH || '').trim();
  var inputHash  = sha256(pwd);

  if (storedHash !== inputHash) return { ok: false };

  return {
    ok:     true,
    nombre: String(row.NOMBRE || usuario).trim(),
    nivel:  String(row.NIVEL  || 'usuario 1').trim().toLowerCase(),
    token:  Utilities.getUuid()
  };
}

/**
 * Registra contraseña para usuario nuevo (sin hash en la hoja).
 * Devuelve: { ok, nombre, nivel, token } | { ok: false, error }
 */
function registrarPassword(body) {
  var usuario = String(body.usuario || '').trim().toLowerCase();
  var pwd     = String(body.password || '');
  if (!usuario || !pwd) return { ok: false, error: 'Datos incompletos' };
  if (pwd.length < 6)   return { ok: false, error: 'Contraseña demasiado corta' };

  var ss     = SpreadsheetApp.openById('19bqTde5-Yf6P7B6IkcJ2tkb_xM9lH9hvSlR6LFvm_TY');
  var sheet  = ss.getSheetByName('database');
  var data   = sheet.getDataRange().getValues();
  var header = data[0].map(function(h) { return String(h).trim().toUpperCase(); });

  var colUsuario = header.indexOf('USUARIO');
  var colActivo  = header.indexOf('ACTIVO');
  var colPwd     = header.indexOf('PASSWORD_HASH');
  var colNombre  = header.indexOf('NOMBRE');
  var colNivel   = header.indexOf('NIVEL');

  for (var i = 1; i < data.length; i++) {
    var rowUsr = String(data[i][colUsuario] || '').trim().toLowerCase();
    if (rowUsr !== usuario) continue;

    var activo = String(data[i][colActivo] || '').trim().toUpperCase() === 'SI';
    if (!activo) return { ok: false, error: 'Usuario desactivado' };

    var existing = String(data[i][colPwd] || '').trim();
    if (existing.length > 0) return { ok: false, error: 'Este usuario ya tiene contraseña asignada' };

    sheet.getRange(i + 1, colPwd + 1).setValue(sha256(pwd));

    return {
      ok:     true,
      nombre: String(data[i][colNombre] || usuario).trim(),
      nivel:  String(data[i][colNivel]  || 'usuario 1').trim().toLowerCase(),
      token:  Utilities.getUuid()
    };
  }

  return { ok: false, error: 'Usuario no encontrado' };
}

/**
 * Busca un usuario en la hoja "database" (búsqueda case-insensitive).
 * Devuelve un objeto { COLUMNA: valor } o null.
 */
function encontrarFilaUsuario(usuario) {
  var ss     = SpreadsheetApp.openById('19bqTde5-Yf6P7B6IkcJ2tkb_xM9lH9hvSlR6LFvm_TY');
  var sheet  = ss.getSheetByName('database');
  if (!sheet) throw new Error('Hoja "database" no encontrada');

  var data   = sheet.getDataRange().getValues();
  var header = data[0].map(function(h) { return String(h).trim().toUpperCase(); });

  var colUsuario = header.indexOf('USUARIO');
  if (colUsuario === -1) throw new Error('Columna USUARIO no encontrada en hoja database');

  for (var i = 1; i < data.length; i++) {
    var rowUsr = String(data[i][colUsuario] || '').trim().toLowerCase();
    if (rowUsr === usuario) {
      var obj = {};
      header.forEach(function(h, idx) { obj[h] = data[i][idx]; });
      return obj;
    }
  }
  return null;
}

/* ---- SHA-256 ---- */
function sha256(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    text,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/* =============================================================
   PROCESAMIENTO DE TICKET
   ⚠️  REEMPLAZA EL CUERPO DE ESTA FUNCIÓN POR TU LÓGICA ACTUAL
   (la que tienes en tu Apps Script subiendo fotos a Drive y
    guardando filas en la hoja de tickets).
   ============================================================= */
function procesarTicket(body) {
  try {
    // ---- AQUÍ VA TU CÓDIGO ORIGINAL DE TICKETS ----
    // Datos disponibles en `body`:
    //   body.fecha, body.tienda, body.repartidor, body.franja
    //   body.pedidos, body.dobles, body.xr, body.km, body.obs
    //   body.imagenBase64, body.usuarioSesion, body.nivelSesion

    var ss     = SpreadsheetApp.openById('19bqTde5-Yf6P7B6IkcJ2tkb_xM9lH9hvSlR6LFvm_TY');
    var sheet  = ss.getSheetByName('tickets') || ss.getSheets()[0];

    var fecha       = body.fecha       || '';
    var tienda      = body.tienda      || '';
    var repartidor  = body.repartidor  || '';
    var franja      = body.franja      || '';
    var pedidos     = body.pedidos     || 0;
    var dobles      = body.dobles      || 0;
    var xr          = body.xr          || 0;
    var km          = body.km          || 0;
    var obs         = body.obs         || '';
    var imagen      = body.imagenBase64|| '';
    var usuarioLogin= body.usuarioSesion || '';
    var timestamp   = new Date();

    // Subir imagen a Drive (REEMPLAZA con tu lógica real)
    var imageUrl = '';
    if (imagen) {
      try {
        var base64Data = imagen.split(',')[1] || imagen;
        var blob = Utilities.newBlob(
          Utilities.base64Decode(base64Data),
          'image/jpeg',
          'ticket_' + fecha + '_' + repartidor + '_' + Date.now() + '.jpg'
        );
        var folderId = 'TU_FOLDER_ID_AQUI'; // ← CAMBIAR por tu folder real
        var folder = DriveApp.getFolderById(folderId);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        imageUrl = file.getUrl();
      } catch (driveErr) {
        Logger.log('Drive error: ' + driveErr.message);
      }
    }

    sheet.appendRow([
      timestamp,
      fecha,
      tienda,
      repartidor,
      franja,
      Number(pedidos),
      Number(dobles),
      Number(xr),
      Number(km),
      obs,
      imageUrl,
      usuarioLogin
    ]);

    return 'OK | ' + tienda + ' | ' + repartidor + ' | P:' + pedidos;

  } catch (err) {
    Logger.log('procesarTicket ERROR: ' + err.message);
    return 'ERROR: ' + err.message;
  }
}

/* =============================================================
   LISTAS — adaptar a tu hoja real
   ============================================================= */
function getTiendas()      { return getColumna('config', 'TIENDAS'); }
function getRepartidores() { return getColumna('config', 'REPARTIDORES'); }
function getFranjas()      { return getColumna('config', 'FRANJAS'); }

function getColumna(sheetName, colHeader) {
  try {
    var ss     = SpreadsheetApp.openById('19bqTde5-Yf6P7B6IkcJ2tkb_xM9lH9hvSlR6LFvm_TY');
    var sheet  = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data   = sheet.getDataRange().getValues();
    var header = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
    var col    = header.indexOf(colHeader);
    if (col === -1) return [];
    return data.slice(1)
      .map(function(r) { return String(r[col] || '').trim(); })
      .filter(function(v) { return v.length > 0; });
  } catch(e) {
    return [];
  }
}
