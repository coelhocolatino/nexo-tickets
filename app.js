// ============================
// SAD Tickets - App.js (Versión Final Limpia)
// ============================

import express from "express";
import ticketRoutes from "./routes/tickets.js";

const app = express();
app.use(express.json());
app.use("/api/tickets", ticketRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

// 🔹 URL DEL PROXY (Cloudflare Workers)
const PROXY = "https://sad-proxy.colatino-ventas-enlinea.workers.dev/";

// 🔹 URL DE TU APP SCRIPT (backend principal)
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwTwp6Cc35zWr18MeSc9hkE18m0j_Km6S9mOv5kY-2AFrHnFivLLiplQTyQRL9ysg7R/exec";

// ====== SPINNER ======
function startSpinner() {
  const s = document.getElementById("spinner");
  if (s) s.style.visibility = "visible";
}

function stopSpinner() {
  const s = document.getElementById("spinner");
  if (s) s.style.visibility = "hidden";
}

// ====== ALERTA SIN CONEXIÓN ======
function showOfflineAlert() {
  const el = document.getElementById("offline-alert");
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 4000);
}

// ====== FECHA AUTOMÁTICA ======
(function initFechaHoy() {
  const hoy = new Date();
  const yyyy_mm_dd = hoy.toISOString().split("T")[0];
  document.getElementById("fecha").value = yyyy_mm_dd;
})();

// ====== CARGAR LISTAS DESDE GOOGLE SHEETS ======
async function cargarListas() {
  startSpinner();
  try {
    const proxyURL = `${PROXY}?url=${encodeURIComponent(BACKEND_URL)}`;
    const res = await fetch(proxyURL);
    const data = await res.json();

    fillSelect("tienda", data.tiendas);
    fillSelect("repartidor", data.repartidores);
    fillSelect("franja", data.franjas);
  } catch (err) {
    console.error("Error al cargar listas:", err);
    fillSelect("tienda", ["ERROR"]);
    fillSelect("repartidor", ["ERROR"]);
    fillSelect("franja", ["ERROR"]);
  } finally {
    stopSpinner();
  }
}

// ====== FUNCIÓN AUXILIAR PARA LLENAR SELECTS ======
function fillSelect(id, arr) {
  const el = document.getElementById(id);
  const defaultOpt = el.querySelector("option"); // guarda la primera opción
  el.innerHTML = ""; // limpia todo
  el.appendChild(defaultOpt); // vuelve a agregar el placeholder
  arr.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
}


// Llamar a cargar las listas al iniciar
cargarListas();

// ====== ENVÍO DE FORMULARIO (TICKET) ======
const formEl = document.getElementById("ticketForm");
// === Control de botones para foto ===
const fotoInput = document.getElementById("foto");
document.getElementById("btnCamara").addEventListener("click", () => {
  fotoInput.removeAttribute("capture"); // fuerza cámara
  fotoInput.setAttribute("capture", "environment");
  fotoInput.click();
});
document.getElementById("btnArchivo").addEventListener("click", () => {
  fotoInput.removeAttribute("capture"); // fuerza modo galería
  fotoInput.click();
});

const msgEl = document.getElementById("msg");

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  // ✅ Verificar conexión
  if (!navigator.onLine) {
    showOfflineAlert();
    return;
  }

  msgEl.textContent = "Subiendo...";
  startSpinner();

  const file = document.getElementById("foto").files[0];
  if (!file) {
    stopSpinner();
    msgEl.textContent = "❌ Falta la foto";
    msgEl.style.color = "#ffdddd";
    return;
  }

  const base64 = await fileToBase64(file);
  const formData = new FormData(formEl);
  const datos = Object.fromEntries(formData.entries());

  const payload = {
    fecha: datos.fecha,
    tienda: datos.tienda,
    repartidor: datos.repartidor,
    franja: datos.franja,
    pedidos: datos.pedidos,
    dobles: datos.dobles,
    xr: datos.xr,
    km: datos.km,           // 👈 nuevo campo
    obs: datos.obs || "",
    imagenBase64: base64
  };

  try {
// === USAR PROXY PARA EVITAR CORS ===
const proxyURL = `${PROXY}?url=${encodeURIComponent(BACKEND_URL)}`;
await fetch(proxyURL, {
  method: "POST",
  mode: "cors", // 👈 esto es importante
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});
    msgEl.textContent = "✅ Ticket enviado correctamente";
    msgEl.style.color = "#9dffb0";

    formEl.reset();
    // Restablecer fecha actual después del envío
    document.getElementById("fecha").value = new Date().toISOString().split("T")[0];
  } catch (err) {
    console.error(err);
    msgEl.textContent = "❌ Error al subir: " + err.message;
    msgEl.style.color = "#ffdddd";
  } finally {
    stopSpinner();
  }
});

// ====== CONVERTIR ARCHIVO A BASE64 ======
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function abrirCamara() {
  const input = document.getElementById("foto");
  input.setAttribute("capture", "environment");
  input.click();
}

function abrirArchivos() {
  const input = document.getElementById("foto");
  input.removeAttribute("capture");
  input.click();
}

