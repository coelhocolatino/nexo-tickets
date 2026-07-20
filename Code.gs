// =============================================================================
// NEXO · SAD TICKETS — Code.gs
// =============================================================================
// HOJA: "database" → tabla USUARIOS
//
// La tabla USUARIOS empieza en la columna P (columna 16) de la fila 1:
//   P1: USUARIO | Q1: NOMBRE | R1: ACTIVO | S1: PASSWORD_HASH | T1: NIVEL
//
// Valores de NIVEL:  "admin" | "usuario 1" | "usuario 2"
// Valores de ACTIVO: "SI" o "NO"
// PASSWORD_HASH:     vacío = usuario nuevo (crea contraseña en primer acceso)
//
// COL_USUARIOS_START = 16  ← columna P (1-indexed, como en getRange)
// =============================================================================
//
// IMPORTANTE: Esta versión INTEGRA la autenticación al Apps Script existente.
// Si tu doPost actual tiene lógica para guardar tickets, reemplaza el cuerpo
// de procesarTicket() abajo por esa lógica.
// =============================================================================

// Columna de inicio de la tabla USUARIOS en la hoja "database" (1-indexed)
// P = 16. Cambia este valor si mueves la tabla a otra columna.
var COL_USUARIOS_START = 16;

/* ========================= doGet ========================= */
function doGet(e) {
  try {
    return buildJSON(getListas());
  } catch (err) {
    return buildJSON({ error: err.message });
  }
}

/* ========================= doPost ======================== */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Rutas de autenticación — siempre devuelven JSON
    if (body.accion === 'verificarUsuario') {
      try { return buildJSON(verificarUsuario(body)); }
      catch(err) { return buildJSON({ error: err.message }); }
    }
    if (body.accion === 'login') {
      try { return buildJSON(hacerLogin(body)); }
      catch(err) { return buildJSON({ ok: false, error: err.message }); }
    }
    if (body.accion === 'registrarPassword') {
      try { return buildJSON(registrarPassword(body)); }
      catch(err) { return buildJSON({ ok: false, error: err.message }); }
    }

    // Subida de ticket (comportamiento original)
    return buildText(procesarTicket(body));

  } catch (err) {
    Logger.log('doPost ERROR: ' + err.message + '\n' + err.stack);
    // Si el body tenía accion, devolver JSON de error
    try {
      var b = JSON.parse(e.postData.contents);
      if (b.accion) return buildJSON({ error: err.message });
    } catch(e2) {}
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

  var activo    = esActivo(row.ACTIVO);
  var pwdHash   = String(row.PASSWORD_HASH || '').trim();
  var nombre    = String(row.NOMBRE    || usuario).trim();
  var nivel     = String(row.NIVEL     || 'usuario 1').trim().toLowerCase();
  var tiendaPre = String(row.TIENDA_PRE != null ? row.TIENDA_PRE : '').trim();

  Logger.log('verificarUsuario: usuario=' + usuario + ' activo=' + activo + ' nivel=' + nivel + ' tiendaPre=' + tiendaPre);

  return {
    encontrado: true,
    activo:     activo,
    tienePwd:   pwdHash.length > 0,
    nombre:     nombre,
    usuario:    usuario,
    nivel:      nivel,
    tiendaPre:  tiendaPre
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

  if (!esActivo(row.ACTIVO)) return { ok: false, error: 'Usuario desactivado' };

  var storedHash = String(row.PASSWORD_HASH || '').trim();
  var inputHash  = sha256(pwd);

  if (storedHash !== inputHash) return { ok: false };

  return {
    ok:        true,
    nombre:    String(row.NOMBRE    || usuario).trim(),
    nivel:     String(row.NIVEL     || 'usuario 1').trim().toLowerCase(),
    tiendaPre: String(row.TIENDA_PRE || '').trim(),
    token:     Utilities.getUuid()
  };
}

/**
 * Determina si un valor de la celda ACTIVO significa "activo".
 * Acepta: "SI", "SÍ", "TRUE", "1", true (booleano de Sheets), "ACTIVO", "YES", "S"
 * Rechaza: "NO", "FALSE", "0", false, vacío, cualquier otro valor.
 */
function esActivo(valor) {
  if (valor === true)  return true;   // checkbox marcado en Sheets
  if (valor === false) return false;  // checkbox desmarcado
  if (valor === 1)     return true;
  if (valor === 0)     return false;
  var s = String(valor || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quitar tildes
  return s === 'SI' || s === 'YES' || s === 'TRUE' || s === '1' || s === 'ACTIVO' || s === 'S';
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

  var ss    = getSpreadsheet();
  var sheet = ss.getSheetByName('database');
  if (!sheet) return { ok: false, error: 'Hoja database no encontrada' };

  // Leer encabezados para saber en qué offset está PASSWORD_HASH
  var data   = leerTablaUsuarios(sheet);
  if (data.length === 0) return { ok: false, error: 'Tabla USUARIOS vacía' };
  var header = data[0].map(function(h) { return String(h).trim().toUpperCase(); });

  var colUsuario = header.indexOf('USUARIO');
  var colActivo  = header.indexOf('ACTIVO');
  var colPwd     = header.indexOf('PASSWORD_HASH');  // índice 0-based dentro del rango P..
  var colNombre  = header.indexOf('NOMBRE');
  var colNivel   = header.indexOf('NIVEL');

  if (colPwd === -1) return { ok: false, error: 'Columna PASSWORD_HASH no encontrada' };

  for (var i = 1; i < data.length; i++) {
    var rowUsr = String(data[i][colUsuario] || '').trim().toLowerCase();
    if (rowUsr !== usuario) continue;

    var activo = esActivo(data[i][colActivo]);
    if (!activo) return { ok: false, error: 'Usuario desactivado' };

    var existing = String(data[i][colPwd] || '').trim();
    if (existing.length > 0) return { ok: false, error: 'Este usuario ya tiene contraseña asignada' };

    // Columna real en la hoja = COL_USUARIOS_START + colPwd (ambos 1-indexed y 0-indexed respectivamente)
    // Fila real en la hoja = i + 1 (data[0] es fila 1, data[1] es fila 2, etc.)
    var colHoja = COL_USUARIOS_START + colPwd; // columna real en la hoja (1-indexed)
    var filaHoja = i + 1;                       // fila real en la hoja (1-indexed)

    sheet.getRange(filaHoja, colHoja).setValue(sha256(pwd));

    return {
      ok:        true,
      nombre:    String(data[i][colNombre] || usuario).trim(),
      nivel:     String(data[i][colNivel]  || 'usuario 1').trim().toLowerCase(),
      tiendaPre: String(data[i][header.indexOf('TIENDA_PRE')] || '').trim(),
      token:     Utilities.getUuid()
    };
  }

  return { ok: false, error: 'Usuario no encontrado' };
}

/**
 * Lee la tabla USUARIOS desde la columna COL_USUARIOS_START (P=16).
 * Devuelve un array [fila0_headers, fila1_datos, ...] solo de esas columnas.
 * El número de columnas lo determina la fila de encabezados (hasta que
 * encuentre una celda vacía en la fila 1 a partir de P).
 */
function leerTablaUsuarios(sheet) {
  var lastCol  = sheet.getLastColumn();
  var lastRow  = sheet.getLastRow();
  var numCols  = lastCol - COL_USUARIOS_START + 1;

  if (numCols <= 0 || lastRow < 1) return [];

  // Leer desde P1 hasta el final de los datos
  var range = sheet.getRange(1, COL_USUARIOS_START, lastRow, numCols);
  return range.getValues();
}

/**
 * Busca un usuario en la tabla USUARIOS (columna P en adelante).
 * Devuelve { COLUMNA: valor, _fila: N, _colOffset: N } o null.
 *   _fila      = número de fila en la hoja (1-indexed) → para getRange al escribir
 *   _colOffset = índice 0-based dentro del rango (P=0, Q=1, R=2...)
 */
function encontrarFilaUsuario(usuario) {
  try {
    var ss    = getSpreadsheet();
    var sheet = ss.getSheetByName('database');
    if (!sheet) {
      Logger.log('encontrarFilaUsuario: hoja database no encontrada');
      return null;
    }

    var data   = leerTablaUsuarios(sheet);
    if (data.length === 0) {
      Logger.log('encontrarFilaUsuario: tabla USUARIOS vacía');
      return null;
    }

    var header = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
    var colUsuario = header.indexOf('USUARIO');
    if (colUsuario === -1) {
      Logger.log('encontrarFilaUsuario: columna USUARIO no encontrada. Headers: ' + JSON.stringify(header));
      return null;
    }

    for (var i = 1; i < data.length; i++) {
      var rowUsr = String(data[i][colUsuario] || '').trim().toLowerCase();
      if (rowUsr === '' ) continue; // saltar filas vacías
      if (rowUsr === usuario) {
        var obj = { _fila: i + 1 };
        header.forEach(function(h, idx) { obj[h] = data[i][idx]; });
        return obj;
      }
    }
    return null;
  } catch(err) {
    Logger.log('encontrarFilaUsuario ERROR: ' + err.message);
    return null;
  }
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

    var ss     = getSpreadsheet();
    var sheet  = ss.getSheetByName('tickets') || ss.getSheets()[0];

    var fecha       = String(body.fecha      || '').trim();
    var tienda      = String(body.tienda     || '').trim();
    var repartidor  = String(body.repartidor || '').trim().toUpperCase();
    var franja      = String(body.franja     || '').trim();
    var pedidos     = Number(body.pedidos)   || 0;
    var dobles      = Number(body.dobles)    || 0;
    var xr          = Number(body.xr)        || 0;
    var km          = Number(body.km)        || 0;
    var imagen      = body.imagenBase64      || '';
    var usuarioLogin= body.usuarioSesion || '';
    var timestamp   = new Date();

    // Subir imagen a Drive (REEMPLAZA con tu lógica real)
 if (!imagen) {
      return 'ERROR: imagen vacía';
    }

    // 1. Calcular el nombre de la carpeta del periodo (ej: 2026.MAY)
    var mesInfo = calcularMesOperativo(fecha, tienda);
    Logger.log('Periodo: ' + mesInfo.nombreCarpeta);

    // 2. Generar nombre del archivo
    var nombreArchivo = generarNombreArchivo(body);

    // 3. Decodificar imagen
    var base64Data = imagen.indexOf(',') !== -1 ? imagen.split(',')[1] : imagen;
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      'image/jpeg',
      nombreArchivo
    );

    // 4. Subir a Drive — Raíz → Periodo → Repartidor
    var carpetaPeriodo    = obtenerOCrearCarpeta(DRIVE_ROOT_ID, mesInfo.nombreCarpeta);
    var carpetaRepartidor = obtenerOCrearCarpeta(carpetaPeriodo.getId(), repartidor);

    var file = carpetaRepartidor.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    Logger.log('Subido: ' + nombreArchivo);
    return 'OK | ' + tienda + ' | ' + repartidor + ' | P:' + pedidos;

  } catch (err) {
    Logger.log('procesarTicket ERROR: ' + err.message + '\n' + err.stack);
    return 'ERROR: ' + err.message;
  }
}

/* =============================================================
   DIAGNÓSTICO — ejecutar manualmente desde Apps Script Editor
   para ver exactamente qué lee la hoja.
   Ejecuta esta función y revisa los logs (Ver → Registros).
   ============================================================= */
function diagnosticarUsuarios() {
  var ss    = getSpreadsheet();
  var sheet = ss.getSheetByName('database');

  Logger.log('=== DIAGNÓSTICO TABLA USUARIOS ===');
  Logger.log('COL_USUARIOS_START = ' + COL_USUARIOS_START + ' (columna ' + columnLetter(COL_USUARIOS_START) + ')');
  Logger.log('Última columna hoja: ' + sheet.getLastColumn() + ' (' + columnLetter(sheet.getLastColumn()) + ')');
  Logger.log('Última fila hoja: ' + sheet.getLastRow());

  var data = leerTablaUsuarios(sheet);
  if (data.length === 0) { Logger.log('ERROR: leerTablaUsuarios devolvió vacío'); return; }

  var header = data[0].map(function(h) { return String(h).trim().toUpperCase(); });

  Logger.log('--- ENCABEZADOS LEÍDOS ---');
  data[0].forEach(function(h, i) {
    Logger.log('  [' + i + '] col ' + columnLetter(COL_USUARIOS_START + i) + ' → "' + h + '"');
  });

  // Verificar columnas críticas
  Logger.log('--- COLUMNAS CRÍTICAS ---');
  Logger.log('  USUARIO idx=' + header.indexOf('USUARIO'));
  Logger.log('  NOMBRE idx='  + header.indexOf('NOMBRE'));
  Logger.log('  ACTIVO idx='  + header.indexOf('ACTIVO'));
  Logger.log('  PASSWORD_HASH idx=' + header.indexOf('PASSWORD_HASH'));
  Logger.log('  NIVEL idx='   + header.indexOf('NIVEL'));
  Logger.log('  TIENDA_PRE idx=' + header.indexOf('TIENDA_PRE'));

  Logger.log('--- FILAS DE DATOS ---');
  for (var r = 1; r < data.length; r++) {
    var fila = data[r];
    var usuario  = fila[header.indexOf('USUARIO')]   || '';
    var activo   = fila[header.indexOf('ACTIVO')]    || '';
    var nivel    = fila[header.indexOf('NIVEL')]     || '';
    var tiendaPre= header.indexOf('TIENDA_PRE') !== -1 ? fila[header.indexOf('TIENDA_PRE')] : 'COL_NO_EXISTE';
    Logger.log('  Fila ' + (r+1) + ': usuario="' + usuario + '" activo="' + activo + '" nivel="' + nivel + '" tiendaPre="' + tiendaPre + '"');
  }
  Logger.log('=== FIN DIAGNÓSTICO ===');
}

/* =============================================================
   TEST RÁPIDO — ejecutar desde Apps Script Editor
   Simula exactamente lo que hace el login.html
   ============================================================= */
function testVerificarUsuario() {
  var body = { accion: 'verificarUsuario', usuario: 'wcoelho' };
  Logger.log('=== TEST verificarUsuario ===');
  Logger.log('Input: ' + JSON.stringify(body));
  try {
    var resultado = verificarUsuario(body);
    Logger.log('Resultado: ' + JSON.stringify(resultado));
  } catch(err) {
    Logger.log('EXCEPCION: ' + err.message + '\n' + err.stack);
  }
  Logger.log('=== FIN TEST ===');
}

function testDoPost() {
  // Simula un POST de verificarUsuario
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({ accion: 'verificarUsuario', usuario: 'wcoelho' })
    }
  };
  Logger.log('=== TEST doPost ===');
  try {
    var resp = doPost(fakeEvent);
    Logger.log('Respuesta: ' + resp.getContent());
  } catch(err) {
    Logger.log('EXCEPCION en doPost: ' + err.message + '\n' + err.stack);
  }
  Logger.log('=== FIN TEST doPost ===');
}

function columnLetter(col) {
  var letter = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/* =============================================================
   LISTAS — leen de database!A3, E3, G3
   Columnas:
     A (col 1) = Tiendas
     E (col 5) = Repartidores
     G (col 7) = Franja Horaria
   Las listas empiezan en la fila 4 (fila 3 = encabezados: TIENDAS, REPARTIDORES, FRANJA HORARIA).
   ============================================================= */
var SS_ID = '19bqTde5-Yf6P7B6IkcJ2tkb_xM9lH9hvSlR6LFvm_TY';

function getSpreadsheet() {
  // Intenta por ID primero, luego getActive como fallback
  try {
    return SpreadsheetApp.openById(SS_ID);
  } catch(e) {
    Logger.log('openById falló: ' + e.message + ' — usando getActiveSpreadsheet');
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getListas() {
  try {
    var ss    = getSpreadsheet();
    var sheet = ss.getSheetByName('database');

    if (!sheet) {
      Logger.log('ERROR getListas: hoja "database" no encontrada. Hojas disponibles: ' +
        ss.getSheets().map(function(s){ return s.getName(); }).join(', '));
      return { tiendas: [], repartidores: [], franjas: [] };
    }

    var lastRow = sheet.getLastRow();
    Logger.log('getListas: lastRow=' + lastRow);
    if (lastRow < 3) {
      Logger.log('getListas: lastRow < 4, no hay datos');
      return { tiendas: [], repartidores: [], franjas: [] };
    }

    var numRows = lastRow - 3; // filas desde la 4 hasta el final (fila 3 = encabezados)
    if (numRows < 1) {
      Logger.log('getListas: no hay datos desde fila 4');
      return { tiendas: [], repartidores: [], franjas: [] };
    }

    var colTiendas      = sheet.getRange(4, 1, numRows, 1).getValues(); // A4:A
    var colRepartidores = sheet.getRange(4, 5, numRows, 1).getValues(); // E4:E
    var colFranjas      = sheet.getRange(4, 7, numRows, 1).getValues(); // G4:G

    function extraer(col) {
      return col.map(function(r) { return String(r[0] || '').trim(); })
                .filter(function(v) { return v.length > 0; });
    }

    var resultado = {
      tiendas:      extraer(colTiendas),
      repartidores: extraer(colRepartidores),
      franjas:      extraer(colFranjas)
    };

    Logger.log('getListas OK: tiendas=' + resultado.tiendas.length +
      ' repartidores=' + resultado.repartidores.length +
      ' franjas=' + resultado.franjas.length);

    return resultado;

  } catch(err) {
    Logger.log('getListas EXCEPCION: ' + err.message);
    return { tiendas: [], repartidores: [], franjas: [] };
  }
}

/* Diagnóstico de listas — ejecutar manualmente en Apps Script Editor */
function diagnosticarListas() {
  Logger.log('=== DIAGNÓSTICO LISTAS ===');
  Logger.log('SS_ID: ' + SS_ID);

  try {
    var ss = getSpreadsheet();
    Logger.log('Spreadsheet nombre: ' + ss.getName());
    Logger.log('Hojas: ' + ss.getSheets().map(function(s){ return '"' + s.getName() + '"'; }).join(', '));

    var sheet = ss.getSheetByName('database');
    if (!sheet) { Logger.log('ERROR: hoja "database" no encontrada'); return; }

    Logger.log('lastRow: ' + sheet.getLastRow() + ' | lastCol: ' + sheet.getLastColumn());

    // Mostrar filas 1 a 5 para referencia
    for (var r = 1; r <= Math.min(5, sheet.getLastRow()); r++) {
      var row = sheet.getRange(r, 1, 1, Math.min(10, sheet.getLastColumn())).getValues()[0];
      Logger.log('Fila ' + r + ': ' + JSON.stringify(row));
    }

    var listas = getListas();
    Logger.log('--- RESULTADO ---');
    Logger.log('Tiendas (' + listas.tiendas.length + '): ' + JSON.stringify(listas.tiendas.slice(0,5)));
    Logger.log('Repartidores (' + listas.repartidores.length + '): ' + JSON.stringify(listas.repartidores.slice(0,5)));
    Logger.log('Franjas (' + listas.franjas.length + '): ' + JSON.stringify(listas.franjas.slice(0,5)));

  } catch(e) {
    Logger.log('EXCEPCION: ' + e.message);
  }
  Logger.log('=== FIN ===');
}
