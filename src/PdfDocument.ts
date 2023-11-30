import * as pdfjsLib from 'pdfjs-dist';
import { EventBus } from 'pdfjs-dist/web/pdf_viewer';

import { PdfPage } from './PdfPage';
import { PdfDocumentSaver } from './PdfDocumentSaver';
import { FormInputValues } from './FormInputValues';
import { Overlays } from './overlays/Overlays';

export class PdfDocument {
  constructor(private readonly pdfDocumentProxy: pdfjsLib.PDFDocumentProxy) {}

  public async loadPage(pageNumber: number): Promise<PdfPage> {
    if (pageNumber < 1 || pageNumber > this.getPageCount()) {
      throw new Error(`Page number ${pageNumber} is outside the accepted range [1, ${this.getPageCount()}].`);
    }
    return this.pdfDocumentProxy.getPage(pageNumber).then((result: pdfjsLib.PDFPageProxy) => new PdfPage(result, pageNumber, new EventBus()))
  }

  public async savePdf(formInputValues: FormInputValues, overlays: Overlays): Promise<Uint8Array> {
    // This is the original PDF that was read
    const pdfBytes = await this.pdfDocumentProxy.saveDocument();

    // This applies all the changes to the PDF and saves it
    return new PdfDocumentSaver().applyChangesAndSave(pdfBytes, formInputValues, overlays)
  }

  public getPageCount() {
    return this.pdfDocumentProxy.numPages;
  }

}

