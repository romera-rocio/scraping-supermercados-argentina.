import requests
import re

# URL de la página del supermercado
url = "https://www.vea.com.ar/almacen"

# Descargar HTML
response = requests.get(url)
html = response.text

# Buscar una URL de RSS en el código fuente
rss_feed = re.findall(r'href=["\'](https?://.*?\.rss)["\']', html)

if rss_feed:
    print(f"✅ Feed RSS encontrado: {rss_feed[0]}")
else:
    print("❌ No se encontró un feed RSS.")
