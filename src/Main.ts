import * as pdfjsLib from 'pdfjs-dist';

 import { PdfDocumentLoader } from './PdfDocumentLoader';
 import { PdfDocument } from './PdfDocument';
 import { PdfPage } from './PdfPage';


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

const container: HTMLDivElement = document.getElementById("pageContainer") as HTMLDivElement;

console.log("so far so good")

 let pdfDocumentLoader: PdfDocumentLoader = new PdfDocumentLoader(DEFAULT_URL, {cMapUrl: CMAP_URL, cMapPacked: CMAP_PACKED, enableXfa: ENABLE_XFA})

 let pdfDocument: PdfDocument = await pdfDocumentLoader.load();

 let pdfPage: PdfPage = await pdfDocument.loadPage(1)

pdfPage.render(container, SCALE);