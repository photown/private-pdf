import { OverlayBase } from "./OverlayBase";

export enum ImageType {
  PNG,
  JPEG,
}

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
