import { RGB } from "./RGB";

export class ColorUtils {
    static BLACK: RGB = {
        red: 0,
        blue: 0,
        green: 0
    }
    
    /** Decomposes strings like "rgb(2, 255, 0)" into its components. */
    public static parseRgb(rgbString: string): RGB | null {
        const match = rgbString.match(/(\d+), (\d+), (\d+)/);
    
        if (match) {
            const [, red, green, blue] = match;
            return {
                red: parseInt(red, 10),
                green: parseInt(green, 10),
                blue: parseInt(blue, 10),
            };
        }
    
        // Return a default or handle the case when parsing fails
        return null;
    }
    
    /** Converts the components of this color to be in the range [0, 1]. */
    public static normalize(rgb: RGB): RGB {
        return {
            red: rgb.red / 255,
            blue: rgb.blue / 255,
            green: rgb.green / 255
        }
    }
}