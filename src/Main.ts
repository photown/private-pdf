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

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "../node_modules/pdfjs-dist/build/pdf.worker.js";

// // Some PDFs need external cmaps.
// //
const CMAP_URL = "../node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;

const DEFAULT_URL =
  "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";
const DEFAULT_PAGE = 1;
const SCALE = 1.0;
const ENABLE_XFA = true;
const THUMBNAIL_MAX_SIZE = 96;

var currentPage = 1;

window.onload = onPageLoad;

function onPageLoad() {
  const view = new View();

  view.setOnPdfFileChosenListener(async function (pdfFile: File) {
    await readFileAsArrayBuffer(pdfFile).then(function (fileData: ArrayBuffer) {
      loadPdf(fileData);
    });
  });

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

  //downloadAndLoadPdf(DEFAULT_URL);

  function downloadAndLoadPdf(url: string) {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        // The arrayBuffer contains the file data
        console.log("File downloaded successfully:", arrayBuffer);
        loadPdf(arrayBuffer);
      })
      .catch((error) => {
        console.error("Error downloading file:", error);
      });
  }

  async function loadPdf(fileData: ArrayBuffer) {
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
          console.log("loading page " + pageNumber);
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

    view.setOnRotateClickListener(async function () {
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
      loadPdf(savedBytes);
    });

    view.setOnSaveClickedListener(async function () {
      const formInputValues: FormInputValues = view.extractFormInputValues();
      const overlays: Overlays = extractOverlays();

      const bytes = await pdfDocument.savePdf(formInputValues, overlays);

      view.downloadBlob(bytes, "testfile");
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
      const draggables = document.querySelectorAll(".draggable");
      const pageOverlaysMap: Map<number, PageOverlays> = new Map();

      draggables.forEach(function (draggable: Element) {
        if (draggable.classList.contains("text")) {
          addTextOverlay(draggable as HTMLElement, pageOverlaysMap);
        } else if (draggable.classList.contains("image")) {
          addImageOverlay(draggable as HTMLElement, pageOverlaysMap);
        }
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
      draggable: HTMLElement,
      pageOverlaysMap: Map<number, PageOverlays>
    ) {
      const image = draggable.querySelector(
        ".image-wrapper"
      ) as HTMLImageElement;
      if (image) {
        const pages = document.querySelectorAll("#content .page");

        const pagesToIncludeImage = getPagesOverlappingOverlay(
          pages,
          draggable
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

          const imageType = extractImageTypeFromBase64(image.src);
          if (imageType == null) {
            console.log(
              `Could not extract image type for base64 image ${image.src} - not PNG nor JPEG.`
            );
            continue;
          }
          const scale =
            parseFloat(
              (
                draggable.querySelector(
                  "input[type=number].scale"
                ) as HTMLInputElement
              ).value
            ) / 100;
          const width = image.naturalWidth * scale * originalToActualRatio;
          const height = image.naturalHeight * scale * originalToActualRatio;
          const imageOverlay = new ImageOverlay(
            image.src,
            width,
            height,
            imageType
          );
          const contentInner = view.contentInner;
          const [offsetLeft, offsetTop] = offsetRelativeToAncestor(
            image,
            contentInner
          );
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
    }

    // Returns a list of the page numbers for the pages that the draggable overlaps with.
    function getPagesOverlappingOverlay(
      pages: NodeListOf<Element>,
      draggable: HTMLElement
    ): Array<number> {
      const pagesToInclude = [];
      for (var i = 1; i <= pdfDocument.getPageCount(); i++) {
        const page = pages[i - 1] as HTMLElement;
        const draggableTopLeft = [draggable.offsetLeft, draggable.offsetTop];
        const draggableBottomRight = [
          draggable.offsetLeft + draggable.offsetWidth,
          draggable.offsetTop + draggable.offsetHeight,
        ];
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
      draggable: HTMLElement,
      pageOverlaysMap: Map<number, PageOverlays>
    ) {
      const textInput = draggable.querySelector('input[type="text"]');
      const contentInner = view.contentInner;
      const pages = document.querySelectorAll("#content .page");
      if (textInput) {
        const textInputCasted = textInput as HTMLInputElement;
        const pagesToIncludeImage = getPagesOverlappingOverlay(
          pages,
          draggable
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
          textOverlay.text = textInputCasted.value;
          const page = pages[pageNumber - 1] as HTMLElement;
          const computedStyle = window.getComputedStyle(textInputCasted, null);
          const fontSizeStr: string = computedStyle.fontSize;
          const fontSizePx = Number.parseInt(fontSizeStr);

          textOverlay.textColor = ColorUtils.normalize(
            ColorUtils.parseRgb(computedStyle.color) || ColorUtils.BLACK
          );
          textOverlay.textSize = fontSizePx * originalToActualRatio;
          textOverlay.fontFamily = computedStyle.fontFamily;
          const [offsetLeft, offsetTop] = offsetRelativeToAncestor(
            textInputCasted,
            contentInner
          );
          textOverlay.transform.x =
            (2 + offsetLeft + (2 + offsetLeft) / page.offsetWidth) *
            originalToActualRatio;
          const p1 =
            (0.5 *
              baselineRatio(computedStyle.fontFamily, fontSizePx) *
              textInputCasted.offsetHeight *
              (originalToActualRatio + 1)) /
            originalToActualRatio;

          const p2 =
            p1 +
            page.offsetHeight -
            (offsetTop + textInputCasted.offsetHeight - page.offsetTop);
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

    function offsetRelativeToAncestor(
      child: HTMLElement,
      ancestor: HTMLElement
    ): [number, number] {
      var x: number = 0;
      var y: number = 0;

      var currentElement: HTMLElement | null = child;
      while (currentElement != ancestor && currentElement != null) {
        x += currentElement.offsetLeft;
        y += currentElement.offsetTop;
        currentElement = currentElement.parentElement;
      }

      return [x, y];
    }

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

      console.log(
        "simon #1 printing page size ",
        dimensionWidth,
        dimensionHeight,
        pageRotation
      );

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
