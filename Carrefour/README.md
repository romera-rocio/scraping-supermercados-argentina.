# Carrefour: scrapers de productos y precios

Scrapers de [carrefour.com.ar](https://www.carrefour.com.ar) para obtener productos, precios,
promociones e imágenes.

## Versiones

| Versión | Fecha | Tecnología | Descripción |
|---|---|---|---|
| `v1_2024-10-07_python BeautifulSoup` | 07/10/2024 | Python · BeautifulSoup (Colab) | Notebook que lee una lista de productos (`mi_lista.xlsx`) y devuelve `productos.xlsx`. |
| `v2_2024-10-30_SSJ (JavaScript)` | 30/10/2024 | Node · Playwright · xlsx | Scraper con navegador. Selectores y URL en `carrefour.json`. Se usa desde el menú de `_Varios supermercados/v2`. |
| **`v3_2025-02-21_proyecto E-commerce`** ⭐ | 21/02/2025 | Python · requests · Jupyter | Proyecto completo (detalles abajo). |

### v3: proyecto E-commerce
- `carre.py`: **la forma más rápida**. Consulta directamente la **API GraphQL de VTEX** de
  Carrefour (sin navegador). Pide un producto y una cantidad de páginas, y genera
  `productos_<busqueda>.csv`.
- `care.js`: la misma consulta a la API desde Node (`node-fetch`).
- Notebooks en orden:
  1. `1.Scraping-Carrefour_Product_Links.ipynb`: junta los links de productos.
  2. `2.Scraping-Carrefour_Products.ipynb`: datos de cada producto.
  3. `3.Saving_Product_Images.ipynb`: descarga las imágenes.
  4. `4.Price_Extraction.ipynb`: extrae solo los precios.
- `resultados/` y `datos 2025-02-24/` tienen los CSV/Excel generados y el PDF de la categoría Almacén.

> Los notebooks 1 a 4 tienen rutas de otro autor (`C:/Users/Mazhar/...`): están adaptados de un
> proyecto público. Antes de publicarlos conviene citar el repositorio original y cambiar las rutas.

## Cómo correrlo
```bash
cd "v3_2025-02-21_proyecto E-commerce - ULTIMA"
pip install requests
python carre.py
```
Para los notebooks: `pip install jupyter pandas requests beautifulsoup4 selenium webdriver-manager`.

Para la v2:
```bash
npm install
npx playwright install chromium
node carrefour.js
```
