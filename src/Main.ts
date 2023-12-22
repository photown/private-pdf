import * as pdfjsLib from 'pdfjs-dist';

 import { PdfDocumentLoader } from './PdfDocumentLoader';
 import { PdfDocument } from './PdfDocument';
 import { PdfPage } from './PdfPage';
import { FormInputValues } from './FormInputValues';
import { Overlays } from './overlays/Overlays';
import { PageOverlays } from './overlays/PageOverlays';
import { TextOverlay } from './overlays/TextOverlay';
import { ColorUtils } from './ColorUtils';
import { RGB } from './RGB';
import { baselineRatio }  from './BaselineRatio';
import { ImageOverlay, ImageType } from './overlays/ImageOverlay';




pdfjsLib.GlobalWorkerOptions.workerSrc =
  "../node_modules/pdfjs-dist/build/pdf.worker.js";

// // Some PDFs need external cmaps.
// //
const CMAP_URL = "../node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;

const DEFAULT_URL = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";
const DEFAULT_PAGE = 1;
const SCALE = 1.0;
const ENABLE_XFA = true;
const THUMBNAIL_MAX_SIZE = 96;

const container: HTMLDivElement = document.getElementById("pageContainer") as HTMLDivElement;
const pageListContainer: HTMLDivElement = document.getElementById("pages") as HTMLDivElement;

var currentPage = 1;

(document.getElementById("pdf_file") as HTMLElement).onchange = async function() {
  const input = document.getElementById("pdf_file") as HTMLInputElement
  console.log(input.files)
  if (input.files && input.files.length > 0) {
    await readFileAsArrayBuffer(input.files[0])
      .then(function(fileData: ArrayBuffer) {
        loadPdf(fileData)
      });
  }
};

downloadAndLoadPdf(DEFAULT_URL);

function downloadAndLoadPdf(url: string) {
  fetch(url)
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.arrayBuffer();
      })
      .then(arrayBuffer => {
          // The arrayBuffer contains the file data
          console.log("File downloaded successfully:", arrayBuffer);
          loadPdf(arrayBuffer);
      })
      .catch(error => {
          console.error("Error downloading file:", error);
      });
}

async function loadPdf(fileData: ArrayBuffer) {
    currentPage = 1;
    var originalToActualRatio: number = -1;

    (document.getElementById('pages') as HTMLElement ).innerHTML = '';
    (document.getElementById('pageContainer') as HTMLElement ).innerHTML = '';
    (document.getElementById('overlayContainer') as HTMLElement ).innerHTML = '';
    (document.querySelector('#current-page') as HTMLElement).innerHTML = '1';
    (document.querySelector('#total-pages') as HTMLElement).innerHTML = '';
    
    let pdfDocumentLoader: PdfDocumentLoader = new PdfDocumentLoader(fileData, {cMapUrl: CMAP_URL, cMapPacked: CMAP_PACKED, enableXfa: ENABLE_XFA})

    let pdfDocument: PdfDocument = await pdfDocumentLoader.load();

    (document.querySelector('#total-pages') as HTMLElement).innerHTML = pdfDocument.getPageCount().toString();

    const thumbnailShownObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio > 0
            && entry.target.getAttribute("data-pagenumber") != null
            && entry.target.getAttribute("data-rendered") == null 
            && entry.target as HTMLCanvasElement) {  
          const pageNumber = Number.parseInt(entry.target.getAttribute("data-pagenumber") as string);
          console.log("loading page " + pageNumber)
          pdfDocument.loadPage(pageNumber)
          .then(function(page: PdfPage) {
            page.renderThumbnail(entry.target as HTMLCanvasElement, THUMBNAIL_MAX_SIZE);
          })
          .then(function() {
            entry.target.setAttribute("data-rendered", "true");
          })
        }
      });
    });

    createThumbnailPlaceholders(pdfDocument, thumbnailShownObserver);

    gotoPage(pdfDocument, currentPage, false);

    for (var i = 1; i <= pdfDocument.getPageCount(); i++) {
      await pdfDocument.loadPage(i).then(function(pdfPage: PdfPage) {
        pdfPage.render(container, /* scale= */ 1)
        if (originalToActualRatio == -1) {
          const [_, height] = pdfPage.getSize()
          const actualPdfHeight = (container.querySelectorAll('.page')[i-1] as HTMLElement).offsetHeight 
          originalToActualRatio = height / actualPdfHeight
        }
      });
    }

    (document.getElementById("next") as HTMLElement).onclick = function() {
      if (currentPage + 1 <= pdfDocument.getPageCount()) {
        gotoPage(pdfDocument, currentPage+1);
      }
    };

    (document.getElementById("previous") as HTMLElement).onclick = function() {
      if (currentPage - 1 >= 1) {
        gotoPage(pdfDocument, currentPage-1);
      }
    };

    (document.querySelector('#current-page') as HTMLElement).addEventListener('input', function(event) {
      const input = (event.target as HTMLInputElement);
      const inputValue = input.value;
      const page = parseFloat(inputValue)
      if (!isNaN(page) && page > 0 && page <= pdfDocument.getPageCount()) {

      } else {
        input.value = currentPage.toString();
      }
    });

    (document.querySelector('#current-page') as HTMLElement).addEventListener('focusout', function(event) {
      const input = (event.target as HTMLInputElement);
      const inputValue = input.value;
      const page = parseFloat(inputValue)
      if (!isNaN(page) && page > 0 && page <= pdfDocument.getPageCount()) {
        gotoPage(pdfDocument, page);
      }
    });

    (document.getElementById("save") as HTMLElement).onclick = async function() {
      console.log("save clicked")

      const formInputValues: FormInputValues = extractFormInputValues();
      const overlays: Overlays = extractOverlays();

      const bytes = await pdfDocument.savePdf(formInputValues, overlays)

      downloadBlob(bytes, "testfile")
    };

    (document.getElementById("insert-text") as HTMLElement).onclick = async function() {
      (document.getElementById('overlayContainer') as HTMLElement).insertAdjacentHTML('beforeend', `
        <div class="text draggable focused" tabindex="0">
          <input type="text" class="text" value="test123" />
          <div class="text-options focused">
            <div class="img-container drag-handle">
              <img src="../img/icon_drag.png" draggable="false" />
            </div>
            <div class="img-container">
              <img src="../img/icon_font_size.png" />
            </div>
            <input type="number" class="fontSize" min="8" max="96" value="14">
            <div class="img-container">
              <button class="options-delete" style="background: url('../img/icon_delete.png'); width: 20px; height: 20px; padding: 0; margin: 0; border: 0" />
            </div>
          </div>
        </div>
        `);
        const draggables = document.querySelectorAll('.draggable');
        const newDraggable = draggables[draggables.length-1] as HTMLElement;
        setupDraggable(newDraggable);

        (newDraggable.querySelector('input[type=number].fontSize') as HTMLElement).addEventListener('input', function(event: Event) { handleFontSizeInputChange(event, newDraggable) })

    };

    (document.getElementById("insert-image") as HTMLElement).onchange = async function() {

      (document.getElementById('overlayContainer') as HTMLElement).insertAdjacentHTML('beforeend', `
        <div class="image draggable focused" tabindex="0">
          <img class="image-wrapper" />
          <div class="text-options focused">
            <div class="img-container drag-handle">
              <img src="../img/icon_drag.png" draggable="false" />
            </div>
            <input type="number" class="scale" min="1" value="100">
            <div class="img-container">
              <button class="options-delete" style="background: url('../img/icon_delete.png'); width: 20px; height: 20px; padding: 0; margin: 0; border: 0" />
            </div>
          </div>
        </div>
        `);
         const draggables = document.querySelectorAll('.draggable');
         const newDraggable = draggables[draggables.length-1] as HTMLElement;
         setupDraggable(newDraggable);

         var input = document.getElementById("insert-image") as HTMLInputElement
         var img = newDraggable.querySelector(".image-wrapper") as HTMLImageElement
         var file = input.files?.[0];

         if (file) {
           var reader = new FileReader();

          reader.onload = function (e: ProgressEvent<FileReader>) {
            const imageBase64 = e.target?.result as string || null;
            if (imageBase64 != null && validateBase64(imageBase64)) {
              img.src = imageBase64;
            } else {
              console.log(`Invalid image format: ${imageBase64} must be either PNG or JPEG.`)
            }
          };

           reader.readAsDataURL(file);
         } else {
           img.src = ''; // Clear the image if no file is selected
         }

         const image = (newDraggable.querySelector('.image-wrapper') as HTMLImageElement);
         (newDraggable.querySelector('input[type=number].scale') as HTMLElement).addEventListener('input', function(event: Event) { handleScaleInputChange(event, image) })

    };

    (document.getElementById("content") as HTMLElement).addEventListener('scroll', checkElementInView); 

  function extractFormInputValues() {
    const formInputValues: FormInputValues = new FormInputValues();

    // TODO: textarea
    const textInputElements = (document.getElementById("content") as HTMLElement).querySelectorAll(':not(.draggable) > input[type="text"]');
    textInputElements.forEach(function (inputElement) {
      const casted = inputElement as HTMLInputElement;
      console.log(`creating map, name = ${casted.name}, value = ${casted.value}`);
      formInputValues.textNameToValue.set(casted.name, casted.value);
    });

    const checkboxInputElements = (document.getElementById("content") as HTMLElement).querySelectorAll(':not(.draggable) > input[type="checkbox"]');
    checkboxInputElements.forEach(function (inputElement) {
      const casted = inputElement as HTMLInputElement;
      console.log(`creating map, name = ${casted.name}, value = ${casted.value}`);
      formInputValues.checkboxNameToValue.set(casted.name, casted.checked);
    });
    return formInputValues;
  }

  function extractOverlays(): Overlays {
    const overlays: Overlays = new Overlays();
    
    const draggables = document.querySelectorAll('.draggable');

    const pageOverlaysMap: Map<number, PageOverlays> = new Map();
    for (var i = 1; i <= pdfDocument.getPageCount(); i++) {
      const pageOverlays: PageOverlays = new PageOverlays();
      pageOverlaysMap.set(i, pageOverlays);
    }

    draggables.forEach(function(draggable: Element) {
      if (draggable.classList.contains('text')) {
        addTextOverlay(draggable, pageOverlaysMap);
      } else if (draggable.classList.contains('image')) {
        addImageOverlay(draggable, pageOverlaysMap);
      }
      
    });
    
    for (var i = 1; i <= pdfDocument.getPageCount(); i++) {     
      overlays.pagesOverlays.set(i, pageOverlaysMap.get(i) as PageOverlays);
    }

    return overlays;
  }

  function addImageOverlay(draggable: Element, pageOverlaysMap: Map<number, PageOverlays>) {
    const image = draggable.querySelector('.image-wrapper') as HTMLImageElement
    if (image) {
      const pages = document.querySelectorAll('#content .page');
      for (var i = 1; i <= pdfDocument.getPageCount(); i++) {
        const page = pages[i - 1] as HTMLElement;
        const imageType = extractImageTypeFromBase64(image.src)
        if (imageType == null) {
          console.log(`Could not extract image type for base64 image ${image.src} - not PNG nor JPEG.`)
          continue;
        }
        const scale = parseFloat((draggable.querySelector('input[type=number].scale') as HTMLInputElement).value) / 100;
        const width = image.naturalWidth * scale * originalToActualRatio
        const height = image.naturalHeight * scale * originalToActualRatio
        const imageOverlay = new ImageOverlay(image.src, width, height, imageType);
        imageOverlay.transform.rotation = 0;
        const contentInner = document.getElementById('content-inner') as HTMLElement;
        const [offsetLeft, offsetTop] = offsetRelativeToAncestor(image, contentInner);
        imageOverlay.transform.x = offsetLeft * originalToActualRatio;
        imageOverlay.transform.y = (page.offsetHeight - offsetTop + page.offsetTop) * originalToActualRatio - height;
        (pageOverlaysMap.get(i) as PageOverlays).imageOverlays.push(imageOverlay);
      }
    }
  }

  function extractImageTypeFromBase64(base64: string): ImageType|null {
    if (base64.startsWith('data:image/png;')) {
      return ImageType.PNG;
    } else if (base64.startsWith('data:image/jpeg;')) {
      return ImageType.JPEG;
    }
    return null
  }

  function validateBase64(base64: string): boolean {
    return extractImageTypeFromBase64(base64) != null
  }

  function addTextOverlay(draggable: Element, pageOverlaysMap: Map<number, PageOverlays>) {
    const textInput = draggable.querySelector('input[type="text"]');
    const contentInner = document.getElementById('content-inner') as HTMLElement;
    const pages = document.querySelectorAll('#content .page');
    if (textInput) {
      const textInputCasted = textInput as HTMLInputElement;
      for (var i = 1; i <= pdfDocument.getPageCount(); i++) {
        const textOverlay: TextOverlay = new TextOverlay();
        textOverlay.text = textInputCasted.value;
        const page = pages[i - 1] as HTMLElement;
        const computedStyle = window.getComputedStyle(textInputCasted, null);
        const fontSizeStr: string = computedStyle.fontSize;
        const fontSizePx = Number.parseInt(fontSizeStr);
  
        textOverlay.textColor = ColorUtils.normalize(ColorUtils.parseRgb(computedStyle.color) || ColorUtils.BLACK);
        textOverlay.textSize = fontSizePx * originalToActualRatio;
        textOverlay.fontFamily = computedStyle.fontFamily;
        const [offsetLeft, offsetTop] = offsetRelativeToAncestor(textInputCasted, contentInner);
        textOverlay.transform.x = (2 + offsetLeft + (2 + offsetLeft) / page.offsetWidth) * originalToActualRatio; // + content.scrollLeft;
        if (i == 1) {
          console.log(`dumping prints: (${page.offsetHeight} - (${offsetTop} + ${textInputCasted.offsetHeight} - ${page.offsetTop})) * ${originalToActualRatio}`);
        }
        console.log("baselineRatio = " + baselineRatio(computedStyle.fontFamily, fontSizePx) + " " + baselineRatio(computedStyle.fontFamily, fontSizePx) * textInputCasted.offsetHeight + " " + baselineRatio(computedStyle.fontFamily, fontSizePx) * textInputCasted.offsetHeight / originalToActualRatio);
  
        const p1 = 0.5 * baselineRatio(computedStyle.fontFamily, fontSizePx) * textInputCasted.offsetHeight * (originalToActualRatio + 1) / originalToActualRatio;
        const p2 = p1 + page.offsetHeight - (offsetTop + textInputCasted.offsetHeight - page.offsetTop);
        textOverlay.transform.y = (p2 + p2 / page.offsetHeight) * originalToActualRatio;
        (pageOverlaysMap.get(i) as PageOverlays).textOverlays.push(textOverlay);
      }
    }
  }
  
  function offsetRelativeToAncestor(child: HTMLElement, ancestor: HTMLElement): [number, number] {
    var x: number = 0;
    var y: number = 0;
  
    var currentElement: HTMLElement | null = child;
    while (currentElement != ancestor && currentElement != null) {
      x += currentElement.offsetLeft;
      y += currentElement.offsetTop;
      currentElement = currentElement.parentElement;
    }
  
    return [x, y]
  
  }


    function setupDraggable(draggableElement: HTMLElement) {
      let offsetX: number, offsetY: number;

      draggableElement.focus();

      (draggableElement.querySelector('.options-delete') as HTMLElement).onclick = function() {
        draggableElement.remove();
      }

      const mouseDownListener = function (event: MouseEvent) {
        console.log("mouse down!")
        offsetX = event.clientX - draggableElement.offsetLeft;
        offsetY = event.clientY - draggableElement.offsetTop;
        draggableElement.style.opacity = '0.7';

        window.addEventListener('mousemove', mouseMoveListener);
        window.addEventListener('mouseup', mouseUpListener);
      };
      const mouseMoveListener = function (event: MouseEvent) {
        console.log(`mouseMoveListener event x=${event.clientX}, y=${event.clientY}`);
        const x = event.clientX - offsetX;
        const y = event.clientY - offsetY;

        draggableElement.style.left = `${x}px`;
        draggableElement.style.top = `${y}px`;
      };
      const mouseUpListener = function (event: MouseEvent) {
        window.removeEventListener('mousemove', mouseMoveListener);
        window.removeEventListener('mouseup', mouseUpListener);
        draggableElement.style.opacity = '1';
      };

      const a = draggableElement.querySelector(".drag-handle") as HTMLElement;
      a.addEventListener('mousedown', mouseDownListener);
      draggableElement.addEventListener('focusin', function (event: FocusEvent) {
        const targetElement: Element = event.target as Element;
        const parent = targetElement.closest('.draggable')
        if (parent != draggableElement || draggableElement.classList.contains('focused')) {
          return
        }
        draggableElement.classList.remove('unfocused')
        draggableElement.classList.add('focused')
      });

      draggableElement.addEventListener('focusout', function (event: FocusEvent) {
        if (draggableElement.classList.contains('unfocused')) {
          return;
        }
        const newlyFocusedElement: Element = event.relatedTarget as Element;
        if (newlyFocusedElement != null) {
          const parent = newlyFocusedElement.closest('.draggable')
          if (parent == draggableElement) {
            return
          }
        }

        draggableElement.classList.remove('focused')
        draggableElement.classList.add('unfocused')
      });
    }

    function checkElementInView() {
      console.log("checking scroll...")
      // Iterate through each element and check its position
      const elements = document.querySelectorAll(".page");
      var currentScrollPage = currentPage;
      const content = (document.getElementById("content") as HTMLElement);
      
      var minDist = Number.MAX_VALUE;
      elements?.forEach((element, index) => {
        const casted = element as HTMLElement;
        const rect = element.getBoundingClientRect();
        const dist = Math.abs(-content.scrollTop + casted.offsetTop + casted.offsetHeight / 2 - content.offsetHeight / 2);

        if (index == 1) {
          console.log(`scrollTop = ${content.scrollTop}, offsetTop = ${casted.offsetTop}, offsetHeight=${casted.offsetHeight}, contentHeight=${content.offsetHeight}`)
          console.log("dist = " + dist + " current min dist = " + minDist)
        }
        if (minDist > dist) {
          minDist = dist;
          console.log(`Element ${element.id} is in view.`);
          currentScrollPage = index + 1;
        }
      });
      
      console.log("current closest page is " + currentScrollPage)
      if (currentPage != currentScrollPage) {
        gotoPage(pdfDocument, currentScrollPage, false);
      }
    }
}

function downloadBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to read a file as ArrayBuffer
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
          if (event.target?.result instanceof ArrayBuffer) {
              resolve(event.target.result);
          } else {
              reject(new Error('Error reading file'));
          }
      };

      reader.onerror = () => {
          reject(new Error('Error reading file'));
      };

      reader.readAsArrayBuffer(file);
  });
}

function createThumbnailPlaceholders(pdfDocument: PdfDocument, thumbnailShownObserver: IntersectionObserver) {
  for (let i = 1; i <= pdfDocument.getPageCount(); i++) {
    const div = document.createElement('div');
    div.classList.add('page-list-container');

    div.onclick = () => gotoPage(pdfDocument, i);

    const label = document.createElement('div');
    label.classList.add('page-list-label');
    label.innerHTML = `${i}`;

    const canvas = document.createElement('canvas');
    canvas.classList.add('page-list-canvas');
    canvas.setAttribute('data-pagenumber', `${i}`);

    div.append(canvas);
    div.append(label);

    pageListContainer.appendChild(div);
    thumbnailShownObserver.observe(canvas);
  }
}

function gotoPage(pdfDocument: PdfDocument, pageNumber: number, scrollToPage: boolean = true) {
  const previousPageElement = document.querySelector(`.page-list-container:nth-child(${currentPage})`) as HTMLElement | null;
  if (previousPageElement) {
    previousPageElement.classList.remove("page-list-container-selected");
  }
  
  currentPage = pageNumber;
  (document.querySelector('#current-page') as HTMLInputElement).value = currentPage.toString();

  const nthElement = document.querySelector(`.page-list-container:nth-child(${currentPage})`) as HTMLElement | null;
  if (nthElement) {
    nthElement.classList.add("page-list-container-selected");
  }

  nthElement?.scrollIntoView({
    block: 'nearest', 
  })

  if (scrollToPage) {
    const pageElement = document.querySelector(`.page:nth-child(${currentPage})`) as HTMLElement | null;
    if (pageElement != null) {
      pageElement.scrollIntoView({
        block: 'start',     // Scroll to the start of the target element
      });
    } else {
      console.log("page element null")
    }
  }
}
function handleFontSizeInputChange(event: Event, newDraggable: HTMLElement) {
  // Access the current value of the input field
  const inputValue = (event.target as HTMLInputElement).value;

  // Convert the input value to a number
  const numericValue = parseFloat(inputValue);

  // Check if the conversion is successful and not NaN
  if (!isNaN(numericValue)) {
    (newDraggable.querySelector('input[type=text].text') as HTMLElement).style.fontSize = `${numericValue}px`;
  } else {
    console.log('Invalid Input');
  }
}

function handleScaleInputChange(event: Event, image: HTMLImageElement) {
  // Access the current value of the input field
  const inputValue = (event.target as HTMLInputElement).value;

  // Convert the input value to a number
  const numericValue = parseFloat(inputValue);

  // Check if the conversion is successful and not NaN
  if (!isNaN(numericValue)) {
    image.width = image.naturalWidth * numericValue / 100;
    image.height = image.naturalHeight * numericValue / 100;
  } else {
    console.log('Invalid Input');
  }
}


