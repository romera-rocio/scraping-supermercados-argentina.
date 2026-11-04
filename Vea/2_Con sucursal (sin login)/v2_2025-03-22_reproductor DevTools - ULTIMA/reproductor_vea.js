const puppeteer = require('puppeteer');
const fs = require('fs');

// Función para ejecutar los pasos definidos en un JSON en una página dada
async function runSteps(page, steps) {
  for (const step of steps) {
    console.log(`Ejecutando paso: ${step.type}`);

    switch (step.type) {
      case 'setViewport':
        await page.setViewport({ width: step.width, height: step.height });
        break;

      case 'navigate':
        await page.goto(step.url, { waitUntil: 'networkidle2' });
        break;

      case 'click':
        // Se intentan los diferentes selectores hasta que uno funcione
        let clicked = false;
        for (const selectorArray of step.selectors) {
          const selector = selectorArray[0];
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.click(selector, {
              offset: { x: step.offsetX || 0, y: step.offsetY || 0 }
            });
            clicked = true;
            break;
          } catch (err) {
            // Si falla con este selector, se prueba el siguiente
          }
        }
        if (!clicked) {
          console.error("No se pudo hacer click en ningún selector para el paso:", step);
        }
        break;

      case 'change':
        // Se asume que se trata de un <select>; se usa el primer selector del grupo
        const changeSelector = step.selectors[0][0];
        await page.waitForSelector(changeSelector);
        await page.select(changeSelector, step.value);
        break;

      case 'keyDown':
        await page.keyboard.down(step.key);
        break;

      // Puedes agregar más casos según los tipos de acción que necesites (por ejemplo, keyUp, type, etc.)
      default:
        console.warn(`Tipo de paso no implementado: ${step.type}`);
    }

    // Pausa breve entre pasos (puedes ajustar el tiempo)
    await page.waitForTimeout(1000);
  }
}

(async () => {
  // Lanza el navegador en modo no-headless para poder ver lo que sucede
  const browser = await puppeteer.launch({ headless: false });
  
  // Abrir la primera pestaña y ejecutar el primer JSON ("sucu.json")
  const page1 = await browser.newPage();
  const sucuData = JSON.parse(fs.readFileSync('sucu.json', 'utf8'));
  console.log("Ejecutando el primer JSON (sucu.json) en la primera pestaña.");
  await runSteps(page1, sucuData.steps);

  // Espera a que el usuario indique que desea ejecutar el segundo JSON
  console.log("Presiona Enter para ejecutar el segundo JSON en una pestaña al lado...");
  await new Promise(resolve => {
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });

  // Abre una segunda pestaña y ejecuta el segundo JSON ("veadevt.json")
  const page2 = await browser.newPage();
  const veadevtData = JSON.parse(fs.readFileSync('veadevt.json', 'utf8'));
  console.log("Ejecutando el segundo JSON (veadevt.json) en la segunda pestaña.");
  await runSteps(page2, veadevtData.steps);

  console.log("Proceso completado en ambas pestañas.");
  // Opcional: cerrar el navegador
  // await browser.close();
})();
