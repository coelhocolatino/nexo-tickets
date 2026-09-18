// =============================================================================
// NEXO · SAD TICKETS — Code.gs
// =============================================================================
// SPREADSHEET DE DATOS: SS_ID (ver más abajo, junto a getSpreadsheet())
//   → HOJA "USUARIOS": tabla de usuarios, empieza en columna A, fila 1 = encabezados
//       A1: USUARIO | B1: NOMBRE | C1: ACTIVO | D1: PASSWORD_HASH | E1: NIVEL |
//       F1: TIENDA_PRE | G1: MODULO RESERVAS | H1: DEPARTAMENTO | I1: CORREO |
//       J1: TELEFONO | K1: MATRICULA_PRE
//   → HOJA "TIENDAS": tabla de tiendas, empieza en columna A, fila 1 = encabezados
//       A1: TIENDAS | B1: FECHA INICIO | C1: FECHA FIN | D1..: FRANJAS HORARIAS
//       (hasta 4 franjas por tienda, una por columna; celdas vacías se ignoran)
//
// Valores de NIVEL: "admin" | "usuario 1" | "usuario 2" | "usuario 3"
// Valores de ACTIVO: "SI" o "NO"
// PASSWORD_HASH:     vacío = usuario nuevo (crea contraseña en primer acceso)
//
// COL_USUARIOS_START = 1  ← columna A (1-indexed, como en getRange)
// =============================================================================
//
// IMPORTANTE: Esta versión INTEGRA la autenticación al Apps Script existente.
// Si tu doPost actual tiene lógica para guardar tickets, reemplaza el cuerpo
// de procesarTicket() abajo por esa lógica.
// =============================================================================

// Columna de inicio de la tabla USUARIOS en la hoja "USUARIOS" (1-indexed)
// A = 1. Cambia este valor si mueves la tabla a otra columna.
var COL_USUARIOS_START = 1;

/* ========================= doGet ========================= */
function doGet(e) {
  try {
    return buildJSON(getListas());
  } catch (err) {
    return buildJSON({ error: err.message });
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
  var sheet = ss.getSheetByName('USUARIOS');
  if (!sheet) return { ok: false, error: 'Hoja USUARIOS no encontrada' };

  // Leer encabezados para saber en qué offset está PASSWORD_HASH
  var data   = leerTablaUsuarios(sheet);
  if (data.length === 0) return { ok: false, error: 'Tabla USUARIOS vacía' };
  var header = data[0].map(function(h) { return String(h).trim().toUpperCase(); });

  var colUsuario = header.indexOf('USUARIO');
  var colActivo  = header.indexOf('ACTIVO');
  var colPwd     = header.indexOf('PASSWORD_HASH');  // índice 0-based dentro del rango leído
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

  // Leer desde la columna de inicio hasta el final de los datos
  var range = sheet.getRange(1, COL_USUARIOS_START, lastRow, numCols);
  return range.getValues();
}

/* =============================================================
   SPREADSHEET DE DATOS
   Contiene las hojas "USUARIOS" y "TIENDAS".
   ============================================================= */
var SS_ID = '1n22xieMU7usBigmDwN4i5agSpDM-eCmCRlj6pj68Zx4';

function getSpreadsheet() {
  // Intenta por ID primero, luego getActive como fallback
  try {
    return SpreadsheetApp.openById(SS_ID);
  } catch(e) {
    Logger.log('openById falló: ' + e.message + ' — usando getActiveSpreadsheet');
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

/**
 * Busca un usuario en la tabla USUARIOS (columna A en adelante).
 * Devuelve { COLUMNA: valor, _fila: N, _colOffset: N } o null.
 *   _fila      = número de fila en la hoja (1-indexed) → para getRange al escribir
 *   _colOffset = índice 0-based dentro del rango (A=0, B=1, C=2...)
 */
function encontrarFilaUsuario(usuario) {
  try {
    var ss    = getSpreadsheet();
    var sheet = ss.getSheetByName('USUARIOS');
    if (!sheet) {
      Logger.log('encontrarFilaUsuario: hoja USUARIOS no encontrada');
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
   DIAGNÓSTICO — ejecutar manualmente desde Apps Script Editor
   para ver exactamente qué lee la hoja.
   Ejecuta esta función y revisa los logs (Ver → Registros).
   ============================================================= */
function diagnosticarUsuarios() {
  var ss    = getSpreadsheet();
  var sheet = ss.getSheetByName('USUARIOS');

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
   LISTAS — leen de la hoja "TIENDAS" (tiendas + sus franjas) y
   de la hoja "USUARIOS" (repartidores activos, depto. REPARTO).

   Hoja "TIENDAS" (fila 1 = encabezados, datos desde la fila 2):
     A = TIENDAS | B = FECHA INICIO | C = FECHA FIN | D..= FRANJAS HORARIAS
   (hasta 4 franjas por tienda; columnas vacías se ignoran)

   NOTA: FECHA INICIO / FECHA FIN se leen aquí solo para referencia futura;
   no se usan para restringir franjas (esa lógica va por hora, ver index.html).
   Si en el futuro hacen falta para otra cosa (p.ej. el mes operativo),
   se pueden añadir a la respuesta sin tocar el resto de esta función.
   ============================================================= */

// Resultado cacheado 5 minutos: las tiendas/franjas/repartidores casi nunca
// cambian de un minuto a otro, y así evitamos reabrir la hoja en cada carga.
var LISTAS_CACHE_KEY = 'nexo_listas_v2';
var LISTAS_CACHE_TTL_SEG = 300; // 5 minutos

function getListas() {
  try {
    var cache = CacheService.getScriptCache();
    var cacheado = cache.get(LISTAS_CACHE_KEY);
    if (cacheado) return JSON.parse(cacheado);

    var ss    = getSpreadsheet();
    var sheet = ss.getSheetByName('TIENDAS');

    if (!sheet) {
      Logger.log('ERROR getListas: hoja "TIENDAS" no encontrada. Hojas disponibles: ' +
        ss.getSheets().map(function(s){ return s.getName(); }).join(', '));
      return { tiendas: [], repartidores: [], franjasPorTienda: {} };
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) {
      Logger.log('getListas: hoja TIENDAS sin datos (lastRow=' + lastRow + ')');
      return { tiendas: [], repartidores: [], franjasPorTienda: {} };
    }

    var numRows = lastRow - 1; // datos desde la fila 2 (fila 1 = encabezados)
    var data    = sheet.getRange(2, 1, numRows, lastCol).getValues();

    var tiendas = [];
    var franjasPorTienda = {};
    data.forEach(function(row) {
      var nombre = String(row[0] || '').trim();
      if (!nombre) return;
      tiendas.push(nombre);
      var franjas = [];
      for (var c = 3; c < row.length; c++) { // columna D (idx 3) en adelante
        var v = String(row[c] || '').trim();
        if (v) franjas.push(v);
      }
      franjasPorTienda[nombre] = franjas;
    });

    var resultado = {
      tiendas:          tiendas,
      repartidores:     getRepartidoresActivos(),
      franjasPorTienda: franjasPorTienda
    };

    Logger.log('getListas OK: tiendas=' + resultado.tiendas.length +
      ' repartidores=' + resultado.repartidores.length);

    cache.put(LISTAS_CACHE_KEY, JSON.stringify(resultado), LISTAS_CACHE_TTL_SEG);
    return resultado;

  } catch(err) {
    Logger.log('getListas EXCEPCION: ' + err.message);
    return { tiendas: [], repartidores: [], franjasPorTienda: {} };
  }
}

/**
 * Repartidores = usuarios activos de la hoja USUARIOS con DEPARTAMENTO = REPARTO.
 * Devuelve sus NOMBRE (o USUARIO si NOMBRE está vacío).
 */
function getRepartidoresActivos() {
  try {
    var ss    = getSpreadsheet();
    var sheet = ss.getSheetByName('USUARIOS');
    if (!sheet) return [];

    var data = leerTablaUsuarios(sheet);
    if (data.length === 0) return [];

    var header     = data[0].map(function(h) { return String(h).trim().toUpperCase(); });
    var colUsuario = header.indexOf('USUARIO');
    var colNombre  = header.indexOf('NOMBRE');
    var colActivo  = header.indexOf('ACTIVO');
    var colDepto   = header.indexOf('DEPARTAMENTO');

    var out = [];
    for (var i = 1; i < data.length; i++) {
      if (!esActivo(data[i][colActivo])) continue;
      var depto = String(colDepto !== -1 ? data[i][colDepto] : '').trim().toUpperCase();
      if (depto !== 'REPARTO') continue;
      var nombre = String((colNombre !== -1 ? data[i][colNombre] : '') || data[i][colUsuario] || '').trim();
      if (nombre) out.push(nombre);
    }
    return out;
  } catch(err) {
    Logger.log('getRepartidoresActivos EXCEPCION: ' + err.message);
    return [];
  }
}

/* Invalida la caché de listas — ejecutar manualmente si acabas de editar
   la hoja TIENDAS o USUARIOS y no quieres esperar a que caduque sola (5 min). */
function limpiarCacheListas() {
  CacheService.getScriptCache().remove(LISTAS_CACHE_KEY);
  Logger.log('Caché de listas eliminada.');
}

/* Diagnóstico de listas — ejecutar manualmente en Apps Script Editor */
function diagnosticarListas() {
  Logger.log('=== DIAGNÓSTICO LISTAS ===');
  Logger.log('SS_ID: ' + SS_ID);

  try {
    var ss = getSpreadsheet();
    Logger.log('Spreadsheet nombre: ' + ss.getName());
    Logger.log('Hojas: ' + ss.getSheets().map(function(s){ return '"' + s.getName() + '"'; }).join(', '));

    var sheet = ss.getSheetByName('TIENDAS');
    if (!sheet) { Logger.log('ERROR: hoja "TIENDAS" no encontrada'); return; }

    Logger.log('lastRow: ' + sheet.getLastRow() + ' | lastCol: ' + sheet.getLastColumn());

    // Mostrar filas 1 a 5 para referencia
    for (var r = 1; r <= Math.min(5, sheet.getLastRow()); r++) {
      var row = sheet.getRange(r, 1, 1, Math.min(10, sheet.getLastColumn())).getValues()[0];
      Logger.log('Fila ' + r + ': ' + JSON.stringify(row));
    }

    limpiarCacheListas(); // para que el diagnóstico siempre lea datos frescos
    var listas = getListas();
    Logger.log('--- RESULTADO ---');
    Logger.log('Tiendas (' + listas.tiendas.length + '): ' + JSON.stringify(listas.tiendas.slice(0,5)));
    Logger.log('Repartidores (' + listas.repartidores.length + '): ' + JSON.stringify(listas.repartidores.slice(0,5)));
    Logger.log('Franjas por tienda (muestra): ' + JSON.stringify(listas.tiendas.slice(0,3).reduce(function(acc, t) {
      acc[t] = listas.franjasPorTienda[t]; return acc;
    }, {})));

  } catch(e) {
    Logger.log('EXCEPCION: ' + e.message);
  }
  Logger.log('=== FIN ===');
}
