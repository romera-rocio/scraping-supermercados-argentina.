const puppeteer = require('puppeteer');

(async () => {
  try {
    // Array de URLs que deseas visitar
    const URLs = [
      "https://www.vea.com.ar/ofertas-que-arden",
      // "https://www.disco.com.ar/",
      // Agrega más URLs aquí
    ];

    // Lanza el navegador
    const browser = await puppeteer.launch({ headless: false });

    // Itera sobre cada URL
    for (const URL of URLs) {
      try {
        // Abre una nueva página
        const page = await browser.newPage();

        // Ve a la URL especificada
        await page.goto(URL, { waitUntil: "networkidle2" });

        // Obtiene el título de la página
        const title = await page.title();
        console.log(`Título de la página: ${title} - URL: ${URL}`);

        // Obtenemos las variables de productos
        let products = [];

        // Iteración de páginas
        let nextPage = true;
        while (nextPage) {
            // Evaluamos los productos en la página actual
            const extractedProducts = await page.evaluate(() => {
              const productContainers = Array.from(document.querySelectorAll('.vtex-product-summary-2-x-container')); // Contenedor de productos

              return productContainers.map(product => {
                console.log(product.outerHTML); // Imprime el HTML del producto
                const brand = product.querySelector('.vtex-product-summary-2-x-productBrandName')?.innerText || 'N/A';
                const name = product.querySelector('.vtex-product-summary-2-x-productBrand')?.innerText || 'N/A';
                const price_offer = product.querySelector('.price-offer')?.innerText || 'N/A';
                const price_regular = product.querySelector('.price-regular')?.innerText || 'N/A';
                const discount = product.querySelector('.discount')?.innerText || 'N/A';
                const precio_und_regular = product.querySelector('.vtex-product-summary-2-x-pricePerUnit')?.innerText?.replace('Precio regular x un: ', '') || 'N/A';
              
                return {
                  brand,
                  name,
                  price_offer,
                  price_regular,
                  discount,
                  precio_und_regular
                };
              });
              
          });

          // Añade los productos extraídos al array
          products.push(...extractedProducts);

          // Lógica para determinar si hay una próxima página
          const nextPageButton = await page.$('.next-page-button'); // Cambia el selector si es necesario
          if (nextPageButton) {
            await nextPageButton.click();
            await page.waitForTimeout(2000); // Espera un poco antes de cargar la próxima página
          } else {
            nextPage = false;
          }
        }

        console.log('Productos extraídos:', products);
        
      } catch (error) {
        // Muestra cualquier error que ocurra para esta URL específica
        console.error(`Error al visitar ${URL}:`, error);
      }
    }

    // Cierra el navegador al terminar
    await browser.close();
  } catch (error) {
    // Muestra cualquier error que ocurra al lanzar el navegador
    console.error('Error al lanzar el navegador:', error);
  }
})();
