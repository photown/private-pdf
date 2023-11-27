import * as pdfjsLib from 'pdfjs-dist';

 import { PdfDocumentLoader } from './PdfDocumentLoader';
 import { PdfDocument } from './PdfDocument';
 import { PdfPage } from './PdfPage';
 import { KeyValuePairs } from './CommonTypes';


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
var inputNameToValueMap: KeyValuePairs = {};

(document.getElementById("select") as HTMLElement).onclick = async function() {
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
    inputNameToValueMap = {};

    (document.getElementById('pages') as HTMLElement ).innerHTML = '';
    (document.getElementById('pageContainer') as HTMLElement ).innerHTML = '';

    
    let pdfDocumentLoader: PdfDocumentLoader = new PdfDocumentLoader(fileData, {cMapUrl: CMAP_URL, cMapPacked: CMAP_PACKED, enableXfa: ENABLE_XFA})

    let pdfDocument: PdfDocument = await pdfDocumentLoader.load();

   // let pdfPage: PdfPage = await pdfDocument.loadPage(1)

    //pdfPage.render(container, /* scale= */ 1);

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

    (document.getElementById("save") as HTMLElement).onclick = async function() {
      console.log("save clicked")

      // Select all input elements within the parent
      const inputElements = (document.getElementById("content") as HTMLElement).querySelectorAll('input[type="text"], textarea');

      // Iterate over the input elements using forEach
      inputElements.forEach(function (inputElement) {
        const casted = inputElement as HTMLInputElement;
        console.log(`creating map, name = ${casted.name}, value = ${casted.value}`)
        inputNameToValueMap[casted.name] = casted.value;
      });

      const bytes = await pdfDocument.savePdf(inputNameToValueMap)

      downloadBlob(bytes, "testfile")
    };


    (document.getElementById("content") as HTMLElement).addEventListener('scroll', checkElementInView);

    const draggableElement = document.querySelectorAll('.draggable')[0] as HTMLElement;

    let offsetX: number, offsetY: number;

    const mouseDownListener = function(event: MouseEvent) {
      offsetX = event.clientX - draggableElement.offsetLeft;
      offsetY = event.clientY - draggableElement.offsetTop;
      draggableElement.style.opacity = '0.7';

      window.addEventListener('mousemove', mouseMoveListener);
      window.addEventListener('mouseup', mouseUpListener);
    }
    const mouseMoveListener = function(event: MouseEvent) {
      console.log(`mouseMoveListener event x=${event.clientX}, y=${event.clientY}`)
      const x = event.clientX - offsetX;
      const y = event.clientY - offsetY;

      draggableElement.style.left = `${x}px`;
      draggableElement.style.top = `${y}px`;
    }
    const mouseUpListener = function(event: MouseEvent) {
      window.removeEventListener('mousemove', mouseMoveListener);
      window.removeEventListener('mouseup', mouseUpListener);
      draggableElement.style.opacity = '1';
    }

    console.log("antoan draggableElement = " + draggableElement.innerHTML)
    const a = draggableElement.querySelector(".drag-handle") as HTMLElement;
    a.addEventListener('mousedown', mouseDownListener);
    draggableElement.addEventListener('focusin', function(event: FocusEvent) {
      console.log("focus in")
    })

    draggableElement.addEventListener('focusout', function(event: FocusEvent) {
      console.log("focus out")
    })

 

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

  const nthElement = document.querySelector(`.page-list-container:nth-child(${currentPage})`) as HTMLElement | null;
  if (nthElement) {
    nthElement.classList.add("page-list-container-selected");
  }

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