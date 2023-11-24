import * as pdfjsLib from 'pdfjs-dist';
import { EventBus, PDFPageView } from 'pdfjs-dist/web/pdf_viewer';

export class PdfPage {
  constructor(private readonly pdfPageProxy: pdfjsLib.PDFPageProxy, private readonly pageNumber: number, private readonly eventBus: EventBus) {}

  public async render(container: HTMLDivElement | null, scale: number) {
    // Creating the page view with default parameters.
    const pdfPageView = new PDFPageView({
      container: (container != null) ? container : undefined,
      id: this.pageNumber,
      scale: scale,
      defaultViewport: this.pdfPageProxy.getViewport({ scale: scale }),
      eventBus: this.eventBus,
    });

    // Associate the actual page with the view, and draw it.
    pdfPageView.setPdfPage(this.pdfPageProxy);
    pdfPageView.draw();
  }
}