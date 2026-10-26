# NEXO APP — Instrucciones para Claude

App de reparto (PWA «Nexo Tickets») para repartidores, embolsado y administración. Dueño: Wanderson (habla español y portugués; responder en español).

## Arquitectura (no romper)
- Frontend: HTML/JS en GitHub Pages (`coelhocolatino/nexo-tickets`, rama `main`). Sin framework ni build.
- Backends: Google Apps Script (NEXO SCRIPT, Control de tickets, Reservas, Día, Embolsado) + Google Sheets + Drive. Proxy en Cloudflare (`sad-proxy`).
- El módulo Embolsado es una web app de Apps Script (`App.html` + `code.js` + `Embolsado.js`), se despliega pegando el código en Apps Script y creando una nueva versión de la implementación.
- Sesión: `sessionStorage 'sad_user'` {usuario, nombre, token, nivel, departamento, tiendaPre}.
- Permisos: admin (`nivel=admin`), departamento EMBOLSADO, tienda TRAVESIA (Asignar/Reservas).
- En la hoja DATABASE, la columna 43 (FECHA EMISIÓN) no se toca.
- Cada cambio de HTML sube la versión en `version.json` y el `data-version` de la página; si cambia un archivo cacheado, sube también `CACHE_NAME` en `service-worker.js`.

## Diseño: mantener el padrón visual actual
Es una decisión del usuario y manda sobre cualquier skill de diseño.
- Usar los tokens `--nx-*` de `nexo-tema.css` y las tipografías Big Shoulders Display (títulos) y Hanken Grotesk (texto). No introducir otras fuentes, paletas ni estilos nuevos.
- Reutilizar los componentes existentes (tarjetas, botones, chips, cabecera `header.nx-cab`, barra `nexo-nav.js`, `NexoFoto`).
- Mobile primero: se usa con una mano en el móvil, con guantes o prisa. Botones grandes, objetivos táctiles cómodos y mucha información legible a la vez.
- Poca animación. Nada decorativo que retrase una tarea operativa.
- Cualquier cambio visual nuevo o rediseño de página se presenta primero como lienzo (mockup con el CSS real) y no se programa hasta que Wanderson lo apruebe.

### Excepción: módulo Jessica (decisión de Wanderson, 27/10/2026)
Solo `jessica.html` y el panel de Jessica tienen estética propia, «Kinetic»: fondo con degradado en movimiento y partículas suaves, tarjetas de cristal (glassmorphism), insignia que late, botones con brillo y efecto imán, y respuesta visual a la voz.
- Mantiene los colores (`--nx-*`) y las fuentes de Nexo.
- Textos operativos legibles, botones grandes, ninguna animación que retrase una orden; todo el movimiento se apaga con `prefers-reduced-motion`. Debe ir fluido en móviles sencillos.
- Del estilo «Kinetic» se toma el aspecto, no textos de marketing.
- El resto de NEXO sigue con el diseño de siempre y la regla de «poca animación».

## Skills de diseño instaladas (globales)
Se instalan en `~/.claude/skills`. Su uso aquí está limitado:
- **web-design-guidelines (Vercel)**: solo para auditar accesibilidad y consistencia (`archivo:línea`). Los hallazgos se proponen; no se aplican cambios de aspecto sin aprobación. Arreglos de accesibilidad que no cambian el aspecto (etiquetas `aria-label`, foco visible, tamaños de imagen) pueden proponerse en bloque.
- **design-taste-frontend**: solo como criterio, con ajustes bajos: variación baja, movimiento mínimo, densidad visual alta. Nunca para reemplazar el estilo actual.
- **image-to-code**: se usa cuando Wanderson trae una imagen o un lienzo aprobado. Se construye sobre los tokens y componentes de Nexo.
- **DESIGN.md (awesome-design-md)**: no se usa en este proyecto, salvo que Wanderson lo pida para cambiar de estética.

## Forma de trabajar
- Hacer una copia de seguridad antes de cada ronda grande de cambios.
- Entregar por pasos y esperar «ok» antes de seguir con el siguiente.
- Verificar con una sesión de prueba y datos simulados antes de entregar (Playwright con `google.script.run` simulado). Decir claramente qué no se ha podido probar con la hoja real o en un móvil.
- No subir a GitHub ni desplegar en Apps Script sin que Wanderson lo pida. Indicar siempre qué archivos subir y dónde pegarlos.
- Respuestas breves y en español, sin recapitular los pasos.
- No tocar datos reales de Sheets sin avisar.

## Reglas de negocio ya acordadas
- Un pedido queda «listo para asignar» solo con estado CONFIRMADO y con nevera, fríos y congelados rellenos (0 cuenta como relleno).
- «N.F.», «NO FRIO» o «SIN FRIO» en un ticket se interpretan como 0/0/0.
- Incidencia CLIENTE_AUSENTE: mínimo 1 llamada registrada y 1 foto del portal; la tienda es obligatoria.
- Ocultar el número al llamar (`#31#`) es un interruptor por teléfono en Config (`localStorage 'nexo_ocultar_numero'`); depende del operador.
- La cola de lectura OCR de Embolsado funciona mientras se está dentro del módulo; al salir se retoma al volver.
