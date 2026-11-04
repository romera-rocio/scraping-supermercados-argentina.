const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para pedir entrada del usuario
async function askQuery() {
    return new Promise(resolve => rl.question("Ingresa un enlace, EAN, palabra clave para buscar o la ruta de un archivo con EANs: ", answer => resolve(answer)));
}

// Función para pedir la cantidad de páginas a iterar
async function askPageCount() {
    return new Promise(resolve => rl.question("Ingresa la cantidad de páginas a iterar (por defecto es 1): ", answer => {
        const pageCount = parseInt(answer);
        resolve(isNaN(pageCount) ? 1 : pageCount);
    }));
}

// Cargar EANs desde un archivo
async function loadEansFromFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return data.flat();
}

// Construcción de la URL de búsqueda en función del tipo de entrada
async function buildURL(query, config) {
    if (query.startsWith("http")) {
        return query; // Si ya es una URL completa
    } else if (/^\d+$/.test(query)) {
        // Si es un número (EAN)
        return `${config.baseURL}/${query}?_q=${query}&map=ft`;
    } else {
        // Si es una palabra clave
        return `${config.baseURL}/${encodeURIComponent(query)}?_q=${encodeURIComponent(query)}&map=ft`;
    }
}

// Función de scraping para extraer datos de productos
async function scrapeProduct(browser, query, config, pageCount) {
    let currentPage = 1;
    let allData = [];

    while (currentPage <= pageCount) {
        const url = `${await buildURL(query, config)}&page=${currentPage}`;
        console.log(`Procesando ${query} - Página ${currentPage}: ${url}`);

        const page = await browser.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Extracción de los datos según los selectores en el JSON
            const products = await page.evaluate((selectors) => {
                const results = [];
                const productElements = document.querySelectorAll(selectors.productContainer);

                productElements.forEach(product => {
                    results.push({
                        title: product.querySelector(selectors.titleLocator)?.textContent.trim() || 'N/A',
                        price: product.querySelector(selectors.priceLocator)?.textContent.trim() || 'N/A',
                        regularPrice: product.querySelector(selectors.regularPriceLocator)?.textContent.trim() || 'N/A',
                        pricePerKg: product.querySelector(selectors.pricePerKgLocator)?.textContent.trim() || 'N/A',
                        discount: product.querySelector(selectors.discountLocator)?.textContent.trim() || 'N/A',
                        image: product.querySelector(selectors.imageLocator)?.src || 'N/A',
                        link: product.querySelector(selectors.linkLocator)?.href || 'N/A',
                        brand: product.querySelector(selectors.brandLocator)?.textContent.trim() || 'N/A',
                        category: product.querySelector(selectors.categoryLocator)?.textContent.trim() || 'N/A'
                    });
                });

                return results;
            }, config.fields);

            allData.push(...products);
            currentPage++;
        } catch (error) {
            console.error(`Error al procesar ${query} en la página ${currentPage}:`, error.message);
            break;
        } finally {
            await page.close();
        }
    }

    return allData;
}

// Guardar resultados en un archivo Excel
async function saveToExcel(data, fileName = 'output') {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    XLSX.writeFile(workbook, fileName);
    console.log(`Archivo Excel creado: ${fileName}`);
}

// Función principal
async function main() {
    try {
        const config = JSON.parse(fs.readFileSync('vea.json', 'utf8')).vea;
        console.log('Iniciando scraping de VEA...');

        const input = await askQuery();
        const pageCount = await askPageCount();
        let queries = [];

        if (fs.existsSync(input)) {
            queries = await loadEansFromFile(input);
        } else {
            queries.push(input);
        }

        const browser = await chromium.launch({ headless: true });
        const scrapedData = [];

        for (const query of queries) {
            const result = await scrapeProduct(browser, query, config, pageCount);
            scrapedData.push(...result);
        }

        await browser.close();
        await saveToExcel(scrapedData, config.excelConfig.fileName);
        console.log('Proceso completado.');
        rl.close();

    } catch (error) {
        console.error('Error en el proceso de scraping:', error);
        rl.close();
    }
}

main();
