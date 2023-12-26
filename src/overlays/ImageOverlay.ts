import { OverlayBase } from "./OverlayBase";

/**
 * Enumerates the supported image types.
 */
export enum ImageType {
  PNG,
  JPEG,
}

/**
 * An overlay which describes an image, such as its base64 string representation, the image type, size, etc.
 *
 * @extends OverlayBase
 */
export class ImageOverlay extends OverlayBase {
  base64: string;
  imageType: ImageType;
  width: number;
  height: number;

  constructor(
    base64: string,
    width: number,
    height: number,
    imageType: ImageType
  ) {
    super();
    this.base64 = base64;
    this.width = width;
    this.height = height;
    this.imageType = imageType;
  }
}
