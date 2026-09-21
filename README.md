# README.md — Nexo · SAD Tickets (copia de referencia del proyecto)

> Esta es la copia guardada en el proyecto del `README.md` reescrito el 2026-09-22 para el repo `nexo-tickets`. El archivo real fue entregado a Wanderson en el chat para que lo suba a GitHub reemplazando el actual (que seguía en la versión 2.5, desactualizado). Si se vuelve a actualizar el README del repo, actualizar también esta copia.

---

# 🚀 Nexo · SAD Tickets

PWA para los repartidores de Colatino Repartos y Transportes: suben la foto del ticket de reparto directo desde el móvil, con login (contraseña o huella), niveles de usuario, subida a Google Drive con reintento automático a prueba de duplicados, cola offline, un módulo de Reservas y un informe personalizado (Looker Studio) por usuario.

> Actualizado: 2026-09-22 — incluye login biométrico, subida de tickets con idempotencia/reintento/cola offline, Módulo de Reservas y la nueva página de Informe.

---

## 🏗️ Arquitectura

```
┌──────────────────────┐      ┌──────────────────────────┐
│  Frontend (estático)  │─────▶│  Cloudflare Worker proxy  │──▶ evita CORS
│  GitHub Pages         │      │  "sad-proxy"              │
│  login / index /      │      └────────────┬──────────────┘
│  reservas / informe   │                   │
└──────────┬────────────┘                   ▼
           │                    ┌──────────────────────────┐
           │                    │  NEXO SCRIPT (Apps Script)│──▶ Google Sheets (TIENDAS/USUARIOS)
           │                    │  login + subida de fotos  │──▶ Google Drive (fotos de tickets)
           │                    └──────────────────────────┘
           │
           │  reservas.html redirige con el usuario ya logueado a:
           ▼
┌──────────────────────────┐
│  NEXO RESERVAS            │──▶ Google Sheets (Módulo de Reservas)
│  (Apps Script HTML Service,│
│   App.html, proyecto aparte)│
└──────────────────────────┘

┌──────────────────────────┐
│ ACTUALIZAR CONTROL DE     │──▶ lee Drive cada 5 min, reescribe hojas
│ TICKETS (Apps Script,     │    de control por periodo
│ trigger por tiempo)       │
└──────────────────────────┘
```

No hay servidor propio: todo el tráfico real va del frontend estático directo a los backends de Apps Script (vía el proxy de Cloudflare, para evitar CORS). El repo incluye restos de un scaffolding Node/Express (`app.js`, `package.json`, `package-lock.json`) que **no se usa** en producción — se pueden ignorar o borrar sin afectar la app.

---

## 📋 Niveles de usuario

| Nivel | Fecha | Repartidor | Franjas horarias | Resto de campos |
|---|---|---|---|---|
| **admin** | Modificable | Modificable | Todas | Modificable |
| **usuario 1** | 🔒 Solo hoy | 🔒 Su nombre fijo | Filtradas por hora actual | Modificable |
| **usuario 2** | 🔒 Solo hoy | Modificable (libre) | Filtradas por hora actual | Modificable — pensado para cargar tickets de varios repartidores desde un mismo dispositivo |
| **usuario 3** | 🔒 Solo hoy | 🔒 Su nombre fijo | Todas, sin filtro de hora | Modificable |

> ⚠️ **Nivel `usuario 2`**: el campo "Repartidor" no se resetea solo entre un ticket y el siguiente — si cargás tickets de varias personas desde el mismo teléfono, revisá ese campo antes de cada envío.

---

## ✨ Funcionalidades

- **Login** con usuario/contraseña (hash SHA-256 del lado del servidor) y **login biométrico** (huella / Face ID vía WebAuthn) para entrar más rápido en el día a día.
- **Subida de tickets con foto**, comprimida/optimizada antes de enviarse.
- **Subida a prueba de duplicados (idempotencia)**: el nombre de archivo es determinístico (mismos datos de ticket = mismo nombre). Si Google devuelve un error de infraestructura (una página HTML en vez del JSON esperado) el frontend reintenta solo, y el backend nunca sube el mismo ticket dos veces — si el archivo ya existe, responde "ya subido" en vez de duplicarlo.
- **Cola offline**: si no hay señal o el reintento rápido falla, el ticket queda guardado en el dispositivo (IndexedDB) y se reintenta solo, tanto al recuperar conexión como cada 30 segundos en segundo plano, hasta 20 intentos.
- **Módulo de Reservas**: `reservas.html` redirige (con el usuario ya identificado) al proyecto de Apps Script independiente "NEXO RESERVAS", para gestionar reservas de recogida de pedidos con límites diarios por franja horaria.
- **Informe personalizado (Looker Studio)**: cada usuario puede tener su propio informe embebido dentro de la app (`informe.html`), con botones para volver al menú o cerrar sesión.
- **PWA instalable**: manifest + service worker con caché para uso offline básico.

---

## 📁 Estructura del repositorio

```
nexo-tickets/
├── login.html              ← Login (contraseña + biométrico), guarda la sesión
├── index.html               ← App principal: formulario de tickets + menú (Reservas/Informe)
├── reservas.html             ← Redirige al Módulo de Reservas (Apps Script aparte), pasando el usuario
├── informe.html              ← Muestra el informe de Looker Studio propio del usuario logueado
├── manifest.json              ← PWA manifest (start_url → login.html)
├── service-worker.js          ← Cachea assets estáticos + páginas visitadas (cache-first)
├── Code.gs                    ← Referencia histórica de NEXO SCRIPT — NO es la fuente de verdad del
│                                  backend real (ver nota abajo); el código vigente vive en el editor
│                                  de Apps Script del deployment y en la documentación del proyecto
├── nexo-logo-full.png         ← Logo completo (login + index header + informe)
├── nexo-rabbit-192.png        ← Solo conejo 192px
├── nexo-rabbit-512.png        ← Solo conejo 512px
├── nexo-wordmark.png          ← Solo "Nexo"
├── nexo-icon-192.png          ← Icono PWA 192
├── nexo-icon-512.png          ← Icono PWA 512
├── boton_reservas.png         ← Ícono del botón Reservas en index.html
├── boton_informe.png          ← Ícono del botón Informe en index.html
├── app.js, package.json,      ← ⚠️ NO usados en producción — restos de un scaffolding Node/Express
│   package-lock.json            que ya no aplica (no hay `routes/` ni servidor propio corriendo)
└── README.md                  ← este archivo
```

> ⚠️ **`Code.gs` en este repo no está sincronizado con el backend real.** El código que realmente corre está pegado directamente en el editor de Apps Script del deployment NEXO SCRIPT. Si necesitás el código actualizado y completo, pedilo — está documentado aparte junto con el historial de cambios.

---

## ⚙️ Instalación / puesta en marcha desde cero

### PASO 1 — Hoja Google Sheets "USUARIOS" (planilla vigente)

Planilla: `1n22xieMU7usBigmDwN4i5agSpDM-eCmCRlj6pj68Zx4`, hoja **USUARIOS**, fila 1 = encabezados:

| USUARIO | NOMBRE | ACTIVO | PASSWORD_HASH | NIVEL | TIENDA_PRE | MODULO RESERVAS | DEPARTAMENTO | CORREO | TELEFONO | MATRICULA_PRE | INFORME |
|---|---|---|---|---|---|---|---|---|---|---|---|
| wanderson | Wanderson | SI | _(vacío en alta inicial)_ | admin | | | | | | | |
| wexposito | Wexposito | SI | _(vacío)_ | usuario 1 | TRAVESIA | | REPARTO | | | | https://.../embed/reporting/... |

> ⚠️ Nombres de columnas **EXACTAMENTE** así (mayúsculas). El backend las busca por nombre de encabezado, no por posición — podés agregar columnas nuevas (como INFORME) en cualquier orden.
> 💡 Dejar `PASSWORD_HASH` vacío activa el flujo de "primer acceso": el usuario crea su propia contraseña la primera vez que entra.
> 💡 `INFORME` vacío = ese usuario no tiene informe asignado y ve el mensaje "Informe no disponible para este usuario".

La hoja **TIENDAS** de la misma planilla define, por tienda, el día de corte del periodo y hasta 4 franjas horarias.

### PASO 2 — Informe de Looker Studio por usuario (opcional)

Para cada usuario que deba tener un informe:
1. Abrí el informe en Looker Studio → **Archivo → Insertar informe**.
2. Activá la inserción si te lo pide.
3. Elegí **"Insertar URL"** (no "Insertar código" — ese da un `<iframe>` HTML completo que no hace falta acá).
4. Copiá ese enlace tal cual (ya viene en formato `.../embed/reporting/...`) y pegalo en la columna **INFORME** de ese usuario.

> ⚠️ Tiene que ser el enlace generado por ese diálogo, no el enlace normal de "Compartir" — Google bloquea la carga en un iframe si no es el enlace correcto, aunque apunte al mismo informe.

### PASO 3 — Apps Script (backend NEXO SCRIPT)

1. Abrí [script.google.com](https://script.google.com) → el proyecto del deployment NEXO SCRIPT.
2. Backup del `Code.gs` actual (copialo y guardalo aparte).
3. Pegá el código vigente (pedilo si no lo tenés a mano — no es el `Code.gs` de este repo).
4. Confirmá que `procesarTicket()` apunta al folder ID real de Drive de tickets.
5. Guardá (Ctrl+S).
6. **Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva versión → Actualizar** (así la URL `/exec` no cambia).

### PASO 4 — Subir el repo a GitHub

```bash
cd nexo-tickets
git add .
git commit -m "actualización app"
git push
```

GitHub Pages ya debe estar activo en `Settings → Pages → Source: main / (root)`. URL pública:
`https://coelhocolatino.github.io/nexo-tickets/login.html`

### PASO 5 — Pruebas antes de avisar a los repartidores

1. Abrí la URL en el navegador (no en la app instalada, para evitar caché vieja).
2. Probá un usuario nuevo → crear contraseña → entrar.
3. Verificá que cada nivel ve los campos correctos (ver tabla de niveles arriba).
4. Subí un ticket completo y confirmá que se guarda en Drive y en la hoja de control.
5. Probá el botón **Reservas** (te lleva al módulo aparte) y el botón **Informe** (te muestra el informe si el usuario tiene uno asignado, o el mensaje de "no disponible" si no).
6. Cerrá sesión → entrá de nuevo con la contraseña creada, y también con la huella si la activaste.

### PASO 6 — Avisar a los repartidores

> _"App actualizada. Si es la primera vez, os pedirá crear una contraseña personal. Cualquier problema, avisad."_

---

## 🔄 Rollback rápido

**Frontend (GitHub Pages):**
```bash
git revert HEAD --no-edit && git push
```

**Apps Script:** Implementar → Administrar → seleccionar la versión anterior → Actualizar.

---

## 🛠️ Variables y constantes a revisar

En el backend (Apps Script, NEXO SCRIPT):
- ID de la planilla `1n22xieMU7usBigmDwN4i5agSpDM-eCmCRlj6pj68Zx4` (USUARIOS/TIENDAS) — ya apuntado.
- Folder ID de Drive real en `procesarTicket()`.

En `login.html`, `index.html`, `reservas.html`:
- `BACKEND_URL` → la URL `/exec` de NEXO SCRIPT (ya está puesta).
- `PROXY` → `https://sad-proxy.colatino-ventas-enlinea.workers.dev/` (ya está puesta).
- `reservas.html` → `RESERVAS_EXEC_URL`, la URL `/exec` del deployment NEXO RESERVAS (ya está puesta).

---

## ⚠️ Problemas conocidos

- **Fallo intermitente de Google en `/exec`** (Apps Script devuelve una página de error HTML genérica en vez de JSON, sobre todo en horas pico): mitigado con reintento automático + idempotencia en la subida de tickets. Sigue sin poder solucionarse del todo porque el origen es infraestructura de Google, no del código propio.
- **`usuario 2`**: el campo "Repartidor" no se resetea automáticamente entre tickets — revisar antes de cada envío si se cargan tickets de varias personas desde el mismo dispositivo.
- Documentación técnica completa (causas raíz confirmadas, código exacto de cada fix, y el historial completo de bugs) disponible aparte — pedila si la necesitás.

---

## 📦 Versionado

| Fecha | Cambios |
|---|---|
| — | v2.4 — versión anterior (sin login) |
| — | v2.5 — login con auth, niveles admin/usuario 1/usuario 2, logo Nexo, optimización de fotos |
| 2026-09-18 | Migración de la planilla vieja ("database") a la planilla nueva (TIENDAS + USUARIOS); nivel `usuario 3`; ajuste del botón "Salir" del Módulo de Reservas |
| 2026-09-21/22 | Diagnóstico y fix del error HTML de Google al subir tickets: idempotencia en el backend + reintento automático + cola offline reforzada en el frontend |
| 2026-09-22 | Login biométrico corregido para no quedar con datos viejos (caso WILLIAN/WEXPOSITO); nueva página `informe.html` con informe de Looker Studio por usuario |

---

_Nexo · Distribución Inteligente_
