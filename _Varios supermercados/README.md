# Herramientas para varios supermercados

Menús, scrapers genéricos y utilidades que funcionan con más de un supermercado.

## Versiones

| Versión | Fecha | Tecnología | Descripción |
|---|---|---|---|
| `v1_2024-10-16_SCRAP` | 16/10/2024 | Node · Puppeteer | Primer proyecto: ofertas de Vea ("ofertas que arden") y Disco (`index.js`), y pruebas de extracción (`Elementos.js`, `Noticia.js`, `video.js.js`). `div.java` es una prueba de OCR con Tesseract. `docs/Informe_scr.docx` tiene el informe. |
| `v2_2024-10-30_menu Buscador` | 30/10/2024 | Node | `menu.js`: menú por consola para elegir Dino, Vea, Disco o Carrefour. Necesita los scripts de cada súper en la misma carpeta. Incluye las listas de EAN de prueba. |
| `v3_2024-11-08_menu SSJ` | 08/11/2024 | Node · Playwright | Menú mejorado (Vea, Disco, Dino) con `url.js` y notas de selectores. `docs/Paso a paso.docx` explica cómo usarlo. |
| **`v4_2024-11-15_scraper generico configurable (JS)`** ⭐ | 15/11/2024 | Node · Playwright · xlsx | **Un solo scraper para todos** (detalles abajo). |
| `v5_2025-03_python generico + comparador` | 03/2025 | Python · requests · BS4 · pandas | `prueba.py`: detecta solo los contenedores de producto que más se repiten en cualquier página y los guarda en CSV. `Procesar (1).py`: cruza productos entre fuentes por similitud de nombre (`difflib`). |

### v4: scraper genérico
- `supermarkets.json` define cada súper: URL de búsqueda, selectores XPath (título, precio, promo,
  imagen, link, marca) y columnas del Excel. Ya trae `dino` y `vea`.
- `scrap.js` acepta una palabra, un EAN, una URL **o un archivo `.xlsx` con EANs** (primera columna)
  y exporta `<super>_data.xlsx`.
- `menu.js` pregunta qué súper usar y qué buscar.
- Para **agregar un supermercado** solo hay que sumar una entrada en `supermarkets.json`.

```bash
cd "v4_2024-11-15_scraper generico configurable (JS)"
npm install
npx playwright install chromium
node menu.js
```
Para probar con una lista de EANs, cuando lo pida se ingresa la ruta `resultados/ean_canasta.xlsx`.
