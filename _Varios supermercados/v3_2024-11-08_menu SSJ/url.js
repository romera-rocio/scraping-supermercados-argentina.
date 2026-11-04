const fs = require('fs');

function construirURL(supermercado, input) {
    // Lee el archivo JSON del supermercado
    const config = JSON.parse(fs.readFileSync(`${supermercado}.json`, 'utf8'))[supermercado];
    
    // Obtiene la plantilla de URL desde el JSON
    const urlTemplate = config.urlTemplate;
    
    // Reemplaza `{input}` con el valor ingresado
    return urlTemplate.replace(/\{input\}/g, encodeURIComponent(input));
}

module.exports = { construirURL };
