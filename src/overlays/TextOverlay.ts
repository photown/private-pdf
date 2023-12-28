import { ColorUtils } from "../utils/ColorUtils";
import { RGB } from "../utils/RGB";
import { OverlayBase } from "./OverlayBase";

/**
 * An overlay which describes a text label, such as its text, font size, color, etc.
 *
 * @extends OverlayBase
 */
export class TextOverlay extends OverlayBase {
  public text: string = "";

  /** Text size, in pixels. */
  public textSize: number = 13;

  /** Color whose components range between [0, 1]. */
  public textColor: RGB = ColorUtils.BLACK;

  /** Font family. */
  public fontFamily: string = "Helvetica";
}
