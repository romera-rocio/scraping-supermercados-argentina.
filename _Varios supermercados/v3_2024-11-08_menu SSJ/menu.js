const fs = require('fs');
const path = require('path');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para determinar el tipo de entrada
function determinarTipoEntrada(input) {
    if (input.startsWith("https://")) {
        return "link";
    }
    if (/^\d+$/.test(input)) {
        return "ean";
    }
    return "keyword";
}

// Función para construir la URL según el supermercado y el tipo de entrada
function construirURL(supermercado, input) {
    let baseURL;

    switch (supermercado) {
        case "vea":
            baseURL = "https://www.vea.com.ar";
            if (determinarTipoEntrada(input) === "ean" || determinarTipoEntrada(input) === "keyword") {
                return `${baseURL}/${input}?_q=${input}&map=ft`;
            }
            return input; // Si es un link completo, usa el link directamente
        
        case "disco":
            baseURL = "https://www.disco.com.ar";
            if (determinarTipoEntrada(input) === "ean" || determinarTipoEntrada(input) === "keyword") {
                return `${baseURL}/${input}?_q=${input}&map=ft&page=`;
            }
            return input;

        case "dino":
            baseURL = "https://www.dinoonline.com.ar/super/categoria";
            if (determinarTipoEntrada(input) === "ean" || determinarTipoEntrada(input) === "keyword") {
                return `${baseURL}?_dyncharset=utf-8&Dy=1&Nty=1&Ntt=${input}`;
            }
            return input;

        default:
            throw new Error("Supermercado no soportado");
    }
}

// Función para actualizar el campo `baseURL` en el JSON del supermercado
function actualizarBaseURL(supermercado, nuevaURL) {
    const configPath = path.join(__dirname, `${supermercado}.json`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Actualiza el campo `baseURL`
    config[supermercado].baseURL = nuevaURL;

    // Guarda el archivo JSON actualizado
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`URL actualizada para ${supermercado}: ${nuevaURL}`);
}

// Lógica del menú
readline.question('Seleccione el supermercado (vea, disco, dino): ', (supermercado) => {
    readline.question('Ingrese EAN, link o palabra para buscar: ', async (input) => {
        
        // Construye la URL y actualiza el JSON con la URL correcta
        const nuevaURL = construirURL(supermercado, input);
        actualizarBaseURL(supermercado, nuevaURL);
        
        // Inicia el scraping sin modificar los archivos de supermercado
        if (supermercado === 'vea') {
            console.log("Iniciando scraping de Vea...");
            await require('./vea').scrape();
        } else if (supermercado === 'disco') {
            console.log("Iniciando scraping de Disco...");
            await require('./disco').scrape();
        } else if (supermercado === 'dino') {
            console.log("Iniciando scraping de Dino...");
            await require('./dino').scrape();
        } else {
            console.log("Supermercado no válido.");
        }

        readline.close();
    });
});
