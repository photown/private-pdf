import * as pdfjsLib from 'pdfjs-dist';
import { degrees, PDFDocument, rgb, StandardFonts, PDFField, PDFFont, PDFImage } from 'pdf-lib';

import { PdfDocument } from './PdfDocument';
import { FormInputValues } from './FormInputValues';
import { Overlays } from './overlays/Overlays';
import { ImageType } from './overlays/ImageOverlay';

export class PdfDocumentSaver {
  constructor() {}

  public async applyChangesAndSave(originalPdfBytes: Uint8Array, formInputValues: FormInputValues, overlays: Overlays): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalPdfBytes)

    const form = pdfDoc.getForm();

    for (const [key, value] of formInputValues.textNameToValue) {
        form.getTextField(key).setText(value);
    }

    for (const [key, value] of formInputValues.checkboxNameToValue) {
        if (value) {
            form.getCheckBox(key).check();
        } else {
            form.getCheckBox(key).uncheck();
        }
    }

    // TODO: text areas, dropdowns, buttons, option list, radiobuttons, signature
    // TODO: validation

    // Fonts
    const fontValues: string[] = Object.values(StandardFonts);
    const neededFonts: Map<string, PDFFont> = new Map()
    for (const pageOverlays of overlays.pagesOverlays.values()) {
        for (const textOverlay of pageOverlays.textOverlays) {
            if (fontValues.indexOf(textOverlay.fontFamily) != -1 
                    && !neededFonts.has(textOverlay.fontFamily)) {
                const pdfFont = await pdfDoc.embedFont(textOverlay.fontFamily);
                neededFonts.set(textOverlay.fontFamily, pdfFont);
            }
        }
    }

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages()

    for (const [pageNumber, pageOverlays] of overlays.pagesOverlays) {
        const page = pdfDoc.getPage(pageNumber-1); // in pdflib pages are 0-based
        
        for (const textOverlay of pageOverlays.textOverlays) {
            console.log(`antoan saving page ${pageNumber}, y is ${textOverlay.transform.y}`)
            page.drawText(textOverlay.text, {
                x: textOverlay.transform.x,
                y: textOverlay.transform.y,
                size: textOverlay.textSize,
                font: neededFonts.get(textOverlay.fontFamily) || helveticaFont,
                color: rgb(
                    textOverlay.textColor.red, 
                    textOverlay.textColor.green,
                    textOverlay.textColor.blue),
            })
        }

        for (const imageOverlay of pageOverlays.imageOverlays) {
            const pdfImage = 
                imageOverlay.imageType == ImageType.PNG ? await pdfDoc.embedPng(imageOverlay.base64)
                : imageOverlay.imageType == ImageType.JPEG ? await pdfDoc.embedJpg(imageOverlay.base64) 
                : null;
            if (pdfImage == null) {
                console.log(`Error reading pdfPage - invalid image format. ${imageOverlay}`)
                continue;
            }
            page.drawImage(pdfImage, {
                x: imageOverlay.transform.x,
                y: imageOverlay.transform.y,
                width: imageOverlay.width,
                height: imageOverlay.height,
                rotate: degrees(imageOverlay.transform.rotation),
                opacity: 1,
              })
        }
    }

    const firstPage = pages[0]
    // Get the width and height of the first page
    const { width, height } = firstPage.getSize()

console.log("first page height = " + height)

    // Draw a string of text diagonally across the first page
    console.log("writing text...")
    firstPage.drawText('y=0', {
    x: 40,
    y: 0,
    size: 14,
    font: helveticaFont,
    color: rgb(1, 0, 0),
    //rotate: degrees(-45),
    })

    firstPage.drawText(`y=${height}`, {
    x: 40,
    y: height,
    size: 14,
    font: helveticaFont,
    color: rgb(1, 0, 0),
    //rotate: degrees(-45),
    })

    // firstPage.drawRectangle({
    //     x: 40,
    //     y: 40,
    //     width: 100,
    //     height: 100,
    //     borderColor: rgb(1, 0, 0),
    //     borderWidth: 1.5,
    //   })

    return pdfDoc.save()
  }
}