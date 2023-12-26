import { TextOverlay } from "./TextOverlay";
import { ImageOverlay } from "./ImageOverlay";

/** Container for the different kinds of supported overlays, such as text or images. */
export class PageOverlays {
  public readonly textOverlays: TextOverlay[] = [];
  public readonly imageOverlays: ImageOverlay[] = [];
}
