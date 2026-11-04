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
    return page.evaluate((sel) => {
        const elements = document.evaluate(sel, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const results = [];
        for (let i = 0; i < elements.snapshotLength; i++) {
            results.push(elements.snapshotItem(i).textContent.trim());
        }
        return results;
    }, selector);
};

const extractAttribute = async (page, selector, attribute) => {
    return page.evaluate(({ sel, attr }) => {
        const elements = document.evaluate(sel, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const results = [];
        for (let i = 0; i < elements.snapshotLength; i++) {
            results.push(elements.snapshotItem(i).getAttribute(attr));
        }
        return results;
    }, { sel: selector, attr: attribute });
};

const scrape = async (input) => {
    try {
        const config = JSON.parse(fs.readFileSync('user.json', 'utf8')).vea;
        console.log(`Iniciando scraping de VEA...`);

        const browser = await chromium.launch({ 
            headless: false,
            slowMo: 100
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        let baseSearchURL;
        
        if (/^\d+$/.test(input)) {
            baseSearchURL = `https://www.vea.com.ar/${input}?_q=${input}&map=ft`;
        } else if (input.startsWith('http')) {
            baseSearchURL = input;
        } else {
            const query = encodeURIComponent(input);
            baseSearchURL = `https://www.vea.com.ar/${query}?_q=${query}&map=ft`;
        }

        console.log(`Usando la URL base de búsqueda: ${baseSearchURL}`);

        let pageData = [];
        const maxPages = 5;
        
        for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
            const searchURL = `${baseSearchURL}&page=${pageNumber}`;
            console.log(`Visitando la página ${pageNumber}: ${searchURL}`);

            await page.goto(searchURL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(3000);

            await autoScroll(page);

            const titles = await extractData(page, config.fields.titleLocator);
            const prices = await extractData(page, config.fields.priceLocator);
            const regularPrices = await extractData(page, config.fields.regularPriceLocator);
            const pricePerKg = await extractData(page, config.fields.pricePerKgLocator);
            const discounts = await extractData(page, config.fields.discountLocator);
            const images = await extractAttribute(page, config.fields.imageLocator, 'src');
            const links = await extractAttribute(page, config.fields.linkLocator, 'href');
            const brands = await extractData(page, config.fields.brandLocator);
            const categories = await extractData(page, config.fields.categoryLocator);

            console.log(`Títulos extraídos en la página ${pageNumber}: ${titles.length}`);
            console.log(`Precios regulares extraídos: ${regularPrices.length}`);
            console.log(`Muestra de precios regulares: ${regularPrices.slice(0, 5)}`);

            const currentPageData = titles.map((title, index) => ({
                title: title || 'N/A',
                price: prices[index] || 'N/A',
                regularPrice: regularPrices[index] || 'N/A',
                pricePerKg: pricePerKg[index] || 'N/A',
                discount: discounts[index] || 'N/A',
                image: images[index] || 'N/A',
                link: links[index] || 'N/A',
                brand: brands[index] || 'N/A',
                category: categories[index] || 'N/A'
            }));

            pageData = pageData.concat(currentPageData);

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
        console.log(`Total de productos descargados: ${pageData.length}`);

    } catch (error) {
        console.error('Error en el scraping de Vea:', error);
    }
};

const input = process.argv[2];
if (input) {
    scrape(input);
} else {
    console.error('Por favor, proporciona un EAN, palabra o URL como argumento.');
}