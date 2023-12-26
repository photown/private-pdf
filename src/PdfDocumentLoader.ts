import * as pdfjsLib from "pdfjs-dist";
import { PdfDocument } from "./PdfDocument";

/** Helper which loads a PDF file from the supplied `fileData`. */
export class PdfDocumentLoader {
  constructor(
    private readonly fileData: ArrayBuffer,
    private readonly options: PdfOptions
  ) {}

  public async load(): Promise<PdfDocument> {
    const loadingTask = pdfjsLib.getDocument({
      data: this.fileData,
      cMapUrl: this.options.cMapUrl,
      cMapPacked: this.options.cMapPacked,
      enableXfa: this.options.enableXfa,
    });
    return loadingTask.promise.then(
      (result: pdfjsLib.PDFDocumentProxy) => new PdfDocument(result)
    );
  }
}

/** PDF options for loading a PDF, such as the cMap URL. */
export class PdfOptions {
  constructor(
    readonly cMapUrl?: string,
    readonly cMapPacked: boolean = false,
    readonly enableXfa: boolean = false
  ) {}
}
