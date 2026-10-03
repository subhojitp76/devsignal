import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use local bundled worker from Vite asset pipeline (100% offline and zero CDN dependency)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

/**
 * Extracts raw selectable text from an uploaded PDF File in the browser
 * @param {File} file - PDF File object from <input type="file">
 * @returns {Promise<string>} Extracted plain text
 */
export async function extractTextFromPdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: true,
      isEvalSupported: false
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items = (textContent.items || []).filter(item => typeof item.str === 'string');
      // Sort in reading order: top-to-bottom (Y descending), left-to-right (X ascending)
      items.sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        const xA = a.transform[4];
        const xB = b.transform[4];
        if (Math.abs(yA - yB) > 4) {
          return yB - yA; // Higher Y is higher on page
        }
        return xA - xB; // Left to right within same line
      });

      let lastY;
      let text = '';
      for (const item of items) {
        const cleanStr = item.str.replace(/[\uF0B7\uF0A7\uF076\u25AA\u25AB\u25E6\u2043\u2023\u2219\u00B7]/g, '•');
        if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 4) {
          text += '\n';
        } else if (text.length > 0 && !text.endsWith(' ') && !cleanStr.startsWith(' ')) {
          text += ' ';
        }
        text += cleanStr;
        lastY = item.transform[5];
      }
      
      fullText += text + '\n\n';
    }
    
    const trimmed = fullText.trim();
    if (!trimmed || trimmed.length < 10) {
      throw new Error('No selectable text found in the PDF. It may be a scanned image or protected.');
    }
    
    return trimmed;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error(error.message || 'Failed to read text from PDF file. Please ensure the PDF is not encrypted or scanned as an image.');
  }
}
