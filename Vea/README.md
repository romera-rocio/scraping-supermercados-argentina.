# Vea: scrapers de precios

Scrapers de [vea.com.ar](https://www.vea.com.ar) (supermercados Vea, Argentina) para obtener
títulos, precios, promociones e imágenes de productos. Se pueden buscar por **EAN** (código de
barras), por palabra clave o por URL de categoría.

Vea usa la plataforma **VTEX**, igual que Disco y Jumbo. Por eso muchos selectores sirven para los tres.

La carpeta está dividida según lo que necesita cada scraper:

| Carpeta | Qué necesita | ¿Se sube a GitHub? |
|---|---|---|
| `1_Sin login ni sucursal/` | Nada: scrapea con los precios generales del sitio | ✅ |
| `2_Con sucursal (sin login)/` | Elige provincia y tienda (los precios cambian por sucursal) | ✅ |
| `3_Con login (PRIVADO - no se sube)/` | Inicio de sesión con cuenta de Vea | ❌ en `.gitignore` |

---

## 1_Sin login ni sucursal

| Versión | Fecha | Tecnología | Descripción |
|---|---|---|---|
| `v1_2024-10-07_python BeautifulSoup` | 07/10/2024 | Python · requests · BeautifulSoup | Primera prueba: descarga una categoría y extrae el HTML. |
| `v2_2024-10-29_ameri` | 29/10/2024 | Node · Playwright · xlsx | Primer scraper con navegador. La configuración (URL y selectores) está en `vea.json` y el resultado se guarda en Excel. |
| `v3_2024-11-02_buscador por EAN` | 02/11/2024 | Node · Playwright | Pregunta un **EAN, link o palabra** por consola y exporta un Excel por búsqueda (`sc.js`, `vea.js`). |
| `v4_2024-11-06_busqueda (user.js)` | 06/11/2024 | Node · Playwright | Busca usando la URL de búsqueda de Vea (`/{texto}?_q={texto}&map=ft`) con scroll automático. |
| `v5_2024-11-08_SSJ` | 08/11/2024 | Node · Playwright | Versión mejorada con paginación. Se usa desde el menú de `_Varios supermercados/v3`. |
| **`v6_2024-11-11_extract`** ⭐ | 11/11/2024 | Node · Playwright | Versión que pasó al scraper genérico (`_Varios supermercados/v4`). `vea selectores.txt` tiene el HTML de referencia. |

```bash
cd "1_Sin login ni sucursal/v5_2024-11-08_SSJ"
npm install
npx playwright install chromium
node vea.js
```

## 2_Con sucursal (sin login)

| Versión | Fecha | Tecnología | Descripción |
|---|---|---|---|
| `v1_2025-03-17_python relevamiento` | 17/03/2025 | Python · Playwright | `relevamiento (1).py`: `seleccionar_sucursal(page, provincia, tienda)` elige "Retirar en una tienda", completa un email de contacto, la provincia y la tienda, y después scrapea las categorías. Guarda `vea_datos.json` y `vea_texto.txt`. `import requests.py` es una prueba para buscar un feed RSS. |
| **`v2_2025-03-22_reproductor DevTools`** ⭐ | 22/03/2025 | Node · Puppeteer · Chrome DevTools Recorder | `reproductor_vea.js` ejecuta `sucu.json`, una grabación de Chrome que selecciona método de entrega → provincia → tienda → confirmar. |

```bash
cd "2_Con sucursal (sin login)/v1_2025-03-17_python relevamiento"
pip install playwright
playwright install chromium
python "relevamiento (1).py"
```
- En `main()` se cambian `provincia` y `tienda` (ahora: CORDOBA / Vea Ciudad de Córdoba Av Juan B Justo).
- El email `TU_EMAIL@ejemplo.com` hay que reemplazarlo por uno propio.

```bash
cd "2_Con sucursal (sin login)/v2_2025-03-22_reproductor DevTools - ULTIMA"
npm install puppeteer
node reproductor_vea.js
```
> El paso 2 del reproductor carga `veadevt.json`, que es una sesión con login y está en la
> carpeta privada (no está en el repo). Sin ese archivo, el reproductor llega solo hasta la
> selección de sucursal.

## 3_Con login (PRIVADO - no se sube)

Esta carpeta queda **solo en la computadora local**: está en el `.gitignore` porque tiene email,
contraseña y cookies.
- `grabaciones DevTools 2025-03/`: grabaciones del Recorder de Chrome (`vea.js/json`,
  `vea223.js/json`, `veaSS.js`, `Recording_2025-03-13`, `Recording_2025-03-22`). Hacen
  **login + selección de sucursal**.
- `sesiones guardadas/`: `veadevt.json` y `estado_final.json`, el estado del navegador con la
  sesión iniciada (cookies y almacenamiento de la página).

Para compartir una grabación, se puede volver a grabar en DevTools → Recorder **sin** iniciar
sesión, o reemplazar el email y la contraseña por `TU_EMAIL` / `TU_CONTRASEÑA` antes de moverla a
`2_Con sucursal`.
