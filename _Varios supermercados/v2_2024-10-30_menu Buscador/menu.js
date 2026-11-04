const dinoScraper = require('./dino.js');
const veaScraper = require('./vea.js');
const discoScraper = require('./disco.js');
const carreScraper = require('./carrefour.js');
function showMenu() {
    console.log("Seleccione un supermercado:");
    console.log("1. Dino");
    console.log("2. Vea");
    console.log("3. Disco");
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Ingrese el número del supermercado (1 , 2 , 3 , 4): ', async (choice) => {
        if (choice === '1') {
            console.log("Iniciando scraping de Dino...");
            await dinoScraper.scrape();
        } else if (choice === '2') {
            console.log("Iniciando scraping de Vea...");
            await veaScraper.scrape();
        } else if (choice === '3') {
            console.log("Iniciando scraping de Disco...");
            await discoScraper.scrape();
                 console.log("Iniciando scraping de Disco...");
            await discoScraper.scrape(); 
        } else if (choice === '4') {
            console.log("Iniciando scraping de Carre...");
            await carreScraper.scrape();
                 console.log("Iniciando scraping de Carre...");
            await carreScraper.scrape();       
        } else {
            console.log("Opción inválida. Intente de nuevo.");
        }
        readline.close();
    });
}

showMenu();
