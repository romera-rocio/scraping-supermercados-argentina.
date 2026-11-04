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

async function hasNextPage(page) {
    const nextButton = await page.$('div.discoargentina-search-result-custom-1-x-content-btn-next');
    return nextButton !== null;
}

const extractRegularPrice = async (selector, page) => {
    return await page.$$eval(selector, elements => 
        elements.map(el => {
            const text = el.textContent;
            const match = text.match(/\$\s*([\d.,]+)/);
            return match ? match[1] : 'N/A';
        })
    );
};

const scrape = async () => {
    try {
        const config = JSON.parse(fs.readFileSync('disco.json', 'utf8')).disco;
        console.log(`Iniciando scraping de Disco...`);

        const browser = await chromium.launch({ 
            headless: false,
            slowMo: 100
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        const { baseURL, pagesToDownload, fields } = config;
        const allData = [];

        for (let pageNumber = 1; pageNumber <= pagesToDownload; pageNumber++) {
            console.log(`Procesando página ${pageNumber}...`);
            const URL = `${baseURL}${pageNumber}`;

            await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForSelector('#gallery-layout-container', { timeout: 30000 });
            await page.waitForTimeout(5000);

            await autoScroll(page);

            const extractData = async (selector) => await page.$$eval(selector, elements => elements.map(el => el.textContent.trim()));
            const extractSrc = async (selector) => await page.$$eval(selector, elements => elements.map(el => el.src));
            const extractHref = async (selector) => await page.$$eval(selector, elements => elements.map(el => el.href));

            const titles = await extractData(fields.titleLocator);
            const prices = await extractData(fields.priceLocator);
            const regularPrices = await extractRegularPrice(fields.regularPriceLocator, page);
            const discounts = await extractData(fields.discountLocator);
            const images = await extractSrc(fields.imageLocator);
            const links = await extractHref(fields.linkLocator);

            const pageData = titles.map((title, index) => ({
                title: title || 'N/A',
                price: prices[index] || 'N/A',
                regularPrice: regularPrices[index] || 'N/A',
                discount: discounts[index] || 'N/A',
                image: images[index] || 'N/A',
                link: links[index] || 'N/A'
            }));

            allData.push(...pageData);
            console.log(`Página ${pageNumber}: ${pageData.length} productos encontrados`);

            if (pageData.length === 0 || !(await hasNextPage(page))) {
                console.log('No hay más páginas disponibles. Finalizando...');
                break;
            }
        }

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
        console.error('Error en el scraping de Disco:', error);
    }
};

module.exports = { scrape };