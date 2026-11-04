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

const extractData = async (page, selector) => {
    try {
        return await page.evaluate((sel) => {
            const elements = document.evaluate(sel, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const results = [];
            for (let i = 0; i < elements.snapshotLength; i++) {
                results.push(elements.snapshotItem(i).textContent.trim());
            }
            return results;
        }, selector);
    } catch (error) {
        console.error(`Error al extraer datos para el selector ${selector}:`, error);
        return [];
    }
};

const extractAttribute = async (page, selector, attribute) => {
    try {
        return await page.evaluate(({ sel, attr }) => {
            const elements = document.evaluate(sel, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const results = [];
            for (let i = 0; i < elements.snapshotLength; i++) {
                results.push(elements.snapshotItem(i).getAttribute(attr));
            }
            return results;
        }, { sel: selector, attr: attribute });
    } catch (error) {
        console.error(`Error al extraer atributo para el selector ${selector}:`, error);
        return [];
    }
};

const extractEAN = async (page) => {
    try {
        // Extrae el EAN desde el JSON en el código fuente
        const pageContent = await page.content();
        const eanMatches = pageContent.match(/"ean":"(\d+)"/g);
        return eanMatches ? eanMatches.map(ean => ean.match(/\d+/)[0]) : [];
    } catch (error) {
        console.error("Error al extraer EAN:", error);
        return [];
    }
};

const scrape = async (input, config) => {
    try {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        const query = encodeURIComponent(input);
        let baseSearchURL = config.baseURL.replace(/{SEARCH}/g, query);

        console.log(`Usando la URL base de búsqueda: ${baseSearchURL}`);

        let pageData = [];
        const uniqueProducts = new Set();
        const maxPages = config.pagesToDownload;

        for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
            const searchURL = pageNumber === 1 ? baseSearchURL : `${baseSearchURL}&page=${pageNumber}`;
            console.log(`Visitando la página ${pageNumber}: ${searchURL}`);

            await page.goto(searchURL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(3000);

            await autoScroll(page);

            const titles = await extractData(page, "//*[@id='gallery-layout-container']/div[9]/section/a/article/div[4]/h2/span");
            const prices = await extractData(page, "//*[@id='gallery-layout-container']/div[9]/section/a/article/div[5]/div/div/div/div[1]/div/div[2]");
            const promoPrices = await extractData(page, "//*[@id='priceContainer']");
            const referencePrices = await extractData(page, "//*[@id='gallery-layout-container']/div[9]/section/a/article/div[5]/div/div/div/div[1]/div/div[3]/text()[4]");
            const discounts = await extractData(page, "//*[@id='gallery-layout-container']/div[9]/section/a/article/div[5]/div/div/div/div[1]/div/span/div[2]/div/span");
            const images = await extractAttribute(page, "//img[contains(@class, 'vtex-product-summary-2-x-image')]", 'src');
            const links = await extractAttribute(page, "//*[@id='gallery-layout-container']/div[9]/section/a", 'href');
            const brands = await extractData(page, "//*[@id='gallery-layout-container']/div[9]/section/a/article/div[3]/span");
            const categories = await extractData(page, "//*[@id='gallery-layout-container']/div[9]/section/a/article/div[4]"); // Ajuste para categoría
            const eans = await extractEAN(page);

            console.log(`Títulos extraídos en la página ${pageNumber}: ${titles.length}`);

            for (let index = 0; index < titles.length; index++) {
                const productId = `${titles[index]}_${prices[index] || ''}`;

                if (uniqueProducts.has(productId)) {
                    console.log("Producto repetido detectado, deteniendo paginación.");
                    pageNumber = maxPages;
                    break;
                }

                uniqueProducts.add(productId);

                pageData.push({
                    title: titles[index] || 'N/A',
                    price: prices[index] || 'N/A',
                    promoPrice: promoPrices[index] || 'N/A',
                    referencePrice: referencePrices[index] || 'N/A',
                    discount: discounts[index] || 'N/A',
                    image: images[index] || 'N/A',
                    link: links[index] || 'N/A',
                    brand: brands[index] || 'N/A',
                    category: categories[index] || 'N/A',
                    ean: eans[index] || 'N/A'
                });
            }

            if (titles.length === 0) {
                console.log(`No se encontraron más productos en la página ${pageNumber}. Terminando iteración.`);
                break;
            }
        }

        console.log(`Total de productos descargados: ${pageData.length}`);
        await browser.close();

        const workbook = XLSX.utils.book_new();
        const worksheetData = pageData.map(item => {
            const rowData = {};
            config.excelConfig.columns.forEach(column => {
                rowData[column.name] = item[column.field] || 'N/A';
            });
            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, config.excelConfig.sheetName);

        const date = new Date();
        const fileName = `${config.excelConfig.fileName}_${date.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        console.log(`Archivo Excel creado: ${fileName}`);

    } catch (error) {
        console.error('Error en el scraping:', error);
    }
};

module.exports = scrape;
