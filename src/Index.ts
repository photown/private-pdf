import * as pdfjsLib from "pdfjs-dist";
import { Controller } from "./Controller";

pdfjsLib.GlobalWorkerOptions.workerSrc = "dist/pdf.worker.js";

var controller: Controller | null;

window.onload = () => {
  controller = new Controller();
  controller.init();
};
