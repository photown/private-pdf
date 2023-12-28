import * as pdfjsLib from "pdfjs-dist";
import { EventBus } from "pdfjs-dist/web/pdf_viewer";

import { PdfPage } from "./PdfPage";
import { PdfDocumentSaver } from "./PdfDocumentSaver";
import { FormInputValues } from "../forms/FormInputValues";
import { Overlays } from "../overlays/Overlays";

/** Represents a PDF document, providing methods to load and save PDFs. */
export class PdfDocument {
  private pageCache: Map<number, PdfPage>;

  constructor(private readonly pdfDocumentProxy: pdfjsLib.PDFDocumentProxy) {
    this.pageCache = new Map();
  }

  public async loadPage(pageNumber: number): Promise<PdfPage> {
    if (pageNumber < 1 || pageNumber > this.getPageCount()) {
      throw new Error(
        `Page number ${pageNumber} is outside the accepted range [1, ${this.getPageCount()}].`
      );
    }
    return this.pdfDocumentProxy
      .getPage(pageNumber)
      .then((result: pdfjsLib.PDFPageProxy) => {
        const pdfPage = new PdfPage(result, pageNumber, new EventBus());
        this.pageCache.set(pageNumber, pdfPage);
        return pdfPage;
      });
  }

  public async savePdf(
    formInputValues: FormInputValues,
    overlays: Overlays,
    rotateBy: number = 0
  ): Promise<Uint8Array> {
    // This is the original PDF that was read
    const pdfBytes = await this.pdfDocumentProxy.saveDocument();

    // This applies all the changes to the PDF and saves it
    return new PdfDocumentSaver().applyChangesAndSave(
      pdfBytes,
      formInputValues,
      overlays,
      rotateBy
    );
  }

  public getCachedPage(pageNumber: number): PdfPage | null {
    if (!this.pageCache.has(pageNumber)) {
      console.log(`Page number ${pageNumber} not in cache, aborting...`);
      return null;
    }
    return this.pageCache.get(pageNumber) || null;
  }

  public getPageCount() {
    return this.pdfDocumentProxy.numPages;
  }
}
