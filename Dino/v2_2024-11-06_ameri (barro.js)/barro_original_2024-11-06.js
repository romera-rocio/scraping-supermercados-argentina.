const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');
const readline = require('readline');

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

function listSupermarkets() {
    const config = JSON.parse(fs.readFileSync('barro.json', 'utf8'));
    console.log('Supermercados disponibles:');
    Object.keys(config).forEach((key, index) => {
        console.log(`${index + 1}. ${key}`);
    });
    return Object.keys(config);
}

async function promptUserForSupermarket(supermarkets) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Seleccione un supermercado ingresando el nombre: ', (answer) => {
            rl.close();
            if (supermarkets.includes(answer)) {
                resolve(answer);
            } else {
                console.error('Supermercado no válido. Intente de nuevo.');
                process.exit(1);
            }
        });
    });
}

async function scrape(supermarket, input) {
    try {
        const config = JSON.parse(fs.readFileSync('barro.json', 'utf8'))[supermarket];
        if (!config) throw new Error(`Configuración no encontrada para ${supermarket}`);

        console.log(`Iniciando scraping de ${supermarket}...`);
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        let baseURL;
        let isSingleResult = false;

        if (/^\d+$/.test(input)) {
            baseURL = config.baseURL.replace(/{SEARCH}/g, input);
            isSingleResult = config.eanSingleResult;
        } else if (input.startsWith('http')) {
            baseURL = input;
        } else {
            baseURL = config.baseURL.replace(/{SEARCH}/g, encodeURIComponent(input));
        }

        const allData = [];
        for (let pageNumber = 1; pageNumber <= config.pagesToDownload; pageNumber++) {
            const currentURL = isSingleResult ? baseURL : `${baseURL}&page=${pageNumber}`;
            console.log(`Visitando: ${currentURL}`);
            await page.goto(currentURL, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(5000);

            await autoScroll(page);

            const extractData = async (selector) => {
                try {
                    await page.waitForSelector(selector, { timeout: 10000 }); // Espera hasta 10 segundos por el selector
                    return await page.$$eval(selector, elements => elements.map(el => el.textContent.trim()));
                } catch (error) {
                    console.warn(`Selector ${selector} no encontrado o no cargó a tiempo.`);
                    return [];
                }
            };

            const extractSrc = async (selector) => {
                try {
                    await page.waitForSelector(selector, { timeout: 10000 });
                    return await page.$$eval(selector, elements => elements.map(el => el.src));
                } catch (error) {
                    console.warn(`Selector ${selector} no encontrado o no cargó a tiempo.`);
                    return [];
                }
            };

            const extractHref = async (selector) => {
                try {
                    await page.waitForSelector(selector, { timeout: 10000 });
                    return await page.$$eval(selector, elements => elements.map(el => el.href));
                } catch (error) {
                    console.warn(`Selector ${selector} no encontrado o no cargó a tiempo.`);
                    return [];
                }
            };

            const titles = await extractData(config.fields.titleLocator);
            const prices = await extractData(config.fields.priceLocator);
            const promoPrices = config.fields.promoPriceLocator ? await extractData(config.fields.promoPriceLocator) : [];
            const referencePrices = config.fields.referencePriceLocator ? await extractData(config.fields.referencePriceLocator) : [];
            const images = await extractSrc(config.fields.imageLocator);
            const links = await extractHref(config.fields.linkLocator);
            const brands = config.fields.brandLocator ? await extractData(config.fields.brandLocator) : [];
            const categories = config.fields.categoryLocator ? await extractData(config.fields.categoryLocator) : [];
            const eans = config.fields.eanLocator ? await extractData(config.fields.eanLocator) : titles.map(() => input); // Simulación de EAN si no hay selector

            const pageData = titles.map((title, index) => ({
                title: title || 'N/A',
                price: prices[index] || 'N/A',
                promoPrice: promoPrices[index] || 'N/A',
                referencePrice: referencePrices[index] || 'N/A',
                image: images[index] || 'N/A',
                link: links[index] || 'N/A',
                brand: brands[index] || 'N/A',
                category: categories[index] || 'N/A',
                ean: eans[index] || 'N/A'
            }));

            if (isSingleResult) {
                const filteredData = pageData.filter(item => item.ean === input);
                if (filteredData.length > 0) {
                    allData.push(filteredData[0]);
                }
                console.log('Búsqueda de EAN completada. Finalizando...');
                break;
            }

            allData.push(...pageData);
            console.log(`Página ${pageNumber}: ${pageData.length} productos encontrados`);

            if (pageData.length === 0) {
                console.log('No se encontraron más resultados. Finalizando...');
                break;
            }
        }

        await browser.close();

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(allData);
        XLSX.utils.book_append_sheet(workbook, worksheet, config.excelConfig.sheetName);

        const date = new Date();
        const fileName = `${config.excelConfig.fileName}_${date.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        console.log(`Archivo Excel creado: ${fileName}`);
    } catch (error) {
        console.error(`Error en el scraping de ${supermarket}:`, error);
    }
}

// Inicio del script
(async () => {
    const supermarkets = listSupermarkets();
    const supermarket = await promptUserForSupermarket(supermarkets);
    const input = process.argv[2];

    if (input) {
        await scrape(supermarket, input);
    } else {
        console.error('Por favor, proporciona un EAN, palabras clave o un enlace como argumento.');
    }
})();
