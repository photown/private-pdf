import * as pdfjsLib from 'pdfjs-dist';
import { degrees, PDFDocument, rgb, StandardFonts, PDFField } from 'pdf-lib';

import { PdfDocument } from './PdfDocument';
import { KeyValuePairs } from './CommonTypes';

export class PdfDocumentSaver {
  constructor() {}

  public async applyChangesAndSave(originalPdfBytes: Uint8Array, inputNameToValueMap: KeyValuePairs): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalPdfBytes)

    const form = pdfDoc.getForm();
    // form.getFields().forEach(function(f: PDFField) {
    //     console.log("field name = " + f.getName());
        
    // })

    for (const key in inputNameToValueMap) {
        if (inputNameToValueMap.hasOwnProperty(key)) {
            const value = inputNameToValueMap[key];
            console.log(`populating, Key: ${key}, Value: ${value}`);
            const f = form.getFieldMaybe(key);
            if (f) {
                form.getTextField(key).setText(value);
            }
        }
    }
    
    // Embed the Helvetica font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const pages = pdfDoc.getPages()
    console.log(`pages = ${pages}`)
    const firstPage = pages[0]
    // Get the width and height of the first page
    const { width, height } = firstPage.getSize()

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