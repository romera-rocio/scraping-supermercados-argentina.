const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');

async function efficientScroll(page, selector) {
    await page.evaluate(async (selector) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;

                const foundElement = document.querySelector(selector);
                if (foundElement || totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100); // Scroll rápido y verificación continua
        });
    }, selector);
}

const scrape = async () => {
    try {
        const config = JSON.parse(fs.readFileSync('vea.json', 'utf8')).vea;
        console.log(`Iniciando scraping de VEA...`);

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Desactiva la carga de recursos no esenciales
        await page.route('**/*', (route) => {
            const url = route.request().url();
            if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.woff', '.ttf'].some(ext => url.endsWith(ext)) || url.includes('analytics')) {
                route.abort();
            } else {
                route.continue();
            }
        });

        const { baseURL, pagesToDownload, fields } = config;
        const allData = [];

        for (let pageNumber = 1; pageNumber <= pagesToDownload; pageNumber++) {
            console.log(`Procesando página ${pageNumber}...`);
            const URL = `${baseURL}`;

            try {
                await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
                console.log(`Página cargada: ${URL}`);
                
                // Espera breve para permitir carga inicial completa
                await page.waitForTimeout(200000);
            } catch (error) {
                console.error(`Error al cargar la página ${pageNumber}:`, error);
                continue;
            }

            // Desplazamiento eficiente que se detiene al encontrar el selector de descuento
            await efficientScroll(page, fields.discountLocator);

            // Extraer datos de la página
            const extractData = async (selector) => {
                try {
                    await page.waitForSelector(selector, { timeout: 120000 }); // Reducido a 10 segundos
                    return await page.$$eval(selector, elements => elements.map(el => el.textContent.trim()));
                } catch (error) {
                    console.warn(`Selector ${selector} no encontrado o tardó demasiado en cargarse.`);
                    return [];
                }
            };

            const extractSrc = async (selector) => {
                try {
                    await page.waitForSelector(selector, { timeout: 20000 });
                    return await page.$$eval(selector, elements => elements.map(el => el.src));
                } catch (error) {
                    console.warn(`Selector ${selector} no encontrado o tardó demasiado en cargarse.`);
                    return [];
                }
            };

            const extractHref = async (selector) => {
                try {
                    await page.waitForSelector(selector, { timeout: 200000 });
                    return await page.$$eval(selector, elements => elements.map(el => el.href));
                } catch (error) {
                    console.warn(`Selector ${selector} no encontrado o tardó demasiado en cargarse.`);
                    return [];
                }
            };

            const titles = await extractData(fields.titleLocator);
            const prices = await extractData(fields.priceLocator);
            const regularPrices = await extractData(fields.regularPriceLocator);
            const pricePerKg = await extractData(fields.pricePerKgLocator);
            const discounts = await extractData(fields.discountLocator);
            const images = await extractSrc(fields.imageLocator);
            const links = await extractHref(fields.linkLocator);
            const brands = await extractData(fields.brandLocator);
            const categories = await extractData(fields.categoryLocator);

            const pageData = titles.map((title, index) => ({
                title: title || 'N/A',
                price: prices[index] || 'N/A',
                regularPrice: regularPrices[index] || 'N/A',
                pricePerKg: pricePerKg[index] || 'N/A',
                discount: discounts[index] || 'N/A',
                image: images[index] || 'N/A',
                link: links[index] || 'N/A',
                brand: brands[index] || 'N/A',
                category: categories[index] || 'N/A',
                ean: 'N/A'
            }));

            allData.push(...pageData);
            console.log(`Página ${pageNumber}: ${pageData.length} productos encontrados`);

            if (pageData.length === 0) {
                console.log('No se encontraron más productos. Finalizando...');
                break;
            }
        }

        // Cerrar navegador una vez completada la extracción
        await browser.close();

        const workbook = XLSX.utils.book_new();
        const worksheetData = allData.map(item => {
            const rowData = {};
            config.excelConfig.columns.forEach(column => {
                rowData[column.field] = item[column.field] || 'N/A';
            });
            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, config.excelConfig.sheetName);

        const date = new Date();
        const fileName = `${config.excelConfig.fileName}_${date.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        console.log(`Archivo Excel creado: ${fileName}`);
        console.log(`Total de productos descargados: ${allData.length}`);

    } catch (error) {
        console.error('Error en el scraping de Vea:', error);
    }
};

module.exports = { scrape };
