// Importa puppeteer correctamente
const puppeteer = require('puppeteer');

// Crea una función asíncrona autoinvocada
(async () => {
  try {
    // Array de URLs que deseas visitar
    const URLs = [
      "https://www.diariocordoba.com/cordoba-ciudad/2024/10/11/cordoba-centros-comerciales-supermercados-festivo-12-octubre-109019769.html",
      // "https://www.disco.com.ar/",
      // Agrega más URLs aquí
    ];

    // Lanza el navegador (revisa si puppeteer abre correctamente)
    const browser = await puppeteer.launch({ headless: false });

    // Itera sobre cada URL
    for (const URL of URLs) {
      try {
        // Abre una nueva página
        const page = await browser.newPage();

        // Ve a la URL especificada
        await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 }); // 60 segundos

        // Obtiene el título de la página
        const title = await page.title();
        console.log(`Título de la página: ${title} - URL: ${URL}`);

        // Aquí es donde agregas el código para capturar todos los elementos
        let products = await page.evaluate(() => {
          // Captura todos los elementos de la página
          const productElements = Array.from(document.querySelectorAll('*')); // Selecciona todos los elementos
          
          // Mapea los elementos capturando la etiqueta, clases y texto
          return productElements.map(el => ({
            tag: el.tagName,
            classes: el.className,
            text: el.innerText
          })).filter(item => item.text && item.text.trim() !== ''); // Filtra elementos vacíos
        });

        // Imprime todos los elementos de la página con sus clases y texto
        console.log('Todos los elementos de la página:', products);

        // Aquí podrías agregar más lógica para procesar los elementos y buscar los que te interesen
        // Iteración de páginas (puedes agregar la lógica de "siguiente página" si es necesario)
        
        let nextPage = true;
        while (nextPage) {
          // Tu lógica para verificar si existe una próxima página
          const nextPageButton = await page.$('.next-page-button');
          if (nextPageButton) {
            await nextPageButton.click();
            await page.waitForTimeout(2000); // Espera a que la página cargue
          } else {
            nextPage = false;
          }
        }

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
