const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');

// Función para leer EANs desde un archivo Excel
const readEANsFromExcel = (filePath) => {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const eans = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        .map(row => row[0])
        .filter(value => value);
    return eans;
};

const extractData = async (page, selector) => {
    return page.$$eval(selector, elements => elements.map(element => element.textContent.trim()));
};

const extractAttribute = async (page, selector, attribute) => {
    return page.$$eval(selector, (elements, attr) => elements.map(element => element.getAttribute(attr)), attribute);
};


const extractEAN = async (page) => {
    try {
        const pageContent = await page.content();
        const eanMatches = pageContent.match(/"ean":"(\d+)"/g);
        return eanMatches ? eanMatches.map(ean => ean.match(/\d+/)[0]) : [];
    } catch (error) {
        console.error("Error al extraer EAN:", error);
        return [];
    }
};

const scrape = async (supermarket, input) => {
    try {
        const config = JSON.parse(fs.readFileSync('supermarkets.json', 'utf8'))[supermarket];
        console.log(`Iniciando scraping de ${supermarket.toUpperCase()}...`);

        const browser = await chromium.launch({ headless: false, slowMo: 1000});
        const context = await browser.newContext();
        const page = await context.newPage();

        let allData = [];
        const eanList = typeof input === 'string' ? [input] : input;

        for (const searchInput of eanList) {
            let baseSearchURL = getSearchURL(config.baseURL, searchInput);
            console.log(`Usando la URL base de búsqueda: ${baseSearchURL}`);

            await page.goto(baseSearchURL, { waitUntil: 'domcontentloaded', timeout: 120000 });
            await page.waitForTimeout(160000);

            const currentPageData = await extractPageData(page, config);
            console.log(`Productos extraídos para entrada ${searchInput}: ${currentPageData.length}`);

            allData = [...allData, ...currentPageData];
        }

        await browser.close();
        saveDataToExcel(allData, config.excelConfig);
        console.log(`Scraping completado. Se guardaron ${allData.length} productos en ${config.excelConfig.fileName}.xlsx`);
    } catch (error) {
        console.error("Error durante el scraping:", error);
    }
};

// Función para determinar el tipo de URL de búsqueda
const getSearchURL = (baseURL, input) => {
    if (input.match(/^https?:\/\//)) {
        // Si es un link completo
        return input;
    } else if (input.match(/^\d+$/)) {
        // Si es un EAN (sólo números)
        return baseURL.replace('{SEARCH}', input);
    } else {
        // Si es una palabra clave
        return baseURL.replace('{SEARCH}', encodeURIComponent(input));
    }
};

const extractPageData = async (page, config) => {
    const titles = await extractData(page, config.fields.titleLocator);
    const prices = await extractData(page, config.fields.priceLocator);
    const promoPrices = await extractData(page, config.fields.promoPriceLocator);
    const referencePrices = await extractData(page, config.fields.referencePriceLocator);
    const images = await extractAttribute(page, config.fields.imageLocator, 'src');
    const links = await extractAttribute(page, config.fields.linkLocator, 'href');
    const brands = await extractData(page, config.fields.brandLocator);
    const categories = await extractData(page, config.fields.categoryLocator);
    const eans = await extractEAN(page);

    return titles.map((title, index) => ({
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
};

const saveDataToExcel = (data, excelConfig) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, excelConfig.sheetName);
    XLSX.writeFile(workbook, `${excelConfig.fileName}.xlsx`);
};

// Ejemplo de uso
const supermarket = 'vea';
const input = 'almacen'; // Cambia a un EAN, palabra o URL según el caso

let eanList = [];

if (fs.existsSync(input) && input.endsWith('.xlsx')) {
    eanList = readEANsFromExcel(input);
} else {
    eanList = [input];
}

scrape(supermarket, eanList);
