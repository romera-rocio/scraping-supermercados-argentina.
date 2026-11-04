const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuery() {
    return new Promise(resolve => rl.question("Ingresa un enlace, EAN o palabra clave para buscar: ", answer => resolve(answer)));
}

async function scrapeProduct(browser, query, config) {
    let url;

    // Determinar si es un link completo, EAN o palabra clave
    if (query.startsWith("http")) {
        url = query; // Usa directamente el link proporcionado
    } else if (/^\d+$/.test(query)) {
        // Si es un número (EAN), formatear en la URL base con {query} como EAN
        url = config.baseURL.replace(/{query}/g, query);
    } else {
        // Si es una palabra clave, formatear en la URL base con {query} como palabra clave
        url = config.baseURL.replace(/{query}/g, encodeURIComponent(query));
    }

    console.log(`Procesando ${query}: ${url}`);

    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: config.waitForDOM, timeout: config.timeout });

        const extractData = async (selector) => {
            try {
                return await page.$eval(selector, el => el.textContent.trim());
            } catch {
                return 'N/A';
            }
        };

        const extractSrc = async (selector) => {
            try {
                return await page.$eval(selector, el => el.src);
            } catch {
                return 'N/A';
            }
        };

        const [title, price, regularPrice, pricePerKg, discount, image, brand, category] = await Promise.all([
            extractData(config.fields.titleLocator),
            extractData(config.fields.priceLocator),
            extractData(config.fields.regularPriceLocator),
            extractData(config.fields.pricePerKgLocator),
            extractData(config.fields.discountLocator),
            extractSrc(config.fields.imageLocator),
            extractData(config.fields.brandLocator),
            extractData(config.fields.categoryLocator)
        ]);

        const productData = {
            query, title, price, regularPrice, pricePerKg, discount, image, brand, category, url,
            fechaScraping: new Date().toISOString()
        };

        console.log('Producto encontrado:', productData);
        return productData;

    } catch (error) {
        console.error(`Error al procesar ${query}:`, error.message);
        return {
            query, title: 'N/A', price: 'N/A', regularPrice: 'N/A', pricePerKg: 'N/A',
            discount: 'N/A', image: 'N/A', brand: 'N/A', category: 'N/A', url,
            fechaScraping: new Date().toISOString()
        };
    } finally {
        await page.close();
    }
}

async function saveToExcel(data, config) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, config.excelConfig.outputSheetName);
    
    const fileName = config.excelConfig.outputFileName;
    XLSX.writeFile(workbook, fileName);
    console.log(`Archivo Excel creado: ${fileName}`);
}

async function main() {
    try {
        const config = JSON.parse(fs.readFileSync('vea.json', 'utf8')).vea;
        console.log('Iniciando scraping de VEA...');

        const input = await askQuery();
        const queries = [input];

        const browser = await chromium.launch({ headless: true });
        const scrapedData = [];

        for (const query of queries) {
            const result = await scrapeProduct(browser, query, config);
            scrapedData.push(result);
        }

        await browser.close();
        await saveToExcel(scrapedData, config);
        console.log('Proceso completado.');
        rl.close();

    } catch (error) {
        console.error('Error en el proceso de scraping:', error);
        rl.close();
    }
}

main();
