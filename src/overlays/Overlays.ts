import { PageOverlays } from "./PageOverlays";

/** Container of `PageOverlays` mapped to their page numbers. */
export class Overlays {
  public readonly pagesOverlays: Map<number, PageOverlays> = new Map();
}
