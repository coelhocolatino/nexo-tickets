# 🚀 Nexo · SAD Tickets

Sistema de gestión de tickets de reparto con autenticación, niveles de usuario y optimización de fotos.

---

## 📋 Niveles de usuario

| Nivel | Fecha | Repartidor | Resto de campos |
|-------|-------|------------|-----------------|
| **admin** | Modificable | Modificable | Modificable |
| **usuario 1** | 🔒 Solo hoy | 🔒 Su nombre fijo | Modificable |
| **usuario 2** | 🔒 Solo hoy | Modificable | Modificable |

---

## 📁 Estructura del repositorio

```
nexo-tickets/
├── login.html             ← Pantalla de login (NUEVO)
├── index.html             ← App principal (actualizado: niveles + foto)
├── Code.gs                ← Apps Script con auth (NUEVO)
├── manifest.json          ← PWA manifest (start_url → login.html)
├── service-worker.js      ← SW v5 con login.html cacheado
├── nexo-logo-full.png     ← Logo completo (login + index header)
├── nexo-rabbit-192.png    ← Solo conejo 192px
├── nexo-rabbit-512.png    ← Solo conejo 512px
├── nexo-wordmark.png      ← Solo "Nexo"
├── nexo-icon-192.png      ← Icono PWA 192
├── nexo-icon-512.png      ← Icono PWA 512
├── app.js                 ← (sin cambios — Express del backend Node)
├── package.json           ← (sin cambios)
├── routes/tickets.js      ← (sin cambios)
└── backup_index_v24.html  ← Backup de la versión 2.4 anterior
```

---

## ⚙️ Instalación paso a paso

### PASO 1 — Hoja Google Sheets `database`

Abre tu spreadsheet [aquí](https://docs.google.com/spreadsheets/d/19bqTde5-Yf6P7B6IkcJ2tkb_xM9lH9hvSlR6LFvm_TY/edit) y en la hoja **`database`** asegúrate de tener estas columnas en la fila 1:

| A | B | C | D | E |
|---|---|---|---|---|
| **USUARIO** | **NOMBRE** | **ACTIVO** | **PASSWORD_HASH** | **NIVEL** |

Ejemplo de filas:

| USUARIO | NOMBRE | ACTIVO | PASSWORD_HASH | NIVEL |
|---------|--------|--------|---------------|-------|
| wanderson | Wanderson | SI | _(vacío en alta inicial)_ | admin |
| juan | Juan García | SI | _(vacío)_ | usuario 1 |
| maria | María López | SI | _(vacío)_ | usuario 2 |
| pedro | Pedro Sánchez | NO | _(vacío)_ | usuario 1 |

> ⚠️ Nombres de columnas **EXACTAMENTE** así, en mayúsculas. El código las busca por nombre, no por posición.

> 💡 Dejar `PASSWORD_HASH` vacío activa el flujo de "primer acceso" — el usuario crea su contraseña al entrar por primera vez.

### PASO 2 — Apps Script

1. Abre [script.google.com](https://script.google.com) → tu proyecto SAD
2. Backup del Code.gs actual (copia y guárdalo en un .txt)
3. Reemplaza el contenido de **Code.gs** por el del archivo `Code.gs` de este repo
4. **CRÍTICO:** Localiza `procesarTicket()` y dentro:
   - Reemplaza `'TU_FOLDER_ID_AQUI'` por el ID real de tu carpeta Drive de tickets
   - Si tu lógica original era distinta (otro orden de columnas, otra hoja, etc.), adapta el cuerpo
5. Guarda (Ctrl+S)
6. **Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva versión → Actualizar**

### PASO 3 — Subir el repo a GitHub

Opción A (interfaz web):
1. Crea un repo nuevo en GitHub: `nexo-tickets`
2. Sube todos los archivos de la carpeta arrastrándolos

Opción B (línea de comandos):
```bash
cd nexo-tickets
git init
git add .
git commit -m "init: Nexo SAD Tickets v2.5 con auth y niveles"
git branch -M main
git remote add origin https://github.com/coelhocolatino/nexo-tickets.git
git push -u origin main
```

### PASO 4 — Activar GitHub Pages

`Settings → Pages → Source: main / (root) → Save`

URL pública: `https://coelhocolatino.github.io/nexo-tickets/login.html`

### PASO 5 — Pruebas antes de avisar

1. Abre la URL en navegador (no en app instalada)
2. Test usuario nuevo → crear contraseña → entrar
3. Verificar que cada nivel ve los campos correctos:
   - **admin**: todo desbloqueado
   - **usuario 1**: fecha gris (hoy) y repartidor gris (su nombre)
   - **usuario 2**: fecha gris (hoy), repartidor desbloqueado
4. Subir un ticket completo
5. Verificar que se guarda en la hoja correctamente
6. Cerrar sesión → entrar de nuevo con la contraseña creada

### PASO 6 — Avisar a los repartidores

> _"App actualizada. La próxima vez que la abráis, os pedirá crear una contraseña personal (solo la primera vez). Cualquier problema, avisad."_

---

## 🔄 Rollback rápido

**HTML/Frontend:**
```bash
git revert HEAD --no-edit && git push
```

**Apps Script:**
Implementar → Administrar → seleccionar versión anterior → Actualizar.

---

## 🛠️ Variables y constantes a revisar

En **`Code.gs`**:
- `SpreadsheetApp.openById('19bqTde5-...')` → ya está apuntado a tu hoja
- `'TU_FOLDER_ID_AQUI'` en `procesarTicket()` → ⚠️ pon tu folder real
- Nombres de hojas: `database`, `tickets`, `config` → adáptalos si se llaman distinto

En **`login.html`** y **`index.html`**:
- `BACKEND_URL` → tu URL de Apps Script (ya está)
- `PROXY` → tu Cloudflare Worker (ya está)

---

## 📦 Versionado

| v | Cambios |
|---|---------|
| 2.4 | Versión anterior (sin login, logo SR) |
| **2.5** | ✅ Login con auth · Logo Nexo · Optimización fotos · Niveles admin/usuario 1/usuario 2 |

---

_Nexo · Distribución Inteligente_
