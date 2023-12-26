import { Transform } from "./Transform";

/** Base class that describes an overlay - an object that is added on top of a PDF page, such as image, or text. */
export class OverlayBase {
  public readonly transform: Transform = new Transform();
}
