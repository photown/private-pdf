import * as pdfjsLib from 'pdfjs-dist';
import { EventBus } from 'pdfjs-dist/web/pdf_viewer';

import { PdfPage } from './PdfPage.js';

export class PdfDocument {
  constructor(private readonly pdfDocumentProxy: pdfjsLib.PDFDocumentProxy) {}

  public async loadPage(pageNumber: number): Promise<PdfPage> {
    if (pageNumber < 1 || pageNumber > this.getPageCount()) {
      throw new Error(`Page number ${pageNumber} is outside the accepted range [1, ${this.getPageCount()}.`);
    }
    return this.pdfDocumentProxy.getPage(pageNumber).then((result: pdfjsLib.PDFPageProxy) => new PdfPage(result, pageNumber, new EventBus()))
  }

  public getPageCount() {
    return this.pdfDocumentProxy.numPages;
  }
}