import * as pdfjsLib from "pdfjs-dist";
import { EventBus, PDFPageView } from "pdfjs-dist/web/pdf_viewer";

/** Represents a PDF page, providing methods to render pages and thumbnails. */
export class PdfPage {
  constructor(
    private readonly pdfPageProxy: pdfjsLib.PDFPageProxy,
    private readonly pageNumber: number,
    private readonly eventBus: EventBus
  ) {}

  public async render(
    container: HTMLDivElement | null,
    scale: number,
    rotation: number
  ) {
    // Creating the page view with default parameters.
    const pdfPageView = new PDFPageView({
      container: container != null ? container : undefined,
      id: this.pageNumber,
      scale: scale,
      defaultViewport: this.pdfPageProxy.getViewport({
        scale: scale,
        rotation: rotation,
      }),
      eventBus: this.eventBus,
    });
    pdfPageView.rotation = rotation;
    // Associate the actual page with the view, and draw it.
    pdfPageView.setPdfPage(this.pdfPageProxy);
    pdfPageView.draw();
  }

  public async renderThumbnail(canvas: HTMLCanvasElement, maxSizePx: number) {
    const defaultViewPort = this.pdfPageProxy.getViewport({
      scale: 1,
    });
    if (defaultViewPort.width > defaultViewPort.height) {
      canvas.width = maxSizePx;
      canvas.height =
        (maxSizePx * defaultViewPort.height) / defaultViewPort.width;
    } else {
      canvas.width =
        (maxSizePx * defaultViewPort.width) / defaultViewPort.height;
      canvas.height = maxSizePx;
    }
    const scale = Math.min(
      canvas.width / defaultViewPort.width,
      canvas.height / defaultViewPort.height
    );
    if (canvas.getContext("2d") != null) {
      const context2d: CanvasRenderingContext2D = canvas.getContext(
        "2d"
      ) as CanvasRenderingContext2D;
      return this.pdfPageProxy.render({
        canvasContext: context2d,
        viewport: this.pdfPageProxy.getViewport({
          scale: scale,
        }),
      });
    }
  }

  public getRotation(): number {
    return this.pdfPageProxy.getViewport().rotation;
  }

  public getSize(): [number, number] {
    const viewport = this.pdfPageProxy.getViewport({ scale: 1 });
    return [viewport.width, viewport.height];
  }
}
