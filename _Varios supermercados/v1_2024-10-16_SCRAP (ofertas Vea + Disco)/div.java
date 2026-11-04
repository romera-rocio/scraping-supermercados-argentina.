import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;

public class ScreenCaptureOCR {
    public static void main(String[] args) throws IOException, TesseractException {
        // Ruta de la carpeta con las capturas de pantalla
        String folderPath = "path/to/folder";

        // Crear un objeto Tesseract para el OCR
        ITesseract tesseract = new Tesseract();

        // Crear una lista para almacenar los resultados del OCR
        List<String> results = new ArrayList<>();

        // Iterar sobre cada archivo de imagen en la carpeta
        File folder = new File(folderPath);
        for (File file : folder.listFiles()) {
            if (file.isFile() && file.getName().endsWith(".png")) {
                // Leer la imagen y aplicar el OCR
                String text = tesseract.doOCR(file);
                results.add(text);
            }
        }

        // Imprimir los resultados del OCR
        for (String result : results) {
            System.out.println(result);
        }
    }
}