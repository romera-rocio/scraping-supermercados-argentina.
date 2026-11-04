const fs = require('fs');
const readline = require('readline');
const { scrape } = require('./scrap');

const menu = () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("\n=== Menú de Scraping de Supermercados ===");
    console.log("1. Scraping de Dino");
    console.log("2. Scraping de Vea");
    console.log("3. Salir\n");

    rl.question("Selecciona una opción (1-3): ", (option) => {
        if (option === '1' || option === '2') {
            const supermarket = option === '1' ? 'dino' : 'vea';
            rl.question("Ingresa una palabra, EAN, URL o ruta de archivo con EANs: ", async (input) => {
                if (fs.existsSync(input)) {
                    const eans = fs.readFileSync(input, 'utf8').split('\n').map(ean => ean.trim()).filter(ean => ean !== '');
                    for (let i = 0; i < eans.length; i++) {
                        console.log(`Scraping del producto ${i + 1} con EAN: ${eans[i]}`);
                        await scrape(supermarket, eans[i]);
                    }
                    console.log("Scraping completado para todos los productos del archivo.");
                } else {
                    console.log(`Iniciando scraping para el input: ${input}`);
                    await scrape(supermarket, input);
                    console.log("Scraping completado.");
                }
                rl.close();
            });
        } else if (option === '3') {
            console.log("Saliendo...");
            rl.close();
        } else {
            console.log("Opción inválida. Por favor, intenta de nuevo.");
            rl.close();
            menu();
        }
    });
};

menu();
