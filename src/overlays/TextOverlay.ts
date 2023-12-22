import { ColorUtils } from "../ColorUtils";
import { RGB } from "../RGB";
import { OverlayBase } from "./OverlayBase";

export class TextOverlay extends OverlayBase {
  public text: string = "";

  /** Text size, in pixels. */
  public textSize: number = 13;

  /** Color whose components range between [0, 1]. */
  public textColor: RGB = ColorUtils.BLACK;

  /** Font family. */
  public fontFamily: string = "Helvetica";
}
