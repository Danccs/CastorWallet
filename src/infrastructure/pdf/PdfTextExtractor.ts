import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Initialize PDF.js worker using local Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedPageLine {
  y: number;
  text: string;
}

export interface ExtractedPage {
  pageNumber: number;
  lines: string[];
}

export class PdfTextExtractor {
  /**
   * Extracts text from an ArrayBuffer or File as lines per page.
   */
  static async extractLinesFromPdf(fileData: ArrayBuffer): Promise<ExtractedPage[]> {
    const loadingTask = pdfjsLib.getDocument({
      data: fileData,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const extractedPages: ExtractedPage[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group text items by their vertical position (y coordinate)
      // Note: In PDF coordinates, y=0 is at the bottom, so higher y means higher on the page.
      const rawItems = textContent.items as Array<{
        str: string;
        transform: number[];
      }>;

      interface TextToken {
        text: string;
        x: number;
        y: number;
      }

      const tokens: TextToken[] = [];

      for (const item of rawItems) {
        if (!item.str || item.str.trim() === '') continue;
        const x = item.transform[4];
        const y = item.transform[5];
        tokens.push({
          text: item.str,
          x,
          y
        });
      }

      // Group tokens into lines with a y-tolerance of ~3.5 points
      const lineTolerance = 3.5;
      const lineBuckets: { y: number; tokens: TextToken[] }[] = [];

      for (const token of tokens) {
        let matchedBucket = lineBuckets.find(b => Math.abs(b.y - token.y) <= lineTolerance);
        if (!matchedBucket) {
          matchedBucket = { y: token.y, tokens: [] };
          lineBuckets.push(matchedBucket);
        }
        matchedBucket.tokens.push(token);
      }

      // Sort lines top to bottom (descending y)
      lineBuckets.sort((a, b) => b.y - a.y);

      // Within each line, sort tokens left to right (ascending x) and join with space
      const lines: string[] = [];
      for (const bucket of lineBuckets) {
        bucket.tokens.sort((a, b) => a.x - b.x);
        const lineText = bucket.tokens.map(t => t.text.trim()).filter(Boolean).join(' ');
        if (lineText.length > 0) {
          lines.push(lineText);
        }
      }

      extractedPages.push({
        pageNumber: pageNum,
        lines
      });
    }

    return extractedPages;
  }
}
