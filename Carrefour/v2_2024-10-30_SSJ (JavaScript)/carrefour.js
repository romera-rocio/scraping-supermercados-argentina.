const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');

async function autoScroll(page, config) {
    await page.evaluate(async ({ scrollDelay, scrollDistance }) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, scrollDistance);
                totalHeight += scrollDistance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, scrollDelay);
        });
    }, config.settings);
}

async function handleCookies(page, config) {
    try {
        await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 12000 });
        await page.click('#onetrust-accept-btn-handler');
        console.log('Cookies aceptadas');
        await page.waitForTimeout(2000);
    } catch (error) {
        console.log('No se encontró el botón de cookies o ya fue aceptado');
    }
}

const scrape = async () => {
    try {
        const config = JSON.parse(fs.readFileSync('carrefour.json', 'utf8')).carrefour;
        console.log(`Iniciando scraping de Carrefour...`);

        const browser = await chromium.launch({ 
            headless: false,
            slowMo: 50
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });

        const { baseURL, pagesToDownload, fields, settings } = config;
        const allData = [];

        // Acceder a la URL inicial y esperar a que se cargue con tiempo de espera extendido
        await page.goto(baseURL + 1, { waitUntil: 'domcontentloaded', timeout: settings.pageLoadTimeout });
        await handleCookies(page, config);

        for (let pageNumber = 1; pageNumber <= pagesToDownload; pageNumber++) {
            console.log(`Procesando página ${pageNumber}...`);

            await page.waitForTimeout(settings.waitAfterPageLoad);
            await autoScroll(page, config);
            await page.waitForTimeout(settings.waitAfterScroll);

            const products = await page.$$(fields.productSelector);

            for (const product of products) {
                const extractText = async (selector) => {
                    const element = await product.$(selector);
                    return element ? await element.textContent() : 'N/A';
                };

                const extractAttribute = async (selector, attribute) => {
                    const element = await product.$(selector);
                    return element ? await element.getAttribute(attribute) : 'N/A';
                };

                const title = await extractText(fields.titleLocator);
                const price = await extractText(fields.priceLocator);
                const regularPrice = await extractText(fields.regularPriceLocator);
                const pricePerKg = await extractText(fields.pricePerKgLocator);
                const image = await extractAttribute(fields.imageLocator, 'src');
                const link = await extractAttribute(fields.linkLocator, 'href');

                allData.push({ title, price, regularPrice, pricePerKg, image, link });
            }

            console.log(`Página ${pageNumber}: ${products.length} productos encontrados`);

            if (pageNumber < pagesToDownload) {
                const nextButton = await page.$(fields.nextButtonLocator);
                if (nextButton) {
                    await nextButton.click();
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: settings.pageLoadTimeout });
                } else {
                    console.log('No se encontró el botón de siguiente página. Finalizando...');
                    break;
                }
            }
        }

        await browser.close();

        const workbook = XLSX.utils.book_new();
        const worksheetData = allData.map(item => {
            const rowData = {};
            config.excelConfig.columns.forEach(column => {
                rowData[column.header] = item[column.field] || 'N/A';
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
        console.error('Error en el scraping de Carrefour:', error);
    }
};

module.exports = { scrape };
