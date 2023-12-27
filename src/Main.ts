import * as pdfjsLib from "pdfjs-dist";

import { baselineRatio } from "./BaselineRatio";
import { ColorUtils } from "./ColorUtils";
import { FormInputValues } from "./FormInputValues";
import { PdfDocument } from "./PdfDocument";
import { PdfDocumentLoader } from "./PdfDocumentLoader";
import { PdfPage } from "./PdfPage";
import { ImageOverlay, ImageType } from "./overlays/ImageOverlay";
import { Overlays } from "./overlays/Overlays";
import { PageOverlays } from "./overlays/PageOverlays";
import { TextOverlay } from "./overlays/TextOverlay";
import { View } from "./View";
import { Transform } from "./overlays/Transform";
import { TextDraggableMetadata } from "./draggables/TextDraggableMetadata";
import { ImageDraggableMetadata } from "./draggables/ImageDraggableMetadata";

pdfjsLib.GlobalWorkerOptions.workerSrc = "dist/pdf.worker.js";

const CMAP_URL = "dist/cmaps/";
const CMAP_PACKED = true;
const ENABLE_XFA = true;
const THUMBNAIL_MAX_SIZE = 96;

var currentPage = 1;

window.onload = onPageLoad;

function onPageLoad() {
  const view = new View();

  parsePageUrl();

  view.setOnPdfFileChosenListener(
    () => true,
    async function (pdfFile: File) {
      await loadPdfFromFile(pdfFile);
    }
  );

  async function loadPdfFromFile(pdfFile: File) {
    await readFileAsArrayBuffer(pdfFile).then(function (fileData: ArrayBuffer) {
      loadPdf(pdfFile.name, fileData);
    });
  }

  function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
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

  function parsePageUrl() {
    const pdfParamValue = new URLSearchParams(window.location.search).get(
      "pdf"
    );
    if (pdfParamValue != null && pdfParamValue != "") {
      downloadAndLoadPdf(pdfParamValue);
    }
  }

  function downloadAndLoadPdf(url: string) {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const fileName = url.split("/").pop() || "mypdf.pdf";
        loadPdf(fileName, arrayBuffer);
      })
      .catch((error) => {
        console.error("Error downloading file:", error);
        alert(`Error downloading file: ${error}`);
      });
  }

  async function loadPdf(fileName: string, fileData: ArrayBuffer) {
    currentPage = 1;
    var originalToActualRatio: number = -1;

    view.resetState();

    let pdfDocumentLoader: PdfDocumentLoader = new PdfDocumentLoader(fileData, {
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      enableXfa: ENABLE_XFA,
    });

    let pdfDocument: PdfDocument = await pdfDocumentLoader.load();

    view.setTotalPages(parseInt(pdfDocument.getPageCount().toString()));

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
                THUMBNAIL_MAX_SIZE
              );
            })
            .then(function () {
              entry.target.setAttribute("data-rendered", "true");
            });
        }
      });
    });

    view.createThumbnailPlaceholders(
      pdfDocument.getPageCount(),
      thumbnailShownObserver,
      function (pageNumber: number) {
        gotoPage(pageNumber);
      }
    );

    gotoPage(currentPage, /* scrollToPage = */ false);

    for (
      var pageNumber = 1;
      pageNumber <= pdfDocument.getPageCount();
      pageNumber++
    ) {
      await pdfDocument.loadPage(pageNumber).then(function (pdfPage: PdfPage) {
        pdfPage.render(view.container, /* scale = */ 1, /* rotation = */ 0);
        if (originalToActualRatio == -1) {
          originalToActualRatio = view.calculateOriginalToActualRatio(
            pageNumber,
            pdfPage
          );
        }
      });
    }

    view.enableNavButtons();

    view.setOnPdfFileChosenListener(
      function () {
        const overlays: Overlays = extractOverlays();
        const formValues = view.extractFormInputValues();
        return (
          (overlays.pagesOverlays.size == 0 && formValues.isEmpty()) ||
          confirm(
            "If you load another PDF, all changes in the current PDF will be lost. Are you sure?"
          )
        );
      },
      async function (pdfFile: File) {
        await loadPdfFromFile(pdfFile);
      }
    );

    view.setOnNextClickedListener(function () {
      if (currentPage + 1 <= pdfDocument.getPageCount()) {
        gotoPage(currentPage + 1);
      }
    });

    view.setOnPreviousClickedListener(function () {
      if (currentPage - 1 >= 1) {
        gotoPage(currentPage - 1);
      }
    });

    view.setOnCurrentPageInputListener(function (event: Event) {
      const input = event.target as HTMLInputElement;
      const inputValue = input.value;
      const page = parseFloat(inputValue);
      if (!isNaN(page) && page > 0 && page <= pdfDocument.getPageCount()) {
      } else {
        input.value = currentPage.toString();
      }
    });

    view.setOnCurrentPageFocusOutListener(function (event: FocusEvent) {
      const input = event.target as HTMLInputElement;
      const inputValue = input.value;
      const page = parseFloat(inputValue);
      if (!isNaN(page) && page > 0 && page <= pdfDocument.getPageCount()) {
        gotoPage(page);
      }
    });

    view.setOnRotateClockwiseClickListener(async function () {
      const formInputValues: FormInputValues = view.extractFormInputValues();
      const overlays: Overlays = extractOverlays();

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
      loadPdf(fileName, savedBytes);
    });

    view.setOnRotateCounterClockwiseClickListener(async function () {
      const formInputValues: FormInputValues = view.extractFormInputValues();
      const overlays: Overlays = extractOverlays();

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
      loadPdf(fileName, savedBytes);
    });

    view.setOnSaveClickedListener(async function () {
      const formInputValues: FormInputValues = view.extractFormInputValues();
      const overlays: Overlays = extractOverlays();

      const bytes = await pdfDocument.savePdf(formInputValues, overlays);

      view.downloadBlob(bytes, "privatepdf-" + fileName);
    });

    view.setOnInsertTextClickListener();

    view.setOnInsertImageInputListener(validateBase64);

    view.setOnContentScrollEventListener(function (currentScrollPage: number) {
      if (currentPage != currentScrollPage) {
        gotoPage(currentScrollPage, false);
      }
    });

    window.addEventListener("beforeunload", (e: BeforeUnloadEvent) => {
      const confirmationMessage =
        "If you leave this page, all changes in your PDF will be lost. Are you sure?";
      (e || window.event).returnValue = confirmationMessage; // Gecko + IE
      return confirmationMessage; // Gecko + Webkit, Safari, Chrome, etc.
    });

    function extractOverlays(): Overlays {
      const overlays: Overlays = new Overlays();
      const pageOverlaysMap: Map<number, PageOverlays> = new Map();

      const textDraggableMetadatas = view.getTextDraggableMetadata();
      textDraggableMetadatas.forEach(function (textDraggableMetadata) {
        addTextOverlay(textDraggableMetadata, pageOverlaysMap);
      });

      const imageDraggableMetadatas = view.getImageDraggableMetadata();
      imageDraggableMetadatas.forEach(function (imageDraggableMetadata) {
        addImageOverlay(imageDraggableMetadata, pageOverlaysMap);
      });

      for (var i = 1; i <= pdfDocument.getPageCount(); i++) {
        const pageOverlays = pageOverlaysMap.get(i);
        if (pageOverlays) {
          overlays.pagesOverlays.set(i, pageOverlaysMap.get(i) as PageOverlays);
        }
      }

      return overlays;
    }

    function isPointInRect(
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

    function doRectsOverlap(
      rect1TopLeft: number[],
      rect1BottomRight: number[],
      rect2TopLeft: number[],
      rect2BottomRight: number[]
    ): boolean {
      return (
        isPointInRect(rect1TopLeft, rect2TopLeft, rect2BottomRight) ||
        isPointInRect(rect1BottomRight, rect2TopLeft, rect2BottomRight) ||
        isPointInRect(
          [rect1TopLeft[0], rect1BottomRight[1]],
          rect2TopLeft,
          rect2BottomRight
        ) ||
        isPointInRect(
          [rect1BottomRight[0], rect1TopLeft[1]],
          rect2TopLeft,
          rect2BottomRight
        )
      );
    }

    function addImageOverlay(
      draggable: ImageDraggableMetadata,
      pageOverlaysMap: Map<number, PageOverlays>
    ) {
      const pages = view.getAllPages();

      const pagesToIncludeImage = getPagesOverlappingOverlay(
        pages,
        draggable.draggableTopLeft,
        draggable.draggableBottomRight
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

        const imageType = extractImageTypeFromBase64(draggable.imageBase64);
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
        adjustTransformToPageRotation(imageOverlay.transform, pdfPage);
        if (!pageOverlaysMap.has(pageNumber)) {
          pageOverlaysMap.set(pageNumber, new PageOverlays());
        }
        (pageOverlaysMap.get(pageNumber) as PageOverlays).imageOverlays.push(
          imageOverlay
        );
      }
    }

    // Returns a list of the page numbers for the pages that the draggable overlaps with.
    function getPagesOverlappingOverlay(
      pages: NodeListOf<Element>,
      draggableTopLeft: [number, number],
      draggableBottomRight: [number, number]
    ): Array<number> {
      const pagesToInclude = [];
      for (var i = 1; i <= pdfDocument.getPageCount(); i++) {
        const page = pages[i - 1] as HTMLElement;
        const pageTopLeft = [page.offsetLeft, page.offsetTop];
        const pageBottomRight = [
          page.offsetLeft + page.offsetWidth,
          page.offsetTop + page.offsetHeight,
        ];
        if (
          doRectsOverlap(
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

    function extractImageTypeFromBase64(base64: string): ImageType | null {
      if (base64.startsWith("data:image/png;")) {
        return ImageType.PNG;
      } else if (base64.startsWith("data:image/jpeg;")) {
        return ImageType.JPEG;
      }
      return null;
    }

    function validateBase64(base64: string): boolean {
      return extractImageTypeFromBase64(base64) != null;
    }

    function addTextOverlay(
      draggable: TextDraggableMetadata,
      pageOverlaysMap: Map<number, PageOverlays>
    ) {
      const textInput = draggable.textInput;
      const pages = view.getAllPages();
      if (textInput) {
        const pagesToIncludeImage = getPagesOverlappingOverlay(
          pages,
          draggable.draggableTopLeft,
          draggable.draggableBottomRight
        );

        for (const pageNumber of pagesToIncludeImage) {
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
            (2 + offsetLeft + (2 + offsetLeft) / page.offsetWidth) *
            originalToActualRatio;
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

          adjustTransformToPageRotation(textOverlay.transform, pdfPage);

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
    function adjustTransformToPageRotation(
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

    function gotoPage(pageNumber: number, scrollToPage: boolean = true) {
      view.gotoPage(pageNumber, currentPage, scrollToPage);
      currentPage = pageNumber;
    }
  }
}
