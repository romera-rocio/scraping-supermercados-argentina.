import requests
import csv
import json

# URL base de la API de Carrefour
url = "https://www.carrefour.com.ar/_v/segment/graphql/v1"

# Headers para simular una solicitud real
headers = {
    "Accept": "application/json",
    "Accept-Language": "es-AR,es;q=0.9",
    "Content-Type": "application/json",
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"),
    "Referer": "https://www.carrefour.com.ar/"
}

# Función para extraer productos con paginación
def extraer_productos(busqueda, paginas=3, productos_por_pagina=15):
    output_file = f"productos_{busqueda.replace(' ', '_')}.csv"

    # Crear CSV con encabezados
    with open(output_file, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow([
            "ID Producto", "Nombre", "Marca", "EAN", "Precio Regular", "Precio Promoción",
            "Stock", "Unidad de Medida", "Precio por Unidad", "Etiquetas", "Promoción"
        ])

        for pagina in range(paginas):
            from_value = pagina * productos_por_pagina
            to_value = from_value + productos_por_pagina

            # Payload con la búsqueda
            payload = {
                "operationName": "productSearchV3",
                "variables": {
                    "hideUnavaliableItems": True,
                    "skusFilter": "ALL_AVAILABLE",
                    "simulationBehavior": "default",
                    "installmentCriteria": "MAX_WITHOUT_INTEREST",
                    "productOriginVtex": False,
                    "query": busqueda,
                    "orderBy": "OrderByScoreDESC",
                    "from": from_value,
                    "to": to_value,
                    "selectedFacets": [{"key": "ft", "value": busqueda}],
                    "facetsBehavior": "Static",
                    "categoryTreeBehavior": "default",
                    "withFacets": False,
                    "variant": "null-null",
                    "advertisementOptions": {
                        "showSponsored": True,
                        "sponsoredCount": 3,
                        "advertisementPlacement": "top_search",
                        "repeatSponsoredProducts": True
                    }
                },
                "extensions": {
                    "persistedQuery": {
                        "version": 1,
                        "sha256Hash": "9177ba6f883473505dc99fcf2b679a6e270af6320a157f0798b92efeab98d5d3",
                        "sender": "vtex.store-resources@0.x",
                        "provider": "vtex.search-graphql@0.x"
                    }
                }
            }

            # Realizar la solicitud a la API
            try:
                response = requests.post(url, headers=headers, json=payload)
                response.raise_for_status()  # Lanza un error si el status no es 200

                # Convertir respuesta a JSON
                data = response.json()
                products = data.get("data", {}).get("productSearch", {}).get("products", [])

                # Extraer los datos relevantes y guardarlos en el CSV
                for product in products:
                    product_id = product.get("productId", "No disponible")
                    nombre = product.get("productName", "No disponible")
                    marca = product.get("brand", "No disponible")

                    # Extraer EAN, precios, stock y promos
                    ean = "No disponible"
                    precio_regular = "No disponible"
                    precio_promocion = "No disponible"
                    stock = "No disponible"
                    unidad_medida = "No disponible"
                    precio_unidad = "No disponible"
                    etiquetas = []
                    promocion = "No disponible"

                    if product.get("items"):
                        item = product["items"][0]  # Seleccionar primer item
                        ean = item.get("ean", "No disponible")

                        sellers = item.get("sellers", [])
                        if sellers:
                            offer = sellers[0].get("commertialOffer", {})
                            precio_regular = offer.get("ListPrice", "No disponible")
                            precio_promocion = offer.get("Price", "No disponible")
                            stock = offer.get("AvailableQuantity", "No disponible")

                            # Extraer promociones activas
                            teasers = offer.get("teasers", [])
                            if teasers:
                                promocion = "; ".join([t.get("name", "") for t in teasers])

                    # Extraer etiquetas (Ej: "Exclusivo Online", "Mi CRF")
                    highlights = product.get("highlights", [])
                    if highlights:
                        etiquetas = [h.get("name", "No disponible") for h in highlights]

                    # Extraer unidad de medida y calcular precio por unidad
                    unidad_medida = product.get("measurementUnit", "No disponible")
                    multiplicador = product.get("unitMultiplier", 1)
                    if multiplicador > 0 and precio_promocion != "No disponible":
                        precio_unidad = round(precio_promocion / multiplicador, 2)

                    writer.writerow([
                        product_id, nombre, marca, ean, precio_regular, precio_promocion,
                        stock, unidad_medida, precio_unidad, ", ".join(etiquetas), promocion
                    ])

                print(f"✅ Página {pagina + 1} guardada correctamente en '{output_file}'")

            except requests.exceptions.RequestException as e:
                print(f"❌ Error en la página {pagina + 1}: {e}")

    print(f"📁 Todos los datos se han guardado en '{output_file}'")

# 🚀 **Ejemplo de Uso: Buscar Productos**
busqueda_usuario = input("🔍 Ingresa el producto a buscar: ")
paginas_a_extraer = int(input("📄 ¿Cuántas páginas deseas recorrer? "))

extraer_productos(busqueda_usuario, paginas=paginas_a_extraer)
