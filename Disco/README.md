# Disco: scraper de productos

Scraper de [disco.com.ar](https://www.disco.com.ar) (VTEX, mismo grupo que Vea y Jumbo).

## Versiones

| Versión | Fecha | Tecnología | Descripción |
|---|---|---|---|
| **`v1_2024-10-30_SSJ`** ⭐ | 30/10/2024 | Node · Playwright · xlsx | Recorre los resultados con **scroll automático y paginación** (botón "siguiente"). Exporta título, precio e imagen a Excel. La configuración está en `disco.json`. `disco.txt` es una copia de respaldo del script. |

Hay resultados del 30/10, 02/11 y 08/11/2024 en `resultados/`.
También hay un scraper de ofertas de Disco en `_Varios supermercados/v1`.

## Cómo correrlo
```bash
cd "v1_2024-10-30_SSJ - ULTIMA"
npm install
npx playwright install chromium
node disco.js
```
