import * as pdfjsLib from 'pdfjs-dist';
import { PdfDocument } from './PdfDocument.js';


export class PdfDocumentLoader {
  constructor(private readonly url: string, private readonly options: PdfOptions) {}

  public async load(): Promise<PdfDocument> {
    const loadingTask = pdfjsLib.getDocument({
      url: this.url,
      cMapUrl: this.options.cMapUrl,
      cMapPacked: this.options.cMapPacked,
      enableXfa: this.options.enableXfa,
    });
    return loadingTask.promise.then((result: pdfjsLib.PDFDocumentProxy) => new PdfDocument(result));
  }
}

export class PdfOptions {
  // TODO: make these private
  constructor(readonly cMapUrl?: string, readonly cMapPacked: boolean = false, readonly enableXfa: boolean = false) {

  }
}