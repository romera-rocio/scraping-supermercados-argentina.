// dino.js actualizado

const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

const scrape = async () => {
    try {
        const config = JSON.parse(fs.readFileSync('dino.json', 'utf8')).dino;
        console.log(`Iniciando scraping de Dino Online...`);

        const browser = await chromium.launch({ 
            headless: false,
            slowMo: 100
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        const { baseURL, pagesToDownload, fields } = config;
        const allData = [];

        let currentPage = 0;
        let hasNextPage = true;

        // Cargar la primera página
        await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(5000);

        while (hasNextPage && currentPage < pagesToDownload) {
            console.log(`Procesando página ${currentPage + 1}...`);

            await autoScroll(page);

            // Extracción de datos
            const extractData = async (selector) => {
                return await page.$$eval(selector, elements => elements.map(el => el.textContent.trim()));
            };

            const extractSrc = async (selector) => await page.$$eval(selector, elements => elements.map(el => el.src));
            const extractHref = async (selector) => await page.$$eval(selector, elements => elements.map(el => el.href));

            const titles = await extractData(fields.titleLocator);
            const prices = await extractData(fields.priceLocator);
            const promoPrices = await extractData(fields.promoPriceLocator);
            const referencePrices = await extractData(fields.referencePriceLocator);
            const images = await extractSrc(fields.imageLocator);
            const links = await extractHref(fields.linkLocator);
            const brands = await extractData(fields.brandLocator);
            const categories = await extractData(fields.categoryLocator);

            const pageData = titles.map((title, index) => ({
                title: title || 'N/A',
                price: prices[index] || 'N/A',
                promoPrice: promoPrices[index] || 'N/A',
                referencePrice: referencePrices[index] || 'N/A',
                pricePerKg: 'N/A',
                image: images[index] || 'N/A',
                link: links[index] || 'N/A',
                brand: brands[index] || 'N/A',
                category: categories[index] || 'N/A',
                ean: 'N/A'
            }));

            allData.push(...pageData);
            console.log(`Página ${currentPage + 1}: ${pageData.length} productos encontrados`);

            if (pageData.length === 0) {
                console.log('No se encontraron más productos. Finalizando...');
                break;
            }

            // Intentar avanzar a la siguiente página usando el botón de siguiente
            try {
                const nextPageButton = await page.$('ul.pagination li:last-child a:not([disabled])');
                
                if (nextPageButton) {
                    await nextPageButton.click();
                    await page.waitForLoadState('networkidle', { timeout: 60000 });
                    await page.waitForTimeout(3000);
                    currentPage++;
                } else {
                    hasNextPage = false;
                    console.log('No se encontró el botón de siguiente página. Finalizando...');
                }
            } catch (error) {
                console.error('Error en la paginación:', error);
                hasNextPage = false;
            }
        }

        await browser.close();

        // Crear y guardar el archivo Excel
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
        console.error('Error en el scraping de Dino:', error);
    }
};

module.exports = { scrape };
