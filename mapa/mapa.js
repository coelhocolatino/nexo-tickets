// ==============================
// Mapa de NexoApp — se dibuja entero desde datos.json
// (lo regenera tools/mapa/actualizar_mapa.py preguntando a NotebookLM)
// ==============================
(() => {
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const arr = (v) => (Array.isArray(v) ? v : []);
  const VISTAS = ["mapa", "arquitectura", "flujos", "pantallas", "datos"];
  const RAMAS = ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6"];

  let D = {};
  let compPorId = {};
  let flujoActual = null;
  let filtroComp = null;
  let filtroModulo = null;
  let timer = null;

  // ---------- Carga ----------
  async function cargar() {
    try {
      const res = await fetch("datos.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      D = await res.json();
    } catch (e) {
      $("#estado").textContent = "No se pudieron cargar los datos";
      $("#resumen").textContent = "No se encontró datos.json. Ejecuta tools/mapa/actualizar_mapa.py para generarlo.";
      return;
    }
    compPorId = Object.fromEntries(arr(D.arquitectura?.componentes).map((c) => [c.id, c]));
    pintarEstado();
    $("#resumen").textContent = D.general?.resumen || "";
    pintarMapa();
    pintarArquitectura();
    pintarFlujos();
    pintarPantallas();
    pintarDatos();
    pintarPie();
    abrirVista(location.hash.slice(1));
  }

  function haceCuanto(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    if (!isFinite(ms)) return "";
    const dias = Math.floor(ms / 86400000);
    if (dias >= 1) return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
    const horas = Math.floor(ms / 3600000);
    if (horas >= 1) return `hace ${horas} h`;
    return "hace un momento";
  }

  function pintarEstado() {
    const iso = D.meta?.actualizado;
    $("#estado").textContent = iso ? `Actualizado ${haceCuanto(iso)}` : "Sin fecha de actualización";
    if (iso) $("#estado").title = new Date(iso).toLocaleString("es-ES");
  }

  function pintarPie() {
    const iso = D.meta?.actualizado;
    $("#pie").innerHTML =
      `Datos generados desde ${esc(D.meta?.fuente || "NotebookLM")}` +
      (iso ? ` el ${esc(new Date(iso).toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" }))}` : "") +
      ". Se basan en la documentación del notebook, no en el código: si algo no coincide, manda el código.";
  }

  // ---------- Vistas ----------
  function abrirVista(nombre) {
    if (!VISTAS.includes(nombre)) nombre = "mapa";
    VISTAS.forEach((v) => {
      $("#vista-" + v).hidden = v !== nombre;
      $("#tab-" + v).setAttribute("aria-selected", String(v === nombre));
    });
    if (location.hash.slice(1) !== nombre) history.replaceState(null, "", "#" + nombre);
    if (nombre === "arquitectura") dibujarDiagrama();
  }
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => abrirVista(b.dataset.vista)));
  window.addEventListener("hashchange", () => abrirVista(location.hash.slice(1)));

  // ---------- Mapa mental ----------
  function hoja(texto, detalle) {
    return { t: texto, d: detalle };
  }
  function agrupar(lista, clave, fn) {
    const grupos = {};
    lista.forEach((x) => (grupos[x[clave] || "Otros"] ??= []).push(fn(x)));
    return Object.entries(grupos).map(([t, hijos]) => ({ t, hijos }));
  }
  function arbol() {
    const g = D.general || {}, a = D.arquitectura || {}, d = D.datos || {};
    return {
      t: "NexoApp",
      hijos: [
        { t: "Usuarios", hijos: [
          { t: "Niveles", hijos: arr(g.roles).map((r) => hoja(r.nivel, r.uso)) },
          { t: "Departamentos", hijos: arr(g.departamentos).map((x) => hoja(x)) },
          { t: "Permisos", hijos: arr(g.permisos).map((p) => hoja(p.nombre, p.descripcion)) },
        ] },
        { t: "Pantallas", hijos: agrupar(arr(a.pantallas), "modulo", (p) => hoja(p.archivo, p.descripcion)) },
        { t: "Tecnología", hijos: agrupar(arr(a.componentes), "capa", (c) => hoja(c.nombre, c.descripcion)) },
        { t: "Flujos", hijos: arr(D.flujos?.flujos).map((f) => hoja(f.titulo, f.resumen)) },
        { t: "Datos", hijos: [
          { t: "Google Sheets", hijos: arr(d.hojas).map((h) => hoja(h.nombre, h.descripcion)) },
          { t: "Google Drive", hijos: arr(d.drive).map((x) => hoja(x.nombre, x.descripcion)) },
        ] },
        { t: "Automatizaciones", hijos: arr(d.automatizaciones).map((x) => hoja(x.nombre, [x.frecuencia, x.descripcion].filter(Boolean).join(" · "))) },
      ],
    };
  }
  function nodoHTML(n, nivel, rama) {
    const etiqueta = `<span class="node">${esc(n.t)}${n.d ? ` <small>· ${esc(n.d)}</small>` : ""}</span>`;
    const estilo = rama ? ` style="--branch: var(${rama})"` : "";
    const cls = nivel === 0 ? "root" : nivel === 1 ? "rama" : "";
    if (!n.hijos || !n.hijos.length) return `<li class="${cls}" data-txt="${esc((n.t + " " + (n.d || "")).toLowerCase())}"${estilo}>${etiqueta}</li>`;
    const hijos = n.hijos.map((h, i) => nodoHTML(h, nivel + 1, rama || RAMAS[i % RAMAS.length])).join("");
    return `<li class="${cls}" data-txt="${esc(n.t.toLowerCase())}"${estilo}><details${nivel < 1 ? " open" : ""}><summary>${etiqueta}</summary><ul>${hijos}</ul></details></li>`;
  }
  function pintarMapa() {
    $("#mind").innerHTML = `<ul>${nodoHTML(arbol(), 0, null)}</ul>`;
  }
  $("#abrir-todo").addEventListener("click", () => document.querySelectorAll("#mind details").forEach((d) => (d.open = true)));
  $("#cerrar-todo").addEventListener("click", () => document.querySelectorAll("#mind details").forEach((d, i) => (d.open = i === 0)));

  // ---------- Arquitectura ----------
  const limpio = (s) => String(s ?? "").replace(/["`\[\]{}()<>|#;]/g, " ").replace(/\s+/g, " ").trim();
  let diagramaHecho = false;
  async function dibujarDiagrama() {
    if (diagramaHecho || !window.mermaid) return;
    const a = D.arquitectura || {};
    const capas = {};
    arr(a.componentes).forEach((c) => (capas[c.capa || "Otros"] ??= []).push(c));
    let src = "flowchart TB\n";
    Object.entries(capas).forEach(([capa, comps], i) => {
      src += `  subgraph capa${i}["${limpio(capa)}"]\n    direction LR\n`;
      comps.forEach((c) => (src += `    ${c.id}["${limpio(c.nombre)}"]\n`));
      src += "  end\n";
    });
    arr(a.conexiones).forEach((x) => {
      if (compPorId[x.desde] && compPorId[x.hacia]) src += `  ${x.desde} -->|${limpio(x.etiqueta) || " "}| ${x.hacia}\n`;
    });
    const oscuro = matchMedia("(prefers-color-scheme: dark)").matches;
    mermaid.initialize({ startOnLoad: false, theme: oscuro ? "dark" : "default", securityLevel: "strict" });
    try {
      const { svg } = await mermaid.render("arq-svg", src);
      $("#arq-diagrama").innerHTML = `<div class="mermaid">${svg}</div>`;
      diagramaHecho = true;
    } catch (e) {
      $("#arq-diagrama").innerHTML = `<p class="vacio">No se pudo dibujar el diagrama con los datos actuales.</p>`;
    }
  }
  function flujosDe(id) {
    return arr(D.flujos?.flujos).filter((f) => arr(f.pasos).some((p) => arr(p.componentes).includes(id)));
  }
  function pintarArquitectura() {
    $("#componentes").innerHTML = arr(D.arquitectura?.componentes).map((c) => {
      const usos = flujosDe(c.id);
      return `<button class="panel comp" data-id="${esc(c.id)}" aria-pressed="false" data-txt="${esc((c.nombre + " " + c.descripcion).toLowerCase())}">
        <span class="capa">${esc(c.capa)}</span><b>${esc(c.nombre)}</b><p>${esc(c.descripcion)}</p>
        <span class="usos">${usos.length ? `En ${usos.length} flujo${usos.length > 1 ? "s" : ""} →` : "Sin flujos asociados"}</span></button>`;
    }).join("");
    document.querySelectorAll(".comp").forEach((b) => b.addEventListener("click", () => {
      filtroComp = b.dataset.id;
      pintarFiltroComp();
      pintarListaFlujos();
      abrirVista("flujos");
    }));
  }

  // ---------- Flujos ----------
  function pintarFiltroComp() {
    const usados = [...new Set(arr(D.flujos?.flujos).flatMap((f) => arr(f.pasos).flatMap((p) => arr(p.componentes))))].filter((id) => compPorId[id]);
    $("#filtro-comp").innerHTML =
      `<button class="chip" data-id="" aria-pressed="${!filtroComp}">Todos</button>` +
      usados.map((id) => `<button class="chip" data-id="${esc(id)}" aria-pressed="${filtroComp === id}">${esc(compPorId[id].nombre)}</button>`).join("");
    $("#filtro-comp").querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
      filtroComp = b.dataset.id || null;
      pintarFiltroComp();
      pintarListaFlujos();
    }));
  }
  function pintarListaFlujos() {
    const lista = filtroComp ? flujosDe(filtroComp) : arr(D.flujos?.flujos);
    if (!lista.find((f) => f.id === flujoActual)) flujoActual = lista[0]?.id || null;
    $("#lista-flujos").innerHTML = lista.length
      ? lista.map((f) => `<li data-txt="${esc((f.titulo + " " + f.resumen + " " + arr(f.pasos).map((p) => p.texto).join(" ")).toLowerCase())}"><button data-id="${esc(f.id)}" aria-current="${f.id === flujoActual}"><b>${esc(f.titulo)}</b><small>${arr(f.pasos).length} pasos</small></button></li>`).join("")
      : `<li class="vacio">Ningún flujo usa este componente.</li>`;
    $("#lista-flujos").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      flujoActual = b.dataset.id;
      pintarListaFlujos();
    }));
    pintarDetalleFlujo();
  }
  function pintarDetalleFlujo() {
    clearInterval(timer);
    const f = arr(D.flujos?.flujos).find((x) => x.id === flujoActual);
    if (!f) { $("#detalle-flujo").innerHTML = `<p class="vacio">Elige un flujo.</p>`; return; }
    $("#detalle-flujo").innerHTML = `
      <h3>${esc(f.titulo)}</h3>
      <p class="muted">${esc(f.resumen)}</p>
      <div class="player">
        <button class="btn" id="reproducir">▶ Recorrer paso a paso</button>
        <button class="btn" id="anterior" aria-label="Paso anterior">←</button>
        <button class="btn" id="siguiente" aria-label="Paso siguiente">→</button>
        <span class="muted" id="paso-n"></span>
      </div>
      <ol class="steps">${arr(f.pasos).map((p) => `<li><p>${esc(p.texto)}</p><div class="tags">${arr(p.componentes).map((id) => `<span class="tag">${esc(compPorId[id]?.nombre || id)}</span>`).join("")}</div></li>`).join("")}</ol>`;
    const pasos = [...document.querySelectorAll("#detalle-flujo .steps li")];
    let i = -1;
    const ir = (n) => {
      i = Math.max(0, Math.min(pasos.length - 1, n));
      pasos.forEach((li, k) => { li.classList.toggle("dim", k > i); li.classList.toggle("now", k === i); });
      $("#paso-n").textContent = `Paso ${i + 1} de ${pasos.length}`;
    };
    $("#anterior").addEventListener("click", () => { clearInterval(timer); ir(i - 1); });
    $("#siguiente").addEventListener("click", () => { clearInterval(timer); ir(i + 1); });
    $("#reproducir").addEventListener("click", () => {
      clearInterval(timer);
      ir(0);
      timer = setInterval(() => (i >= pasos.length - 1 ? clearInterval(timer) : ir(i + 1)), 1800);
    });
  }
  function pintarFlujos() {
    pintarFiltroComp();
    pintarListaFlujos();
  }

  // ---------- Pantallas y roles ----------
  function pintarPantallas() {
    const g = D.general || {};
    $("#tabla-roles").innerHTML =
      "<thead><tr><th>Nivel</th><th>Fecha</th><th>Repartidor</th><th>Franjas</th><th>Para quién</th></tr></thead><tbody>" +
      arr(g.roles).map((r) => `<tr><td>${esc(r.nivel)}</td><td>${esc(r.fecha)}</td><td>${esc(r.repartidor)}</td><td>${esc(r.franjas)}</td><td>${esc(r.uso)}</td></tr>`).join("") +
      "</tbody>";
    $("#permisos").innerHTML = arr(g.permisos).map((p) => `<span class="tag" title="${esc(p.descripcion)}">${esc(p.nombre)}</span>`).join("");
    const pantallas = arr(D.arquitectura?.pantallas);
    const modulos = [...new Set(pantallas.map((p) => p.modulo).filter(Boolean))];
    const pintarChips = () => {
      $("#filtro-modulo").innerHTML =
        `<button class="chip" data-m="" aria-pressed="${!filtroModulo}">Todas</button>` +
        modulos.map((m) => `<button class="chip" data-m="${esc(m)}" aria-pressed="${filtroModulo === m}">${esc(m)}</button>`).join("");
      $("#filtro-modulo").querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
        filtroModulo = b.dataset.m || null;
        pintarChips();
        document.querySelectorAll("#pantallas .card").forEach((c) => (c.hidden = !!filtroModulo && c.dataset.m !== filtroModulo));
        aplicarBusqueda();
      }));
    };
    pintarChips();
    $("#pantallas").innerHTML = pantallas.map((p) => `
      <div class="panel card" data-m="${esc(p.modulo)}" data-txt="${esc((p.archivo + " " + p.nombre + " " + p.descripcion).toLowerCase())}">
        <span class="mod">${esc(p.modulo)}</span><h3>${esc(p.archivo)}</h3><p>${esc(p.descripcion)}</p></div>`).join("");
  }

  // ---------- Datos ----------
  function pintarDatos() {
    const d = D.datos || {};
    $("#hojas").innerHTML = arr(d.hojas).map((h) => `
      <div class="panel card" data-txt="${esc((h.nombre + " " + h.descripcion + " " + arr(h.columnas).join(" ")).toLowerCase())}">
        <h3>${esc(h.nombre)}</h3><p>${esc(h.descripcion)}</p>
        ${arr(h.columnas).length ? `<span class="cols">${arr(h.columnas).map(esc).join(" · ")}</span>` : ""}</div>`).join("");
    $("#drive").innerHTML = arr(d.drive).map((x) => `
      <div class="panel card" data-txt="${esc((x.nombre + " " + x.descripcion).toLowerCase())}"><h3>${esc(x.nombre)}</h3><p>${esc(x.descripcion)}</p></div>`).join("");
    $("#autos").innerHTML = arr(d.automatizaciones).map((x) => `
      <div class="panel card" data-txt="${esc((x.nombre + " " + x.descripcion).toLowerCase())}"><span class="mod">${esc(x.frecuencia)}</span><h3>${esc(x.nombre)}</h3><p>${esc(x.descripcion)}</p></div>`).join("");
  }

  // ---------- Búsqueda ----------
  function aplicarBusqueda() {
    const q = $("#buscar").value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll("#mind li").forEach((li) => li.classList.remove("hit"));
    if (q) {
      document.querySelectorAll("#mind li[data-txt]").forEach((li) => {
        if (li.dataset.txt.includes(q) && !li.classList.contains("root")) {
          li.classList.add("hit"); n++;
          let p = li.parentElement.closest("details");
          while (p) { p.open = true; p = p.parentElement.closest("details"); }
        }
      });
    }
    document.querySelectorAll(".card[data-txt], .comp[data-txt], #lista-flujos li[data-txt]").forEach((el) => {
      const porModulo = el.closest("#pantallas") && filtroModulo && el.dataset.m !== filtroModulo;
      const coincide = !q || el.dataset.txt.includes(q);
      el.hidden = porModulo || !coincide;
      if (q && coincide && !porModulo) n++;
    });
    $("#buscar-n").textContent = q ? `${n} resultado${n === 1 ? "" : "s"}` : "";
  }
  $("#buscar").addEventListener("input", aplicarBusqueda);

  cargar();
})();
