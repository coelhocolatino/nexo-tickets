# Referencia técnica — NEXO APP

Actualizado: 2026-09-22

## Repositorio
- GitHub: https://github.com/coelhocolatino/nexo-tickets
- Nota: el `Code.gs` del repo (rama main) es una versión adelantada/incompleta de la migración de NEXO SCRIPT — ya apuntaba a la planilla nueva (TIENDAS/USUARIOS) y calculaba `franjasPorTienda`, pero le faltaban `doPost` (login) y `procesarTicket` (subida de fotos). No se desplegó tal cual; se fusionó a mano con la lógica de login/tickets del script en producción. Ver `codigo-nexo-script.md` para el resultado final ya confirmado en producción.
- `index.html` (formulario de tickets), `login.html`, `reservas.html` e `informe.html` viven en este repo (GitHub Pages), no en Apps Script — a diferencia de los Code.gs, este repo ya es su control de versiones, así que no se replica el código completo en la documentación del proyecto salvo fragmentos puntuales relevantes a un bug.
- **Archivos "muertos" en el repo, no usados por la app en producción** (verificado 2026-09-22): `app.js`, `package.json`, `package-lock.json`. Son restos de un scaffolding de un backend Node/Express (`import ticketRoutes from "./routes/tickets.js"`) que ya no existe en el repo (`routes/` no está) y que no interviene en el flujo real de la PWA — todo el tráfico real va directo del frontend estático a los 3 backends de Apps Script vía el proxy de Cloudflare. No hace falta tocarlos, pero si algún día se limpia el repo, se pueden borrar sin romper nada.
- **2026-09-22**: se agregó `informe.html` (página nueva) — ver sección "Feature Informe" más abajo. **Confirmado subido al repo** (verificado directamente en GitHub el 2026-09-22, junto con `index.html`, `login.html` y `boton_informe.png` ya actualizados/presentes en `main`).
- `README.md` del repo está **desactualizado** (seguía en la versión 2.5, con la planilla vieja y sin login biométrico, reservas, idempotencia ni informe) — reescrito completo el 2026-09-22, entregado a Wanderson en el chat, pendiente que lo suba a GitHub reemplazando el actual.

## Bug confirmado y resuelto 2026-09-21 — repartidor "WILLIAN" en vez de "WEXPOSITO"

**Síntoma**: tickets de WEXPOSITO a veces se subían con el archivo/carpeta nombrados "WILLIAN" en Drive, a pesar de que ese usuario no existe en la hoja USUARIOS.

**Causa raíz confirmada** (login.html — biometría/huella):
- WEXPOSITO (nombre real: Willian-Brynner Exposito dos Santos) existía como usuario con NOMBRE="WILLIAN" en la primera versión de la app. En actualizaciones posteriores esa cuenta se renombró a NOMBRE="WEXPOSITO" en la hoja USUARIOS (confirmado por Wanderson).
- `login.html` tiene un login biométrico (huella/Face ID) además del login con contraseña. Al activarlo (`activarBiometria()`), guarda en `localStorage` (clave `nexo_bio_v1`) una **foto fija** de `{usuario, nombre, nivel, tiendaPre, credentialId}` tomada en ese momento.
- `loginBiometrico()` (lo que corre cada vez que se entra con la huella) valida la huella vía WebAuthn pero **nunca vuelve a consultar el backend** — restaura literalmente esa foto vieja guardada en el teléfono, sin importar cuántas actualizaciones haya tenido la cuenta después.
- Si WEXPOSITO activó la huella cuando la cuenta todavía decía "WILLIAN", cada entrada por huella (probablemente su forma habitual de entrar día a día) seguía devolviendo `nombre: "WILLIAN"` indefinidamente, mientras que cada login completo con usuario/contraseña sí traía el nombre correcto y actual de la hoja ("WEXPOSITO"). De ahí la intermitencia: dependía de si esa sesión particular vino de un login con contraseña (correcto) o de la huella (congelado en el nombre viejo).
- Confirmado con Wanderson: no existe fila "WILLIAN" en USUARIOS hoy; él ya borró la carpeta WILLIAN de Drive y movió/renombró esos archivos a la carpeta correcta de WEXPOSITO manualmente.

**Fix aplicado (pendiente que Wanderson lo suba al repo — `login.html`, GitHub Pages, no Apps Script)**: en `loginBiometrico()`, después de que la huella se valida OK, volver a llamar a `verificarUsuario` (proxyPost, sin password) con `bio.usuario` para traer nombre/nivel/tiendaPre actuales de la hoja, en vez de confiar en la foto vieja de `BIO_KEY`. Además, refresca `BIO_KEY` si detecta que cambió, para no repetir la consulta de más en el futuro. Esto evita que esto vuelva a pasar con WEXPOSITO o con cualquier otra cuenta que cambie de nombre/nivel/tienda después de haber activado la huella.

## Bug "Subir ticket" con página HTML de error de Google — diagnosticado 2026-09-21/22, fix preparado y subido (frontend) 2026-09-22

**Síntoma original**: al tocar "Subir ticket" (WBEZERRA, TRAVESIA, franja 19-22H, con señal 5G — no era un caso de "sin conexión"), la app mostraba `❌ Error:` seguido del volcado crudo de una página HTML: `<!DOCTYPE html><html lang="pt"><head><script nonce="...">window['ppConfig'] = {productName: '26981ed0d57bbad37e728ff58134270c', deleteIsEnforced: false, sealIsEnforced: false, heartbeatRate: 0.5, periodicReportingRateMillis: 60000.0, disableAllReporting: false}...`. Persistió en reintentos consecutivos (mismo `productName`, distinto `nonce` cada vez).

**Causa raíz (confirmada por fuente externa)**: esto NO es un bug del código de Nexo ni del proxy Cloudflare. Es una página de error genérica que devuelve la infraestructura de Google cuando el endpoint `/exec` de Apps Script no llega a ejecutar el script (se confirmó buscando el fragmento exacto: el mismo `productName: '26981ed0d57bbad37e728ff58134270c'` aparece en un reporte público de fallos de OTRO proyecto totalmente ajeno (VeggieRadar, issue #49/#61 en GitHub), donde sus endpoints de Google Apps Script devolvían HTTP 404 con esta misma página en vez del JSON esperado. Es decir: es un identificador fijo/genérico de una plantilla de error de Google, no algo específico de la cuenta de Wanderson.
- Esto conecta directamente con el "Problema conocido — login intermitente" documentado en `codigo-nexo-script.md`: es el mismo tipo de fallo intermitente del lado de Apps Script/Google (arranques en frío, límite de ejecuciones simultáneas, o algo de la infraestructura de Google), solo que esta vez se dio en `procesarTicket` (subida de foto) en vez de en el login. Con 4 furgonetas y varios repartidores subiendo tickets casi a la misma hora en la franja pico 19-22H, es razonable sospechar límite de ejecuciones concurrentes del script (cuenta gratuita de Apps Script) como disparador, aunque no está confirmado — falta cruzar con los logs del Worker de Cloudflare en el momento exacto del fallo.

**El problema real, según Wanderson (2026-09-22)**: la mayoría de las veces que aparece este error, el ticket YA se subió del lado del servidor — el fallo es solo en que la respuesta no le llegó bien al teléfono. El repartidor no tiene forma de saber si subió o no, y reintentar "a ciegas" arriesgaba crear un archivo duplicado en Drive (Drive permite dos archivos con el mismo nombre en la misma carpeta sin avisar).

**Fix diseñado 2026-09-22** (backend + frontend, ver código completo en `codigo-nexo-script.md`):
1. **Idempotencia en el backend** (`procesarTicket`, Code.gs): como el nombre de archivo ya es determinístico (mismos datos de ticket = mismo nombre), antes de crear el archivo se revisa si ya existe uno con ese nombre en la carpeta del repartidor. Si existe → no se duplica, se devuelve `'YA_SUBIDO | ...'`. Si no existe → se sube normal, `'OK | ...'`. Esto hace que cualquier reintento (automático o manual) sea siempre seguro.
2. **Reintento automático en el frontend** (`index.html`): hasta 3 intentos con espera creciente cuando la respuesta indica el error de Google (o `!resp.ok`), sin reintentar errores reales de la app (`ERROR: ...`, que no cambian al reintentar). Mensaje distinto para "✅ Ticket subido" vs "✅ Ticket ya estaba subido" para que el repartidor tenga certeza, en vez de ambigüedad.
3. **Cola offline reforzada**: si los reintentos rápidos se agotan, el ticket se guarda en la misma cola de IndexedDB que ya existía para "sin conexión" (ya no hace falta estar offline para caer ahí) y se reintenta solo cada 30 segundos en segundo plano además de al recuperar señal — con un límite de 20 intentos para no reintentar para siempre un payload realmente roto.
- **Frontend (`index.html`) confirmado subido a GitHub** el 2026-09-22 (verificado directamente: contiene `esFalloTransitorio`, `YA_SUBIDO`, cola reforzada).
- **Backend**: función `procesarTicket` actualizada — ver `codigo-nexo-script.md`, sección "Fix aplicado 2026-09-22" — **estado sin confirmar**: no se pudo verificar desde aquí si Wanderson ya la pegó en el editor de Apps Script y reimplementó (el `Code.gs` del repo de GitHub no es la fuente de verdad del backend real, ver nota en "Repositorio" arriba). Pendiente que Wanderson confirme.
- **Limitación conocida y aceptada**: si el mismo repartidor sube dos tickets distintos el mismo día, misma tienda, misma franja y con EXACTAMENTE los mismos P/D/XR/KM/OBS, el nombre de archivo coincide y el segundo se tomaría como "ya subido" (no se subiría la segunda foto). Caso muy raro en la operación real — si llega a pasar, avisar para sumar algo más al nombre de archivo (ej. hora exacta).

## Feature agregada 2026-09-22 — Informe (Looker Studio / Data Studio) por usuario

**Pedido de Wanderson**: mostrar dentro de la app el informe de Looker Studio propio de cada usuario, embebido, con botones "Volver" (a index.html) y "Salir" (cierra sesión). Ícono nuevo en `index.html`, justo debajo del de Reservas.

**Diseño**:
- Cada usuario tiene su propio enlace de informe guardado en una columna nueva **INFORME** de la hoja USUARIOS (planilla `1n22xieMU7usBigmDwN4i5agSpDM-eCmCRlj6pj68Zx4`).
- El login (`login.html`) ya trae los datos del usuario desde el backend (`verificarUsuario`/`hacerLogin`/`registrarPassword`, y también en el login biométrico) — se agregó el campo `informe` a esas respuestas y a la sesión que se guarda en `sessionStorage`/`localStorage` (`sad_user`), igual que ya se hace con `nombre`/`nivel`/`tiendaPre`. Ver el diff completo en `codigo-nexo-script.md`, sección "Feature agregada 2026-09-22".
- Página nueva `informe.html`: no llama al backend — lee `sesion.informe` directo de la sesión ya guardada. Si hay un enlace, lo convierte de la URL normal de Looker Studio (`.../reporting/<id>`) a su versión embebible (`.../embed/reporting/<id>`) y lo muestra en un iframe a pantalla casi completa (la conversión es solo un respaldo: si el enlace pegado en INFORME ya viene en formato `/embed/` no lo toca). Si no hay enlace, muestra "Informe no disponible para este usuario". Botones "⬅️ Volver" (`index.html`) y "🚪 Salir" (mismo `cerrarSesion()` que `index.html`: limpia la sesión y redirige a `login.html`).
- `index.html`: ícono nuevo `.btn-informe`, mismo estilo y tamaño que `.btn-reservas`, posicionado justo debajo (misma esquina superior derecha de la tarjeta). Usa un ícono nuevo `boton_informe.png` que generamos para que combine visualmente con `boton_reservas.png` (mismo estilo plano blanco/negro).

**Requisito del lado de Google, fuera del control del código** — cómo activar "Insertar informe" correctamente (confirmado en documentación oficial de Google el 2026-09-22): en Looker Studio, Archivo → Insertar informe, hay que elegir **"Insertar URL"** (no "Insertar código", que da un `<iframe>` HTML completo que no hace falta acá). Google exige usar el enlace exacto que genera ese diálogo — el enlace normal de "Compartir" NO sirve para insertar en un iframe, aunque visualmente apunte al mismo informe. Flujo por cada informe: Archivo → Insertar informe → activar si lo pide → "Insertar URL" → copiar ese enlace tal cual (ya viene en formato `/embed/reporting/...`) → pegarlo en la columna INFORME de la fila del usuario correspondiente.

**Archivos**: `informe.html` (nuevo), `index.html` y `login.html` (actualizados) y `boton_informe.png` (ícono nuevo) — **confirmado subidos al repo de GitHub** (verificado directamente el 2026-09-22). Backend: las 3 funciones actualizadas (`verificarUsuario`, `hacerLogin`, `registrarPassword`) están en `codigo-nexo-script.md` y se pasaron también en el chat — **pendiente sin confirmar** que Wanderson las haya pegado en el editor de Apps Script del NEXO SCRIPT.

**Pendiente para que funcione de punta a punta**:
1. Agregar la columna INFORME a la hoja USUARIOS (si no existe) y cargar el enlace de cada usuario que deba tener informe, usando "Insertar URL" (ver arriba) — no el enlace de compartir normal.
2. Activar "Insertar informe" (opción "Insertar URL") en cada informe de Looker Studio correspondiente.
3. Pegar las 3 funciones de auth actualizadas en Apps Script y reimplementar sobre la misma implementación de NEXO SCRIPT.
4. ~~Subir `index.html`, `login.html`, `informe.html` y `boton_informe.png` al repo de GitHub~~ — **hecho, confirmado 2026-09-22**.

## Frontend Nexo Tickets — `index.html` (niveles de usuario y selector de repartidor)
- Niveles (`sesion.nivel`, viene del login): `admin` | `usuario 1` | `usuario 2` | `usuario 3`.
  - `usuario 1`: repartidor **bloqueado** a su propio nombre (`aplicarReglasRepartidor()` lo fija y deshabilita el `<select>`); fecha fija a hoy.
  - `usuario 3`: repartidor también bloqueado a su propio nombre (misma función), pero a diferencia de `usuario 1`, ve todas las franjas sin filtro de hora.
  - `usuario 2`: tienda Y repartidor quedan **libres** (selects habilitados) — pensado para alguien (ej. un supervisor) que carga tickets de **varios repartidores distintos** desde un mismo dispositivo.
  - `admin`: todo libre, sin restricciones.
- **Hallazgo secundario 2026-09-19 — repartidor "pegado" del ticket anterior** (real, pero NO fue la causa del caso WILLIAN/WEXPOSITO del 2026-09-21 — esa causa está confirmada arriba, en `login.html`): en `resetFormulario()` (se ejecuta después de cada envío exitoso), la rama para usuarios no-admin es:
  ```javascript
  } else {
    aplicarReglasTienda();
    if (ES_USUARIO_1) aplicarReglasRepartidor();
    aplicarReglasFranja();
  }
  ```
  Para `usuario 2` (repartidor libre, no bloqueado) esto NO toca el `<select id="repartidor">` — el formulario se limpia (foto, pedidos, etc.) pero el repartidor elegido en el ticket anterior queda seleccionado tal cual para el siguiente ticket. Si quien carga tickets para varios repartidores no cae en la cuenta de cambiar manualmente el desplegable, el ticket siguiente se sube con el repartidor equivocado.
  - **Fix propuesto** (no aplicado aún, opcional — pendiente que Wanderson decida si lo sube): en `resetFormulario()`, resetear también el repartidor a la opción vacía para `usuario 2`:
    ```javascript
    } else {
      aplicarReglasTienda();
      if (ES_USUARIO_1) {
        aplicarReglasRepartidor();
      } else if (!ES_USUARIO_3) {
        repartSel.selectedIndex = 0;
      }
      aplicarReglasFranja();
    }
    ```
  - Mientras no se aplique: quien carga tickets de varios repartidores desde un mismo dispositivo (nivel `usuario 2`) debe revisar el campo "Repartidor" antes de cada envío.

## Módulo de Reservas — `reservas.html` (en el repo de Nexo Tickets)
- `reservas.html` (verificado 2026-09-22) NO es la app de Reservas en sí — es una página puente de redirección: toma el usuario logueado (`?u=` desde la sesión) y hace `window.location.replace(...)` hacia la URL `.../exec` del deployment **NEXO RESERVAS** (Apps Script HTML Service, `App.html`, proyecto separado). Así el módulo de Reservas entero (su interfaz, su lógica) vive en su propio Apps Script, no en este repo de GitHub — `reservas.html` es solo el enlace/redirect con el usuario ya identificado, para no pedir login de nuevo.

## Apps Script (deployments)
- **NEXO SCRIPT** (backend Nexo Tickets — auth + subida de fotos a Drive):
  https://script.google.com/macros/s/AKfycbzkf4K28coJa5YXNv_iN08sfhjrtKenyFJgHxWaIxMGVtuABHswvySAFEmowq5vP4rD/exec
  - **2026-09-18: migrado** de la planilla vieja (`19bqTde5...`, hoja "database") a la planilla nueva (`1n22xieMU7us...`, hojas TIENDAS + USUARIOS). Confirmado funcionando: `testDoPost()` en el editor OK, y la URL pública devuelve el JSON correcto con `franjasPorTienda` real por tienda.
  - **Pendiente/en observación**: fallo intermitente donde Apps Script/Google devuelve una página HTML de error genérica en vez de JSON — visto tanto en el login ("Error de conexión") como, el 2026-09-21/22, en la subida de tickets (`procesarTicket`). Fix de idempotencia + reintento diseñado el 2026-09-22 (ver sección de bug arriba y `codigo-nexo-script.md`); frontend confirmado subido, backend pendiente de confirmar que se pegó/redesplegó.
  - **2026-09-22**: se agregó el campo `informe` a `verificarUsuario`/`hacerLogin`/`registrarPassword` para la feature de Informe (ver sección propia arriba), también pendiente de confirmar que se pegó en el editor.
  - NOTA: `procesarTicket`/`obtenerOCrearCarpeta`/`generarNombreArchivo` NO validan que `body.repartidor` sea un usuario activo real — aceptan cualquier string y crean la carpeta que haga falta. Por diseño así (permite flexibilidad), pero significa que cualquier bug del lado del frontend que mande un nombre viejo/equivocado se traduce directo en una carpeta mal creada en Drive, sin ninguna validación de respaldo en el backend.
- **ACTUALIZAR CONTROL DE TICKETS** (lee Drive cada 5 min y reescribe las hojas del periodo):
  https://script.google.com/macros/s/AKfycbzEnq5PYv_9pAi-d-dRi-M69rxPxW62Qd3vy61qvGxR9s-YxgkYdWlZ7b2alJrXAt1sYg/exec
  - Todavía apunta a la planilla vieja (`19bqTde5...`, hoja "database", columnas A:C) para el día de corte por tienda — **no migrado**. Como los valores de día de corte son iguales en ambas planillas por ahora, no hay inconsistencia funcional hoy, pero si se edita el día de corte de una tienda hay que actualizarlo en las DOS planillas hasta que este script también se migre.
- **NEXO RESERVAS** (backend independiente del Módulo de Reservas, `App.html` propio, ver sección arriba):
  https://script.google.com/macros/s/AKfycbwXkz9LoSa2ucdz9x1_wD9Z0BMsRe9R2vrnZ_MZEeKGSpKN55EQM3cVQLYtdeOL9JwP/exec
  - Todavía apunta a la planilla vieja (`19bqTde5...`, hoja "database" col P) para la tabla de usuarios (login compartido con Nexo Tickets) — **no migrado**. Si se elimina o reestructura la hoja "database" en la planilla vieja, este módulo se rompe hasta que también se migre a la hoja USUARIOS nueva.
  - **2026-09-18**: el botón "Salir" del frontend (`App.html`) ya no muestra la pantalla de login interna del módulo — navega directo a `login.html` de Nexo Tickets (mismo destino que el botón "↩"). Ver detalle abajo y en `codigo-nexo-reservas-apphtml.md`.

## Google Drive
- Carpeta raíz con carpetas por periodo (`YYYY.MES` → repartidor → fotos JPG):
  https://drive.google.com/drive/folders/15A9pWwJRTaxA_uHcQqhNmsKpJO11HEJb

## Planillas (Google Sheets)

### Planilla nueva — TIENDAS + USUARIOS (fuente de datos vigente de NEXO SCRIPT)
- ID: `1n22xieMU7usBigmDwN4i5agSpDM-eCmCRlj6pj68Zx4`
- Hoja **TIENDAS** (fila 1 = encabezados, datos desde fila 2):
  - A = TIENDAS | B = FECHA INICIO | C = FECHA FIN | D en adelante = FRANJAS HORARIAS (hasta 4 por tienda, columnas vacías se ignoran)
  - "FECHA INICIO"/"FECHA FIN" son el día del mes de corte del periodo operativo (mismo concepto que el viejo DIA INICIO/DIA FIN), no fechas de calendario — confirmado con los datos reales (ej. TRAVESIA 26/25, DIA-SAMIL 25/24, GADIS-NIGRAN 26/25).
- Hoja **USUARIOS** (fila 1 = encabezados, columna A en adelante):
  - `USUARIO | NOMBRE | ACTIVO | PASSWORD_HASH | NIVEL | TIENDA_PRE | MODULO RESERVAS | DEPARTAMENTO | CORREO | TELEFONO | MATRICULA_PRE | INFORME`
  - NIVEL: `admin` | `usuario 1` | `usuario 2` | `usuario 3`
  - DEPARTAMENTO: `REPARTO` | `EMBOLSADO` (existe en la hoja, pero por decisión de Wanderson NO se usa para filtrar el selector de repartidor — siguen apareciendo todos los usuarios activos)
  - **INFORME** (agregada 2026-09-22): enlace "Insertar URL" de Looker Studio/Data Studio del informe propio de ese usuario (ver sección "Feature Informe" arriba para cómo obtenerlo bien). Vacío = sin informe asignado. El backend la lee por nombre de encabezado, así que puede estar en cualquier columna, no necesariamente después de MATRICULA_PRE.
  - Repartidores activos confirmados (2026-09-21): WEXPOSITO (usuario 1, TRAVESIA), WCOELHO (admin, TRAVESIA), LHERRERA (usuario 1, GADIS-NIGRAN), LARAUJO (usuario 2, GRANVIA), ABRAHAM (usuario 3, ONLINE), SCONDA (usuario 1, TRAVESIA), ALEON (usuario 1, TRAVESIA), WBEZERRA (usuario 1, TRAVESIA). JMLOPEZ existe pero está INACTIVO.

### Planilla principal — "database" (Nexo Tickets, en desuso parcial)
- ID: `19bqTde5-Yf6P7B6IkcJ2tkb_xM9lH9hvSlR6LFvm_TY`
- https://docs.google.com/spreadsheets/d/19bqTde5-Yf6P7B6IkcJ2tkb_xM9lH9hvSlR6LFvm_TY/edit
- Hoja **"database"**: sigue siendo usada por "ACTUALIZAR CONTROL DE TICKETS" (columnas A–C, día de corte) y por "NEXO RESERVAS" (tabla USUARIOS desde columna P). Ya NO la usa NEXO SCRIPT (migrado a la planilla nueva de arriba).
  - Hojas por periodo `Tabla_YYYY.MES`, generadas/actualizadas por "ACTUALIZAR CONTROL DE TICKETS" (11 columnas: Fecha, Tienda, Repartidor, Franja, P, D, XR, Total, Km, Archivo URL, OBS)

### Planilla del Módulo de Reservas
- ID: `1rpXo_4cO-oMwuPy62Fph_NB7ELUOdWC7ARCdh-Qjnrw`
- https://docs.google.com/spreadsheets/d/1rpXo_4cO-oMwuPy62Fph_NB7ELUOdWC7ARCdh-Qjnrw/edit
- Hoja **DATABASE**: reservas (columnas ID, FECHA, FRANJA, UBICACIÓN, CLIENTE/DIRECCIÓN, CAJA, PEDIDO, HORA RESERVA, USUARIO, HR CONFIRMADO, USUARIO (confirma), ESTADO, HORA CAJA)
- Hoja **LIMITES**: límites diarios de reservas por día de la semana y franja horaria (plantilla con LUNES–DOMINGO × 10-13H/13-16H/16-19H/19-22H)
- Reutiliza la tabla de usuarios de la planilla "database" vieja (columna P) — no migrado a la planilla nueva.

## Proxy
- Cloudflare Worker "sad-proxy" (usado por `index.html`/`login.html` para llamar al backend evitando CORS — todas las llamadas van por POST a `PROXY + "?url=" + encodeURIComponent(BACKEND_URL)`):
  https://dash.cloudflare.com/d4d38a5c54e0b9f4550ec2a56bf641b8/workers/services/edit/sad-proxy/production
  - Dominio del worker: `sad-proxy.colatino-ventas-enlinea.workers.dev`
  - **Hallazgo 2026-09-18**: el mismo síntoma (login que se queda trabado/no responde al tocar "Entrar") se confirmó también en el Módulo de Reservas (`App.html`), cuyo login usa `google.script.run` — el puente cliente-servidor nativo de Apps Script, que **no pasa por este proxy de Cloudflare**. Esto hace menos probable que el proxy sea la única causa del login intermitente de Nexo Tickets; apunta más a algo del lado de Apps Script/Google (arranques en frío, límite de ejecuciones simultáneas del script, o de la cuenta que ejecuta los tres backends) o de la red del teléfono. Sigue sin confirmarse la causa exacta — pendiente revisar logs del Worker en el dashboard de Cloudflare Y comparar con el momento exacto de un fallo en Reservas, la próxima vez que ocurra cualquiera de los dos.
  - **2026-09-21/22**: reforzado por el caso de "Subir ticket" — confirmado (ver sección de bugs arriba) que el contenido devuelto en esos fallos es una página de error GENÉRICA de la infraestructura de Google (el mismo `productName` fijo aparece en fallos de Apps Script de proyectos totalmente ajenos), no algo generado por el proxy ni por el script de Wanderson. Esto orienta la causa más hacia el lado de Google (cuota de ejecuciones simultáneas, arranque en frío, o inestabilidad puntual de su infraestructura) que hacia el proxy o el código propio. Mitigado del lado de la app con el fix de idempotencia + reintento (ver arriba), aunque la causa de fondo en Google sigue sin poder solucionarse desde este lado.
  - Mitigación aplicada mientras tanto: en el Módulo de Reservas, el botón "Salir" ya no deja al usuario atrapado en la pantalla de login interna del módulo (que era donde se veía el cuelgue) — ahora redirige directo a `login.html` de Nexo Tickets. Esto no arregla la causa del cuelgue intermitente, solo evita que quede una pantalla sin salida cuando ocurre.

## Ver también
- `codigo-nexo-script.md` — código completo del backend principal (Code.gs), **versión migrada y vigente**, con el historial de la migración del 2026-09-18, el fix de idempotencia del 2026-09-22 y la feature de Informe del 2026-09-22
- `codigo-actualizar-control-tickets.md` — código completo del script de actualización de hojas (todavía en la planilla vieja)
- `codigo-nexo-reservas-codegs.md` — código completo del backend del Módulo de Reservas (Code.gs, todavía en la planilla vieja)
- `codigo-nexo-reservas-apphtml.md` — código completo del frontend del Módulo de Reservas (App.html), con el cambio del botón "Salir" del 2026-09-18
- README.md del repo — reescrito completo el 2026-09-22 (entregado en el chat), refleja el estado real de la app (login biométrico, niveles, reservas, idempotencia, informe); pendiente que Wanderson lo suba a GitHub
- Bug WILLIAN/WEXPOSITO (login biométrico con datos viejos) — ver sección propia arriba, confirmado y con fix listo para subir a `login.html` en GitHub
- Bug "Subir ticket" con página de error HTML de Google (2026-09-21/22) — ver sección propia arriba, causa raíz confirmada externamente, fix de idempotencia + reintento diseñado el 2026-09-22, frontend confirmado subido, backend pendiente de confirmar
- Feature Informe (Looker Studio por usuario, 2026-09-22) — ver sección propia arriba, frontend confirmado subido, incluye la aclaración de "Insertar URL" vs "Insertar código" de Looker Studio
- Hallazgo secundario del repartidor "pegado" en `index.html` (usuario 2) — ver sección "Frontend Nexo Tickets" arriba
