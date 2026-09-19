# Referencia técnica — NEXO APP

Actualizado: 2026-09-18

## Repositorio
- GitHub: https://github.com/coelhocolatino/nexo-tickets
- Nota: el `Code.gs` del repo (rama main) es una versión adelantada/incompleta de la migración de NEXO SCRIPT — ya apuntaba a la planilla nueva (TIENDAS/USUARIOS) y calculaba `franjasPorTienda`, pero le faltaban `doPost` (login) y `procesarTicket` (subida de fotos). No se desplegó tal cual; se fusionó a mano con la lógica de login/tickets del script en producción. Ver `codigo-nexo-script.md` para el resultado final ya confirmado en producción.

## Apps Script (deployments)
- **NEXO SCRIPT** (backend Nexo Tickets — auth + subida de fotos a Drive):
  https://script.google.com/macros/s/AKfycbzkf4K28coJa5YXNv_iN08sfhjrtKenyFJgHxWaIxMGVtuABHswvySAFEmowq5vP4rD/exec
  - **2026-09-18: migrado** de la planilla vieja (`19bqTde5...`, hoja "database") a la planilla nueva (`1n22xieMU7us...`, hojas TIENDAS + USUARIOS). Confirmado funcionando: `testDoPost()` en el editor OK, y la URL pública devuelve el JSON correcto con `franjasPorTienda` real por tienda.
  - **Pendiente/en observación**: login intermitente (a veces "Error de conexión" o la pantalla se queda cargando, funciona al reintentar). Ver hallazgo importante y detalle en la sección "Proxy" más abajo y en `codigo-nexo-script.md`.
- **ACTUALIZAR CONTROL DE TICKETS** (lee Drive cada 5 min y reescribe las hojas del periodo):
  https://script.google.com/macros/s/AKfycbzEnq5PYv_9pAi-d-dRi-M69rxPxW62Qd3vy61qvGxR9s-YxgkYdWlZ7b2alJrXAt1sYg/exec
  - Todavía apunta a la planilla vieja (`19bqTde5...`, hoja "database", columnas A:C) para el día de corte por tienda — **no migrado**. Como los valores de día de corte son iguales en ambas planillas por ahora, no hay inconsistencia funcional hoy, pero si se edita el día de corte de una tienda hay que actualizarlo en las DOS planillas hasta que este script también se migre.
- **NEXO RESERVAS** (backend independiente del Módulo de Reservas):
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
  - `USUARIO | NOMBRE | ACTIVO | PASSWORD_HASH | NIVEL | TIENDA_PRE | MODULO RESERVAS | DEPARTAMENTO | CORREO | TELEFONO | MATRICULA_PRE`
  - NIVEL: `admin` | `usuario 1` | `usuario 2` | `usuario 3`
  - DEPARTAMENTO: `REPARTO` | `EMBOLSADO` (existe en la hoja, pero por decisión de Wanderson NO se usa para filtrar el selector de repartidor — siguen apareciendo todos los usuarios activos)

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
  - Mitigación aplicada mientras tanto: en el Módulo de Reservas, el botón "Salir" ya no deja al usuario atrapado en la pantalla de login interna del módulo (que era donde se veía el cuelgue) — ahora redirige directo a `login.html` de Nexo Tickets. Esto no arregla la causa del cuelgue intermitente, solo evita que quede una pantalla sin salida cuando ocurre.

## Ver también
- `codigo-nexo-script.md` — código completo del backend principal (Code.gs), **versión migrada y vigente**, con el historial de la migración del 2026-09-18
- `codigo-actualizar-control-tickets.md` — código completo del script de actualización de hojas (todavía en la planilla vieja)
- `codigo-nexo-reservas-codegs.md` — código completo del backend del Módulo de Reservas (Code.gs, todavía en la planilla vieja)
- `codigo-nexo-reservas-apphtml.md` — código completo del frontend del Módulo de Reservas (App.html), con el cambio del botón "Salir" del 2026-09-18
