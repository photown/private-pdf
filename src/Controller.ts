import * as pdfjsLib from "pdfjs-dist";

import { baselineRatio } from "./utils/BaselineRatio";
import { ColorUtils } from "./utils/ColorUtils";
import { FormInputValues } from "./forms/FormInputValues";
import { PdfDocument } from "./pdf/PdfDocument";
import { PdfDocumentLoader } from "./pdf/PdfDocumentLoader";
import { PdfPage } from "./pdf/PdfPage";
import { ImageOverlay, ImageType } from "./overlays/ImageOverlay";
import { Overlays } from "./overlays/Overlays";
import { PageOverlays } from "./overlays/PageOverlays";
import { TextOverlay } from "./overlays/TextOverlay";
import { View } from "./View";
import { Transform } from "./overlays/Transform";
import { TextDraggableMetadata } from "./draggables/TextDraggableMetadata";
import { ImageDraggableMetadata } from "./draggables/ImageDraggableMetadata";

/** Controller which is responsible for bridging the model and the view. */
export class Controller {
  private static CMAP_URL = "dist/cmaps/";
  private static CMAP_PACKED = true;
  private static ENABLE_XFA = true;
  private static THUMBNAIL_MAX_SIZE = 96;

  private view = new View();
  private currentPage = 1;

  public init(): void {
    const pageUrl = this.extractPageUrl();
    if (pageUrl != null) {
      this.downloadAndLoadPdf(pageUrl);
    }
    this.view.setOnPdfFileChosenListener(
      () => true,
      async (pdfFile: File) => {
        await this.loadPdfFromFile(pdfFile);
      }
    );
  }

  private async loadPdfFromFile(pdfFile: File) {
    const that = this;
    await this.readFileAsArrayBuffer(pdfFile).then(function (
      fileData: ArrayBuffer
    ) {
      that.loadPdf(pdfFile.name, fileData);
    });
  }

  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(event.target.result);
        } else {
          reject(new Error("Error reading file"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private extractPageUrl(): string | null {
    const pdfParamValue = new URLSearchParams(window.location.search).get(
      "pdf"
    );
    if (pdfParamValue != null && pdfParamValue != "") {
      return pdfParamValue;
    }
    return null;
  }

  private downloadAndLoadPdf(url: string) {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const fileName = url.split("/").pop() || "mypdf.pdf";
        this.loadPdf(fileName, arrayBuffer);
      })
      .catch((error) => {
        console.error("Error downloading file:", error);
        alert(`Error downloading file: ${error}`);
      });
  }

  private async loadPdf(fileName: string, fileData: ArrayBuffer) {
    this.currentPage = 1;
    var originalToActualRatio: number = -1;

    this.view.resetState();

    let pdfDocumentLoader: PdfDocumentLoader = new PdfDocumentLoader(fileData, {
      cMapUrl: Controller.CMAP_URL,
      cMapPacked: Controller.CMAP_PACKED,
      enableXfa: Controller.ENABLE_XFA,
    });

    let pdfDocument: PdfDocument = await pdfDocumentLoader.load();

    this.view.setTotalPages(parseInt(pdfDocument.getPageCount().toString()));

    const thumbnailShownObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (
          entry.intersectionRatio > 0 &&
          entry.target.getAttribute("data-pagenumber") != null &&
          entry.target.getAttribute("data-rendered") == null &&
          (entry.target as HTMLCanvasElement)
        ) {
          const pageNumber = Number.parseInt(
            entry.target.getAttribute("data-pagenumber") as string
          );
          console.log("Loading page " + pageNumber);
          pdfDocument
            .loadPage(pageNumber)
            .then(function (page: PdfPage) {
              page.renderThumbnail(
                entry.target as HTMLCanvasElement,
                Controller.THUMBNAIL_MAX_SIZE
              );
            })
            .then(function () {
              entry.target.setAttribute("data-rendered", "true");
            });
        }
      });
    });

    this.view.createThumbnailPlaceholders(
      pdfDocument.getPageCount(),
      thumbnailShownObserver,
      (pageNumber: number) => {
        this.gotoPage(pageNumber);
      }
    );

    this.gotoPage(this.currentPage, /* scrollToPage = */ false);

    for (
      var pageNumber = 1;
      pageNumber <= pdfDocument.getPageCount();
      pageNumber++
    ) {
      await pdfDocument.loadPage(pageNumber).then((pdfPage: PdfPage) => {
        pdfPage.render(
          this.view.container,
          /* scale = */ 1,
          /* rotation = */ 0
        );
        if (originalToActualRatio == -1) {
          originalToActualRatio = this.view.calculateOriginalToActualRatio(
            pageNumber,
            pdfPage
          );
        }
      });
    }

    this.view.enableNavButtons();

    this.view.setOnPdfFileChosenListener(
      () => {
        const overlays: Overlays = this.extractOverlays(
          originalToActualRatio,
          pdfDocument
        );
        const formValues = this.view.extractFormInputValues();
        return (
          (overlays.pagesOverlays.size == 0 && formValues.isEmpty()) ||
          confirm(
            "If you load another PDF, all changes in the current PDF will be lost. Are you sure?"
          )
        );
      },
      async (pdfFile: File) => {
        await this.loadPdfFromFile(pdfFile);
      }
    );

    this.view.setOnNextClickedListener(() => {
      if (this.currentPage + 1 <= pdfDocument.getPageCount()) {
        this.gotoPage(this.currentPage + 1);
      }
    });

    this.view.setOnPreviousClickedListener(() => {
      if (this.currentPage - 1 >= 1) {
        this.gotoPage(this.currentPage - 1);
      }
    });

    this.view.setOnCurrentPageInputListener((event: Event) => {
      const input = event.target as HTMLInputElement;
      const inputValue = input.value;
      const page = parseFloat(inputValue);
      if (!isNaN(page) && page > 0 && page <= pdfDocument.getPageCount()) {
      } else {
        input.value = this.currentPage.toString();
      }
    });

    this.view.setOnCurrentPageFocusOutListener((event: FocusEvent) => {
      const input = event.target as HTMLInputElement;
      const inputValue = input.value;
      const page = parseFloat(inputValue);
      if (!isNaN(page) && page > 0 && page <= pdfDocument.getPageCount()) {
        this.gotoPage(page);
      }
    });

    this.view.setOnRotateClockwiseClickListener(async () => {
      const formInputValues: FormInputValues =
        this.view.extractFormInputValues();
      const overlays: Overlays = this.extractOverlays(
        originalToActualRatio,
        pdfDocument
      );

      if (
        overlays.pagesOverlays.size > 0 &&
        !confirm(
          "You won't be able to edit the text and/or images you've added after rotating the PDF. Proceed anyway?"
        )
      ) {
        return;
      }

      const savedBytes = await pdfDocument.savePdf(
        formInputValues,
        overlays,
        /* rotateBy = */ 90
      );
      this.loadPdf(fileName, savedBytes);
    });

    this.view.setOnRotateCounterClockwiseClickListener(async () => {
      const formInputValues: FormInputValues =
        this.view.extractFormInputValues();
      const overlays: Overlays = this.extractOverlays(
        originalToActualRatio,
        pdfDocument
      );

      if (
        overlays.pagesOverlays.size > 0 &&
        !confirm(
          "You won't be able to edit the text and/or images you've added after rotating the PDF. Proceed anyway?"
        )
      ) {
        return;
      }

      const savedBytes = await pdfDocument.savePdf(
        formInputValues,
        overlays,
        /* rotateBy = */ -90
      );
      this.loadPdf(fileName, savedBytes);
    });

    this.view.setOnSaveClickedListener(async () => {
      const formInputValues: FormInputValues =
        this.view.extractFormInputValues();
      const overlays: Overlays = this.extractOverlays(
        originalToActualRatio,
        pdfDocument
      );

      const bytes = await pdfDocument.savePdf(formInputValues, overlays);

      this.view.downloadBlob(bytes, "privatepdf-" + fileName);
    });

    this.view.setOnInsertTextClickListener();

    this.view.setOnInsertImageInputListener((base64: string) =>
      this.validateBase64(base64)
    );

    this.view.setOnContentScrollEventListener((currentScrollPage: number) => {
      if (this.currentPage != currentScrollPage) {
        this.gotoPage(currentScrollPage, false);
      }
    });

    window.addEventListener("beforeunload", (e: BeforeUnloadEvent) => {
      const confirmationMessage =
        "If you leave this page, all changes in your PDF will be lost. Are you sure?";
      (e || window.event).returnValue = confirmationMessage; // Gecko + IE
      return confirmationMessage; // Gecko + Webkit, Safari, Chrome, etc.
    });
  }

  private extractOverlays(
    originalToActualRatio: number,
    pdfDocument: PdfDocument
  ): Overlays {
    const overlays: Overlays = new Overlays();
    const pageOverlaysMap: Map<number, PageOverlays> = new Map();

    const textDraggableMetadatas = this.view.getTextDraggableMetadata();
    textDraggableMetadatas.forEach((textDraggableMetadata) => {
      this.addTextOverlay(
        textDraggableMetadata,
        pageOverlaysMap,
        originalToActualRatio,
        pdfDocument
      );
    });

    const imageDraggableMetadatas = this.view.getImageDraggableMetadata();
    imageDraggableMetadatas.forEach((imageDraggableMetadata) => {
      this.addImageOverlay(
        imageDraggableMetadata,
        pageOverlaysMap,
        originalToActualRatio,
        pdfDocument
      );
    });

    for (var i = 1; i <= pdfDocument.getPageCount(); i++) {
      const pageOverlays = pageOverlaysMap.get(i);
      if (pageOverlays) {
        overlays.pagesOverlays.set(i, pageOverlaysMap.get(i) as PageOverlays);
      }
    }

    return overlays;
  }

  private isPointInRect(
    point: number[],
    rectTopLeft: number[],
    rectBottomRight: number[]
  ): boolean {
    return (
      point[0] > rectTopLeft[0] &&
      point[0] < rectBottomRight[0] &&
      point[1] > rectTopLeft[1] &&
      point[1] < rectBottomRight[1]
    );
  }

  private doRectsOverlap(
    rect1TopLeft: number[],
    rect1BottomRight: number[],
    rect2TopLeft: number[],
    rect2BottomRight: number[]
  ): boolean {
    return (
      this.isPointInRect(rect1TopLeft, rect2TopLeft, rect2BottomRight) ||
      this.isPointInRect(rect1BottomRight, rect2TopLeft, rect2BottomRight) ||
      this.isPointInRect(
        [rect1TopLeft[0], rect1BottomRight[1]],
        rect2TopLeft,
        rect2BottomRight
      ) ||
      this.isPointInRect(
        [rect1BottomRight[0], rect1TopLeft[1]],
        rect2TopLeft,
        rect2BottomRight
      )
    );
  }

  private addImageOverlay(
    draggable: ImageDraggableMetadata,
    pageOverlaysMap: Map<number, PageOverlays>,
    originalToActualRatio: number,
    pdfDocument: PdfDocument
  ) {
    const pages = this.view.getAllPages();

    const pagesToIncludeImage = this.getPagesOverlappingOverlay(
      pages,
      draggable.draggableTopLeft,
      draggable.draggableBottomRight,
      pdfDocument.getPageCount()
    );

    for (const pageNumber of pagesToIncludeImage) {
      const pdfPage = pdfDocument.getCachedPage(pageNumber);
      if (pdfPage == null) {
        console.log(
          `Could not retrieve page ${pageNumber} for text overlay, aborting...`
        );
        continue;
      }
      const page = pages[pageNumber - 1] as HTMLElement;

      const imageType = this.extractImageTypeFromBase64(draggable.imageBase64);
      if (imageType == null) {
        console.log(
          `Could not extract image type for base64 image ${draggable.imageBase64} - not PNG nor JPEG.`
        );
        continue;
      }
      const width = draggable.scaledSize[0] * originalToActualRatio;
      const height = draggable.scaledSize[1] * originalToActualRatio;
      const imageOverlay = new ImageOverlay(
        draggable.imageBase64,
        width,
        height,
        imageType
      );
      const [offsetLeft, offsetTop] = draggable.offsetToAncestor;
      imageOverlay.transform.x = offsetLeft * originalToActualRatio;
      imageOverlay.transform.y =
        (page.offsetHeight - offsetTop + page.offsetTop) *
          originalToActualRatio -
        height;
      this.adjustTransformToPageRotation(imageOverlay.transform, pdfPage);
      if (!pageOverlaysMap.has(pageNumber)) {
        pageOverlaysMap.set(pageNumber, new PageOverlays());
      }
      (pageOverlaysMap.get(pageNumber) as PageOverlays).imageOverlays.push(
        imageOverlay
      );
    }
  }

  // Returns a list of the page numbers for the pages that the draggable overlaps with.
  private getPagesOverlappingOverlay(
    pages: NodeListOf<Element>,
    draggableTopLeft: [number, number],
    draggableBottomRight: [number, number],
    pageCount: number
  ): Array<number> {
    const pagesToInclude = [];
    for (var i = 1; i <= pageCount; i++) {
      const page = pages[i - 1] as HTMLElement;
      const pageTopLeft = [page.offsetLeft, page.offsetTop];
      const pageBottomRight = [
        page.offsetLeft + page.offsetWidth,
        page.offsetTop + page.offsetHeight,
      ];
      if (
        this.doRectsOverlap(
          draggableTopLeft,
          draggableBottomRight,
          pageTopLeft,
          pageBottomRight
        )
      ) {
        pagesToInclude.push(i);
      }
    }
    return pagesToInclude;
  }

  private extractImageTypeFromBase64(base64: string): ImageType | null {
    if (base64.startsWith("data:image/png;")) {
      return ImageType.PNG;
    } else if (base64.startsWith("data:image/jpeg;")) {
      return ImageType.JPEG;
    }
    return null;
  }

  private validateBase64(base64: string): boolean {
    return this.extractImageTypeFromBase64(base64) != null;
  }

  private addTextOverlay(
    draggable: TextDraggableMetadata,
    pageOverlaysMap: Map<number, PageOverlays>,
    originalToActualRatio: number,
    pdfDocument: PdfDocument
  ) {
    const textInput = draggable.textInput;
    const pages = this.view.getAllPages();
    if (textInput) {
      const pagesToIncludeText = this.getPagesOverlappingOverlay(
        pages,
        draggable.draggableTopLeft,
        draggable.draggableBottomRight,
        pdfDocument.getPageCount()
      );

      for (const pageNumber of pagesToIncludeText) {
        const pdfPage = pdfDocument.getCachedPage(pageNumber);
        if (pdfPage == null) {
          console.log(
            `Could not retrieve page ${pageNumber} for text overlay, aborting...`
          );
          continue;
        }
        const textOverlay: TextOverlay = new TextOverlay();
        textOverlay.text = draggable.text;
        const page = pages[pageNumber - 1] as HTMLElement;
        const fontSizePx = draggable.fontSize;

        textOverlay.textColor = ColorUtils.normalize(
          ColorUtils.parseRgb(draggable.color) || ColorUtils.BLACK
        );
        textOverlay.textSize = fontSizePx * originalToActualRatio;
        textOverlay.fontFamily = draggable.fontFamily;
        const [offsetLeft, offsetTop] = draggable.offsetToAncestor;
        // To calculate the text overlay position, we need to account for the fact that
        // pdf-js requires the coordinates from the font baseline. Thus we need to
        // calculate it ourselves.
        textOverlay.transform.x =
          (offsetLeft + offsetLeft / page.offsetWidth) * originalToActualRatio;
        const p1 =
          (0.5 *
            baselineRatio(draggable.fontFamily, fontSizePx) *
            draggable.textInputOffsetHeight *
            (originalToActualRatio + 1)) /
          originalToActualRatio;

        const p2 =
          p1 +
          page.offsetHeight -
          (offsetTop + draggable.textInputOffsetHeight - page.offsetTop);
        textOverlay.transform.y =
          (p2 + p2 / page.offsetHeight) * originalToActualRatio;

        this.adjustTransformToPageRotation(textOverlay.transform, pdfPage);

        if (!pageOverlaysMap.has(pageNumber)) {
          pageOverlaysMap.set(pageNumber, new PageOverlays());
        }
        (pageOverlaysMap.get(pageNumber) as PageOverlays).textOverlays.push(
          textOverlay
        );
      }
    }
  }

  /** Applies a matrix transformation on the `Transform` object to be aligned with the `PdfPage`. */
  private adjustTransformToPageRotation(
    transform: Transform,
    pdfPage: PdfPage
  ): void {
    var drawX = null;
    var drawY = null;

    const pageRotation = pdfPage.getRotation();
    const rotationRads = (pageRotation * Math.PI) / 180;
    var dimensionWidth = pdfPage.getSize()[0];
    var dimensionHeight = pdfPage.getSize()[1];

    if (pageRotation == 90 || pageRotation == 270) {
      const t = dimensionWidth;
      dimensionWidth = dimensionHeight;
      dimensionHeight = t;
    }

    if (pageRotation === 90) {
      drawX =
        transform.x * Math.cos(rotationRads) -
        transform.y * Math.sin(rotationRads) +
        dimensionWidth;
      drawY =
        transform.x * Math.sin(rotationRads) +
        transform.y * Math.cos(rotationRads);
    } else if (pageRotation === 180) {
      drawX =
        transform.x * Math.cos(rotationRads) -
        transform.y * Math.sin(rotationRads) +
        dimensionWidth;
      drawY =
        transform.x * Math.sin(rotationRads) +
        transform.y * Math.cos(rotationRads) +
        dimensionHeight;
    } else if (pageRotation === 270) {
      drawX =
        transform.x * Math.cos(rotationRads) -
        transform.y * Math.sin(rotationRads);
      drawY =
        transform.x * Math.sin(rotationRads) +
        transform.y * Math.cos(rotationRads) +
        dimensionHeight;
    } else {
      //no rotation
      drawX = transform.x;
      drawY = transform.y;
    }
    transform.x = drawX;
    transform.y = drawY;
    transform.rotation = pageRotation;
  }

  private gotoPage(pageNumber: number, scrollToPage: boolean = true) {
    this.view.gotoPage(pageNumber, this.currentPage, scrollToPage);
    this.currentPage = pageNumber;
  }
}
