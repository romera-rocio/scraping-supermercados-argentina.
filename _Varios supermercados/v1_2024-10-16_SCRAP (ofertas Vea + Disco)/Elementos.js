const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.vea.com.ar/ofertas-que-arden', { waitUntil: 'networkidle2' });

    // Espera a que la página esté completamente cargada
    await page.waitForTimeout(1000000); // Espera 2 segundos (ajusta según sea necesario)

    // Captura el HTML completo de la página
    const html = await page.content();

    console.log('HTML completo de la página:');
    console.log(html); // Imprime el HTML completo en la consola

    await browser.close();
})();