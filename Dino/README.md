# Dino: scrapers de productos

Scrapers de [dinoonline.com.ar](https://www.dinoonline.com.ar) (Supermercados Dino / Super MaMi, Córdoba).
Usa la búsqueda `.../super/categoria?Ntt={SEARCH}` y selectores XPath.

## Versiones

| Versión | Fecha | Tecnología | Descripción |
|---|---|---|---|
| `v1_2024-10-29_SSJ` | 29/10/2024 | Node · Playwright · xlsx | `dino.js` con la configuración en `dino.json` (selectores de título, precio, promo, precio de referencia, imagen). `dino_fuente.txt` es el HTML de referencia. |
| `v2_2024-11-06_ameri (barro.js)` | 06/11/2024 | Node · Playwright | `barro.js` + `barro.json`: búsqueda **por EAN** (pregunta por consola) con descarga de varias páginas. `barro_original_2024-11-06.js` es la versión anterior (solo cambia `headless`). |
| **`v3_2024-11-12_resultado del scraper generico`** ⭐ | 12/11/2024 | — | Solo resultados. Dino pasó al **scraper genérico** de `_Varios supermercados/v4` (entrada `dino` en `supermarkets.json`). |

## Cómo correrlo
```bash
cd "v2_2024-11-06_ameri (barro.js)"
npm install
npx playwright install chromium
node barro.js
```
