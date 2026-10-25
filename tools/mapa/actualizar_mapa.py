#!/usr/bin/env python3
"""
Regenera mapa/datos.json preguntando al notebook de NotebookLM "NexoAPP".

Se ejecuta con el Python de la skill notebooklm (tiene patchright y la sesión
de Google ya guardada):

    ~/.claude/skills/notebooklm/.venv/bin/python tools/mapa/actualizar_mapa.py

Cada sección se pide por separado. Si una respuesta no es JSON válido o no
tiene la forma esperada, se conserva la versión anterior de esa sección, así
la página nunca queda rota.
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

SKILL_SCRIPTS = Path.home() / ".claude/skills/notebooklm/scripts"
sys.path.insert(0, str(SKILL_SCRIPTS))

NOTEBOOK_URL = "https://notebook.google.com/notebook/4b5dd91b-0cd3-4314-91ab-fa8643c313d5"
REPO = Path(__file__).resolve().parents[2]
DATOS = REPO / "mapa" / "datos.json"

COMPONENTES = (
    "pwa (pantallas HTML en el móvil), sw (Service Worker), idb (IndexedDB), "
    "ghpages (GitHub Pages), proxy (Cloudflare Worker sad-proxy), "
    "nexo_script (Apps Script NEXO SCRIPT), nexo_reservas (Apps Script NEXO RESERVAS), "
    "trigger (trigger ACTUALIZAR CONTROL DE TICKETS), sheets (Google Sheets), "
    "drive (Google Drive), looker (Looker Studio), push (FCM / Apple Web Push), "
    "portal_dia (portal SAD Día)"
)

REGLA = (
    " Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, "
    "sin markdown y sin números de cita. Textos en español, breves y concretos."
)

SECCIONES = {
    "general": {
        "pregunta": (
            "Sobre NexoApp: devuelve un JSON con esta forma exacta: "
            '{"resumen": "2 frases sobre qué es y para qué sirve", '
            '"empresa": "nombre de la empresa", '
            '"departamentos": ["..."], '
            '"roles": [{"nivel": "admin | usuario 1 | ...", "fecha": "...", "repartidor": "...", '
            '"franjas": "...", "uso": "para quién es"}], '
            '"permisos": [{"nombre": "columna de USUARIOS", "descripcion": "..."}]}. '
            "Incluye todos los niveles de usuario y todos los flags de permisos."
        ),
        "claves": {"resumen": str, "roles": list},
    },
    "arquitectura": {
        "pregunta": (
            "Sobre NexoApp: devuelve un JSON con esta forma exacta: "
            '{"pantallas": [{"archivo": "x.html", "nombre": "nombre corto", '
            '"modulo": "Acceso | Tickets | Incidencias | Reservas | Embolsado | Gestión | Informes", '
            '"descripcion": "qué hace"}], '
            '"componentes": [{"id": "uno de los ids", "nombre": "...", '
            '"capa": "Móvil | Hosting | Proxy | Backend | Datos | Externo", '
            '"descripcion": "..."}], '
            '"conexiones": [{"desde": "id", "hacia": "id", "etiqueta": "qué viaja"}]}. '
            "Usa solo estos ids de componente: " + COMPONENTES + ". "
            "Incluye todas las pantallas HTML de la app."
        ),
        "claves": {"pantallas": list, "componentes": list, "conexiones": list},
    },
    "flujos": {
        "pregunta": (
            "Sobre NexoApp: describe todos los flujos de funcionamiento (login, subida de foto de ticket "
            "con cola offline e idempotencia, registro de entregas, incidencias, reservas y límites, "
            "reservas automáticas, avisos push, sincronización con portal SAD Día, trigger cada 5 minutos, "
            "informes de Looker Studio, embolsado). Devuelve un JSON con esta forma exacta: "
            '{"flujos": [{"id": "slug-corto", "titulo": "...", "resumen": "1 frase", '
            '"pasos": [{"texto": "qué ocurre", "componentes": ["ids"]}]}]}. '
            "Usa solo estos ids de componente: " + COMPONENTES + "."
        ),
        "claves": {"flujos": list},
    },
    "datos": {
        "pregunta": (
            "Sobre NexoApp: devuelve un JSON con esta forma exacta: "
            '{"hojas": [{"nombre": "nombre de la hoja", "descripcion": "...", "columnas": ["..."]}], '
            '"drive": [{"nombre": "carpeta", "descripcion": "..."}], '
            '"automatizaciones": [{"nombre": "...", "frecuencia": "...", "descripcion": "..."}]}. '
            "Incluye todas las hojas de Google Sheets con sus columnas principales."
        ),
        "claves": {"hojas": list, "automatizaciones": list},
    },
}


def extraer_json(texto):
    """Saca el objeto JSON de la respuesta, quitando las marcas de cita de NotebookLM."""
    lineas = [
        l for l in texto.splitlines()
        if not re.fullmatch(r"\s*(\d+|\.|,|more_horiz|expand_more|Thoughts)\s*", l)
    ]
    limpio = "\n".join(lineas)
    inicio, fin = limpio.find("{"), limpio.rfind("}")
    if inicio == -1 or fin == -1:
        raise ValueError("la respuesta no contiene JSON")
    datos = json.loads(limpio[inicio:fin + 1], strict=False)
    return normalizar(datos)


def normalizar(valor):
    if isinstance(valor, str):
        return re.sub(r"\s+", " ", valor).strip()
    if isinstance(valor, list):
        return [normalizar(v) for v in valor]
    if isinstance(valor, dict):
        return {k: normalizar(v) for k, v in valor.items()}
    return valor


def validar(datos, claves):
    for clave, tipo in claves.items():
        if not isinstance(datos.get(clave), tipo) or not datos[clave]:
            raise ValueError(f"falta '{clave}' o está vacío")


def main():
    parser = argparse.ArgumentParser(description="Actualiza mapa/datos.json desde NotebookLM")
    parser.add_argument("--solo", choices=SECCIONES, nargs="*", help="Secciones a actualizar")
    args = parser.parse_args()

    from ask_question import ask_notebooklm

    actual = json.loads(DATOS.read_text()) if DATOS.exists() else {}
    secciones = args.solo or list(SECCIONES)
    resultado = {"actualizadas": [], "fallidas": {}}

    for nombre in secciones:
        cfg = SECCIONES[nombre]
        print(f"→ {nombre}")
        respuesta = ask_notebooklm(cfg["pregunta"] + REGLA, NOTEBOOK_URL, headless=True)
        try:
            if not respuesta:
                raise ValueError("NotebookLM no respondió")
            datos = extraer_json(respuesta.split("EXTREMELY IMPORTANT")[0])
            validar(datos, cfg["claves"])
        except Exception as e:
            print(f"  ✗ {nombre}: {e} (se conserva la versión anterior)")
            resultado["fallidas"][nombre] = str(e)
            continue
        actual[nombre] = datos
        resultado["actualizadas"].append(nombre)
        print(f"  ✓ {nombre}")

    if resultado["actualizadas"]:
        actual["meta"] = {
            "actualizado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "fuente": "NotebookLM · notebook NexoAPP",
            "secciones": {
                **actual.get("meta", {}).get("secciones", {}),
                **{s: datetime.now(timezone.utc).isoformat(timespec="seconds") for s in resultado["actualizadas"]},
            },
        }
        DATOS.parent.mkdir(parents=True, exist_ok=True)
        DATOS.write_text(json.dumps(actual, ensure_ascii=False, indent=2) + "\n")

    print(json.dumps(resultado, ensure_ascii=False))
    return 0 if not resultado["fallidas"] else 2


if __name__ == "__main__":
    sys.exit(main())
