import requests
from bs4 import BeautifulSoup, NavigableString
import pandas as pd

"""
Este script descarga el HTML y extrae los productos:
1) Encuentra los contenedores más repetidos automáticamente.
2) Extrae cada línea de texto dentro de su contenedor.
3) Asigna el selector real basado en su estructura HTML.
4) Filtra solo los productos sin necesidad de heurísticas manuales.
5) Guarda la información estructurada en CSV.
"""

# Función para construir el selector real
def build_css_selector(element):
    """
    Construye un selector CSS completo basado en la jerarquía del DOM.
    """
    parts = []
    while element and element.name != "html":
        part = element.name
        if element.has_attr("id"):
            part += "#" + element["id"].strip()
        if element.has_attr("class"):
            class_str = ".".join(cls for cls in element["class"] if cls.strip())
            if class_str:
                part += "." + class_str
        parts.append(part)
        element = element.parent
    return " > ".join(reversed(parts))

# URL de ejemplo
url = "https://www.dinoonline.com.ar/super/categoria/supermami-almacen/_/N-1tjm8rd"

headers = {"User-Agent": "Mozilla/5.0"}
r = requests.get(url, headers=headers)
r.raise_for_status()
soup = BeautifulSoup(r.text, "html.parser")

# Encontrar todos los contenedores relevantes
contenedores = soup.find_all("div")
contenedor_counts = {}  # Para contar la frecuencia de cada tipo de contenedor

# Contar la repetición de estructuras
for contenedor in contenedores:
    key = build_css_selector(contenedor)
    contenedor_counts[key] = contenedor_counts.get(key, 0) + 1

# Filtrar solo los contenedores más repetidos (asumiendo que son productos)
umbral_repeticion = pd.Series(contenedor_counts).median()
contenedores_relevantes = [key for key, count in contenedor_counts.items() if count >= umbral_repeticion]

# Extraer los productos con sus selectores reales
productos = []
for contenedor in contenedores:
    key = build_css_selector(contenedor)
    if key in contenedores_relevantes:
        for nodo in contenedor.descendants:
            if isinstance(nodo, NavigableString):
                texto = nodo.strip()
                if texto:
                    productos.append({
                        "selector": key,
                        "texto": texto
                    })

# Convertir en DataFrame y guardar a CSV
df = pd.DataFrame(productos)
df.to_csv("productos_supermercado.csv", index=False)

print("✅ Datos extraídos y guardados en 'productos_supermercado.csv'")
