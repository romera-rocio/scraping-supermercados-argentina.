import time
import json
from playwright.sync_api import sync_playwright
import re

##################################################
# 1. Seleccionar sucursal (solo una vez)
##################################################
def seleccionar_sucursal(page, provincia, tienda):
    """
    Función para seleccionar la provincia y la sucursal en el sitio de Vea.
    """
    try:
        print("Seleccionando método de entrega...")
        page.click('a:has-text("Seleccioná el método de entrega")')
        page.wait_for_timeout(2000)

        print("Esperando campo de email...")
        page.wait_for_selector('input[placeholder="Micorreo@correo.com"]', timeout=5000)
        page.click('input[placeholder="Micorreo@correo.com"]')
        page.fill('input[placeholder="Micorreo@correo.com"]', "TU_EMAIL@ejemplo.com")
        page.click('button:has-text("Enviar")')
        page.wait_for_timeout(3000)

        print("Seleccionando 'Retirar en una tienda'...")
        page.click('.veaargentina-delivery-modal-1-x-deliveryInfo:has-text("Retirar en una tienda")')
        page.wait_for_timeout(2000)

        print(f"Seleccionando provincia: {provincia}...")
        page.locator('select[style="appearance: menulist-button;"]').first.select_option(label=provincia)
        page.wait_for_timeout(2000)

        print(f"Seleccionando tienda: {tienda}...")
        page.locator('select[style="appearance: menulist-button;"]').nth(1).select_option(label=tienda)
        page.wait_for_timeout(2000)

        print("Esperando botón 'Confirmar' habilitado...")
        confirm_button = page.locator('button:has-text("Confirmar")')
        for _ in range(30):  # Esperar hasta ~15 segundos
            if confirm_button.is_enabled():
                confirm_button.click()
                print("Botón 'Confirmar' presionado.")
                break
            time.sleep(0.5)
        else:
            print("Error: El botón no se habilitó después de 15 segundos.")

        print("Esperando 10 segundos para terminar de configurar la sucursal...")
        time.sleep(10)
        print("Sucursal configurada correctamente.")
    except Exception as e:
        print(f"Error durante la selección de sucursal: {e}")

##################################################
# 2. Funciones para extraer datos de la página
##################################################
def extraer_json(page):
    """
    Extrae el JSON embebido en el <script> de la página (body > div:nth-child(2) ...).
    Ajusta el selector si cambia la estructura del DOM.
    """
    try:
        # Intenta localizar el <script> que contiene el JSON con schema.org
        script_tag = page.locator('//body/div[2]/div/div[1]/div/script').text_content()
        return json.loads(script_tag) if script_tag else {}
    except Exception as e:
        print(f"Error al extraer JSON: {e}")
        return {}

def extraer_texto_visible(page):
    """
    Retorna todo el texto visible del <body>.
    """
    try:
        return page.inner_text("body")
    except Exception as e:
        print(f"Error al extraer texto visible: {e}")
        return ""

def scrollear_pagina(page, veces=1, espera=5):
    """
    Realiza scroll en la página varias veces, con esperas entre cada scroll.
    """
    try:
        for i in range(veces):
            print(f"Realizando scroll {i+1}/{veces}...")
            page.evaluate("window.scrollBy(0, document.body.scrollHeight)")
            time.sleep(espera)
    except Exception as e:
        print(f"Error al scrollear la página: {e}")

##################################################
# 3. Función de scraping
#    Recorre páginas desde start_page hasta end_page
##################################################
def scrape_vea(page, category, start_page=1, end_page=1):
    """
    Pagina sobre la categoría y extrae JSON + texto de cada página.
    Devuelve dos listas: [json_data], [texto_visible].
    """
    base_url = "https://www.vea.com.ar/"
    compiled_json = []
    compiled_text = []

    for page_num in range(start_page, end_page + 1):
        # Construir la URL de la categoría
        if page_num == 1:
            url = f"{base_url}{category}"
        else:
            url = f"{base_url}{category}?page={page_num}"

        print(f"Navegando a: {url}")
        page.goto(url)
        # Esperar a que la página cargue
        page.wait_for_load_state("networkidle")
        time.sleep(8)



        # Scroll para cargar más productos (2 scrolls, 2 segundos de espera)
        scrollear_pagina(page, veces=2, espera=5)

        print("Recargando la página para asegurarse de que los datos estén cargados correctamente...")
        page.reload()
        page.wait_for_load_state("load")
        
        print("Esperando 3 segundos adicionales después de recargar...")
        time.sleep(8)

        # Extraer datos
        json_data = extraer_json(page)
        texto_visible = extraer_texto_visible(page)

        compiled_json.append(json_data)
        compiled_text.append(texto_visible)

        print(f"Página {page_num} procesada con éxito.\n")

    return compiled_json, compiled_text

##################################################
# 4. main() - Ejecuta todo el flujo
##################################################
def main():
    provincia = "CORDOBA"
    tienda = "Vea Ciudad de Córdoba Av Juan B Justo"
    category = "almacen"  # Ejemplo de categoría
    start_page = 1
    end_page = 50  # Cantidad de páginas a recorrer

    with sync_playwright() as p:
        # Puedes cambiar headless=True si no quieres ver el navegador
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # 1) Navegar al sitio web de Vea
        print("Abriendo sitio de Vea...")
        page.goto("https://www.vea.com.ar/")
        page.wait_for_timeout(4000)

        # 2) Seleccionar sucursal (solo la primera vez)
        seleccionar_sucursal(page, provincia, tienda)

        # 3) Scraping de productos en las páginas
        print(f"Iniciando scraping de la categoría: {category}")
        all_json, all_text = scrape_vea(page, category, start_page, end_page)

        # 4) Guardar resultados compilados

        # Guardar JSON en 'vea_datos.json'
        compiled_json_filename = "vea_datos.json"
        with open(compiled_json_filename, "w", encoding="utf-8") as jf:
            json.dump(all_json, jf, ensure_ascii=False, indent=4)
        print(f"Datos JSON guardados en: {compiled_json_filename}")

        # Guardar texto en 'vea_texto.txt'
        compiled_text_filename = "vea_texto.txt"
        with open(compiled_text_filename, "w", encoding="utf-8") as tf:
            for texto in all_text:
                tf.write(texto)
                tf.write("\n\n" + ("-"*60) + "\n\n")  # Separador entre páginas
        print(f"Texto visible guardado en: {compiled_text_filename}")

        # 5) Cerrar navegador
        print("Cerrando navegador...")
        browser.close()
        print("Scraping finalizado.")

if __name__ == "__main__":
    main()
