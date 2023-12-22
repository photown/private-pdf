import {
  PDFDocument,
  PDFFont,
  PDFForm,
  PDFImage,
  PDFPage,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";

import { FormInputValues } from "./FormInputValues";
import { ImageType } from "./overlays/ImageOverlay";
import { Overlays } from "./overlays/Overlays";
import { PageOverlays } from "./overlays/PageOverlays";

export class PdfDocumentSaver {
  constructor() {}

  public async applyChangesAndSave(
    originalPdfBytes: Uint8Array,
    formInputValues: FormInputValues,
    overlays: Overlays
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    this.populateFormValues(formInputValues, pdfDoc.getForm());

    // TODO: validation
    // TODO: rotation
    // TODO: refactor

    const neededFonts: Map<string, PDFFont> = await this.getNeededFonts(
      overlays,
      pdfDoc
    );
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const base64ToPdfImageMap = await this.embedImages(overlays, pdfDoc);

    for (const [pageNumber, pageOverlays] of overlays.pagesOverlays) {
      const page = pdfDoc.getPage(pageNumber - 1); // in pdflib pages are 0-based

      this.doTextDrawing(pageOverlays, page, neededFonts, helveticaFont);
      this.doImageDrawing(pageOverlays, pdfDoc, page, base64ToPdfImageMap);
    }

    return pdfDoc.save();
  }

  private async embedImages(
    overlays: Overlays,
    pdfDoc: PDFDocument
  ): Promise<Map<string, PDFImage>> {
    const base64ToPdfImageMap: Map<string, PDFImage> = new Map();
    for (const [pageNumber, pageOverlays] of overlays.pagesOverlays) {
      for (const imageOverlay of pageOverlays.imageOverlays) {
        if (base64ToPdfImageMap.has(imageOverlay.base64)) {
          continue;
        }
        const pdfImage =
          imageOverlay.imageType == ImageType.PNG
            ? await pdfDoc.embedPng(imageOverlay.base64)
            : imageOverlay.imageType == ImageType.JPEG
            ? await pdfDoc.embedJpg(imageOverlay.base64)
            : null;
        if (pdfImage == null) {
          console.log(
            `Error embedding images in PDF - invalid image format. ${imageOverlay}`
          );
          continue;
        }
        base64ToPdfImageMap.set(imageOverlay.base64, pdfImage);
      }
    }
    return base64ToPdfImageMap;
  }

  private async doImageDrawing(
    pageOverlays: PageOverlays,
    pdfDoc: PDFDocument,
    page: PDFPage,
    base64ToPdfImageMap: Map<string, PDFImage>
  ) {
    for (const imageOverlay of pageOverlays.imageOverlays) {
      const pdfImage = base64ToPdfImageMap.get(imageOverlay.base64);
      if (pdfImage == null) {
        console.log(
          `Error reading pdfPage - missing mapping for base64. ${imageOverlay}`
        );
        continue;
      }
      page.drawImage(pdfImage, {
        x: imageOverlay.transform.x,
        y: imageOverlay.transform.y,
        width: imageOverlay.width,
        height: imageOverlay.height,
        rotate: degrees(imageOverlay.transform.rotation),
        opacity: 1,
      });
    }
  }

  private doTextDrawing(
    pageOverlays: PageOverlays,
    page: PDFPage,
    neededFonts: Map<string, PDFFont>,
    helveticaFont: PDFFont
  ) {
    for (const textOverlay of pageOverlays.textOverlays) {
      page.drawText(textOverlay.text, {
        x: textOverlay.transform.x,
        y: textOverlay.transform.y,
        size: textOverlay.textSize,
        font: neededFonts.get(textOverlay.fontFamily) || helveticaFont,
        color: rgb(
          textOverlay.textColor.red,
          textOverlay.textColor.green,
          textOverlay.textColor.blue
        ),
      });
    }
  }

  private populateFormValues(formInputValues: FormInputValues, form: PDFForm) {
    for (const [key, value] of formInputValues.textNameToValue) {
      try {
        form.getTextField(key).setText(value);
      } catch (error) {
        console.log(
          `Error thrown while updating the text field value of ${key} with ${value}.`,
          error
        );
      }
    }

    for (const [key, value] of formInputValues.checkboxNameToValue) {
      try {
        if (value) {
          form.getCheckBox(key).check();
        } else {
          form.getCheckBox(key).uncheck();
        }
      } catch (error) {
        console.log(
          `Error thrown while updating the checkbox value of ${key} with ${value}.`,
          error
        );
      }
    }

    for (const [key, value] of formInputValues.dropdownNameToSelectedIndex) {
      try {
        const dropdown = form.getDropdown(key);
        const options = dropdown.getOptions();
        if (value < 0 || value >= options.length) {
          continue;
        }
        dropdown.select(options[value]);
      } catch (error) {
        console.log(
          `Error thrown while updating the dropdown value of ${key} with ${value}.`,
          error
        );
      }
    }

    for (const [key, value] of formInputValues.optionNameToSelectedIndex) {
      try {
        const optionsList = form.getOptionList(key);
        const options = optionsList.getOptions();
        if (value < 0 || value >= options.length) {
          continue;
        }
        optionsList.select(options[value]);
      } catch (error) {
        console.log(
          `Error thrown while updating the options list value of ${key} with ${value}.`,
          error
        );
      }
    }

    for (const [key, value] of formInputValues.radioGroupNameToSelectedIndex) {
      try {
        const radioGroup = form.getRadioGroup(key);
        const options = radioGroup.getOptions();
        if (value < 0 || value >= options.length) {
          continue;
        }
        radioGroup.select(options[value]);
      } catch (error) {
        console.log(
          `Error thrown while updating the radio group value of ${key} with ${value}.`,
          error
        );
      }
    }
  }

  private async getNeededFonts(overlays: Overlays, pdfDoc: PDFDocument) {
    const fontValues: string[] = Object.values(StandardFonts);
    const neededFonts: Map<string, PDFFont> = new Map();
    for (const pageOverlays of overlays.pagesOverlays.values()) {
      for (const textOverlay of pageOverlays.textOverlays) {
        if (
          fontValues.indexOf(textOverlay.fontFamily) != -1 &&
          !neededFonts.has(textOverlay.fontFamily)
        ) {
          const pdfFont = await pdfDoc.embedFont(textOverlay.fontFamily);
          neededFonts.set(textOverlay.fontFamily, pdfFont);
        }
      }
    }
    return neededFonts;
  }
}
