/** Wrapper for data needed to create a `TextOverlay`. */
export class TextDraggableMetadata {
  public textInput: HTMLInputElement;
  public text: string;
  public fontFamily: string;
  public fontSize: number;
  public color: string;
  public textInputOffsetHeight: number;
  public offsetToAncestor: [number, number];
  public draggableTopLeft: [number, number];
  public draggableBottomRight: [number, number];

  constructor(
    textInput: HTMLInputElement,
    text: string,
    fontFamily: string,
    fontSize: number,
    color: string,
    textInputOffsetHeight: number,
    offsetToAncestor: [number, number],
    draggableTopLeft: [number, number],
    draggableBottomRight: [number, number]
  ) {
    this.textInput = textInput;
    this.text = text;
    this.fontFamily = fontFamily;
    this.fontSize = fontSize;
    this.color = color;
    this.textInputOffsetHeight = textInputOffsetHeight;
    this.offsetToAncestor = offsetToAncestor;
    this.draggableTopLeft = draggableTopLeft;
    this.draggableBottomRight = draggableBottomRight;
  }
}
