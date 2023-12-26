import { FormInputValues } from "./FormInputValues";
import { ImageDraggableMetadata } from "./draggables/ImageDraggableMetadata";
import { PdfPage } from "./PdfPage";
import { TextDraggableMetadata } from "./draggables/TextDraggableMetadata";

/** View which is responsible for displaying the data from the controller. */
export class View {
  public readonly container: HTMLDivElement = document.getElementById(
    "pageContainer"
  ) as HTMLDivElement;
  public readonly pageListContainer: HTMLDivElement = document.getElementById(
    "pages"
  ) as HTMLDivElement;
  public readonly content = document.getElementById("content") as HTMLElement;

  public readonly contentInner = document.getElementById(
    "content-inner"
  ) as HTMLElement;

  public resetState() {
    (document.getElementById("pages") as HTMLElement).innerHTML = "";
    (document.getElementById("pageContainer") as HTMLElement).innerHTML = "";
    (document.getElementById("overlayContainer") as HTMLElement).innerHTML = "";
    (document.querySelector("#current-page") as HTMLElement).innerHTML = "1";
    (document.querySelector("#total-pages") as HTMLElement).innerHTML = "";
    (document.getElementById("empty-state") as HTMLElement).style.display =
      "none";
    this.disableNavButtons();
  }

  public enableNavButtons() {
    (document.getElementById("pdf-file") as HTMLElement).removeAttribute(
      "disabled"
    );
    (document.getElementById("save") as HTMLElement).removeAttribute(
      "disabled"
    );
    (document.getElementById("insert-text") as HTMLElement).removeAttribute(
      "disabled"
    );
    (document.getElementById("insert-image") as HTMLElement).removeAttribute(
      "disabled"
    );
    (document.getElementById("previous") as HTMLElement).removeAttribute(
      "disabled"
    );
    (document.getElementById("current-page") as HTMLElement).removeAttribute(
      "disabled"
    );
    (document.getElementById("next") as HTMLElement).removeAttribute(
      "disabled"
    );
    (document.getElementById("rotate") as HTMLElement).removeAttribute(
      "disabled"
    );
  }

  public disableNavButtons() {
    (document.getElementById("pdf-file") as HTMLElement).setAttribute(
      "disabled",
      "true"
    );
    (document.getElementById("save") as HTMLElement).setAttribute(
      "disabled",
      "true"
    );
    (document.getElementById("insert-text") as HTMLElement).setAttribute(
      "disabled",
      "true"
    );
    (document.getElementById("insert-image") as HTMLElement).setAttribute(
      "disabled",
      "true"
    );
    (document.getElementById("previous") as HTMLElement).setAttribute(
      "disabled",
      "true"
    );
    (document.getElementById("current-page") as HTMLElement).setAttribute(
      "disabled",
      "true"
    );
    (document.getElementById("next") as HTMLElement).setAttribute(
      "disabled",
      "true"
    );
    (document.getElementById("rotate") as HTMLElement).setAttribute(
      "disabled",
      "true"
    );
  }

  public setOnNextClickedListener(onClickListener: () => void) {
    (document.getElementById("next") as HTMLElement).onclick = onClickListener;
  }

  public setOnPreviousClickedListener(onClickListener: () => void) {
    (document.getElementById("previous") as HTMLElement).onclick =
      onClickListener;
  }

  /** Updates the page number wherever relevant (such as the thumbnails) as the user scrolls. */
  public setOnContentScrollEventListener(
    scrollEvent: (currentPage: number) => void
  ) {
    const that = this;
    (document.getElementById("content") as HTMLElement).addEventListener(
      "scroll",
      function () {
        // Iterate through each element and check its position
        const elements = document.querySelectorAll(".page");
        var currentScrollPage = -1;
        const content = that.content;

        var minDist = Number.MAX_VALUE;
        elements?.forEach((element, index) => {
          const casted = element as HTMLElement;
          const dist = Math.abs(
            -content.scrollTop +
              casted.offsetTop +
              casted.offsetHeight / 2 -
              content.offsetHeight / 2
          );

          if (minDist > dist) {
            minDist = dist;
            currentScrollPage = index + 1;
          }
        });

        if (currentScrollPage != -1) {
          scrollEvent(currentScrollPage);
        }
      }
    );
  }

  public setOnRotateClickListener(onRotateClickListener: () => Promise<void>) {
    (document.getElementById("rotate") as HTMLElement).onclick =
      onRotateClickListener;
  }

  public setOnCurrentPageFocusOutListener(
    onFocusOutListener: (event: FocusEvent) => void
  ) {
    (document.getElementById("current-page") as HTMLElement).addEventListener(
      "focusout",
      onFocusOutListener
    );
  }

  public setOnCurrentPageInputListener(
    onCurrentPageInputListener: (event: Event) => void
  ) {
    (document.getElementById("current-page") as HTMLElement).addEventListener(
      "input",
      onCurrentPageInputListener
    );
  }

  public setOnSaveClickedListener(onSaveClickedListener: () => Promise<void>) {
    (document.getElementById("save") as HTMLElement).onclick =
      onSaveClickedListener;
  }

  public setOnInsertTextClickListener() {
    const that = this;
    (document.getElementById("insert-text") as HTMLElement).onclick =
      async function () {
        (
          document.getElementById("overlayContainer") as HTMLElement
        ).insertAdjacentHTML(
          "beforeend",
          `
          <div class="text draggable focused" tabindex="0">
            <input type="text" class="text" value="" size="20" />
            <div class="text-options focused">
              <div class="img-container drag-handle">
                <img src="img/icon_drag.png" draggable="false" />
              </div>
              <div class="separator"></div>
              <div class="img-container">
                <img src="img/icon_font_size.png" />
              </div>
              <input type="number" class="fontSize" min="8" max="96" value="14">
              <div class="separator"></div>
              <div class="img-container">
                <img src="img/icon_text_color.png" />
              </div>
              <input type="color" class="fontColor">
              <div class="separator"></div>
              <div class="img-container">
                <button class="options-delete" style="background: url('img/icon_delete.png'); width: 20px; height: 20px; padding: 0; margin: 0; border: 0" />
              </div>
            </div>
          </div>
          `
        );
        const draggables = document.querySelectorAll(".draggable");
        const newDraggable = draggables[draggables.length - 1] as HTMLElement;
        that.setupDraggable(newDraggable, draggables.length);

        (
          newDraggable.querySelector("input[type=text].text") as HTMLElement
        ).addEventListener("input", function (event: Event) {
          that.handleTextInputChange(event);
        });
        (
          newDraggable.querySelector(
            "input[type=number].fontSize"
          ) as HTMLElement
        ).addEventListener("input", function (event: Event) {
          that.handleFontSizeInputChange(event, newDraggable);
        });
        (
          newDraggable.querySelector(
            "input[type=color].fontColor"
          ) as HTMLElement
        ).addEventListener("input", function (event: Event) {
          that.handleFontColorInputChange(event, newDraggable);
        });
      };
  }

  public setOnInsertImageInputListener(
    validateBase64: (base64: string) => boolean
  ) {
    const that = this;
    (document.getElementById("insert-image-input") as HTMLElement).onchange =
      async function () {
        (
          document.getElementById("overlayContainer") as HTMLElement
        ).insertAdjacentHTML(
          "beforeend",
          `
        <div class="image draggable focused" tabindex="0">
          <img class="image-wrapper" />
          <div class="text-options focused">
            <div class="img-container drag-handle">
              <img src="img/icon_drag.png" draggable="false" />
            </div>
            <div class="separator"></div>
            <div class="img-container">
                <img src="img/icon_scale_image.png" />
              </div>
            <input type="number" class="scale" min="1" value="100">
            <div class="img-container">
              <button class="options-delete" style="background: url('img/icon_delete.png'); width: 20px; height: 20px; padding: 0; margin: 0; border: 0" />
            </div>
          </div>
        </div>
        `
        );
        const draggables = document.querySelectorAll(".draggable");
        const newDraggable = draggables[draggables.length - 1] as HTMLElement;
        that.setupDraggable(newDraggable, draggables.length);

        var input = document.getElementById(
          "insert-image-input"
        ) as HTMLInputElement;
        var img = newDraggable.querySelector(
          ".image-wrapper"
        ) as HTMLImageElement;
        var file = input.files?.[0];

        if (file) {
          var reader = new FileReader();

          reader.onload = function (e: ProgressEvent<FileReader>) {
            const imageBase64 = (e.target?.result as string) || null;
            if (imageBase64 != null && validateBase64(imageBase64)) {
              img.src = imageBase64;
            } else {
              console.log(
                `Invalid image format: ${imageBase64} must be either PNG or JPEG.`
              );
            }
          };

          reader.readAsDataURL(file);
        } else {
          img.src = ""; // Clear the image if no file is selected
        }

        const image = newDraggable.querySelector(
          ".image-wrapper"
        ) as HTMLImageElement;
        (
          newDraggable.querySelector("input[type=number].scale") as HTMLElement
        ).addEventListener("input", function (event: Event) {
          that.handleScaleInputChange(event, image);
        });
      };
  }

  public setOnPdfFileChosenListener(
    onPdfFileChosen: (pdfFile: File) => Promise<void>
  ) {
    (document.getElementById("pdf-file-input") as HTMLElement).onchange =
      async function (ev: Event) {
        const input = ev.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
          onPdfFileChosen(input.files[0]);
        }
      };
  }

  /** Iterates through all form fields in the PDF and returns them as a `FormInputValues` object. */
  public extractFormInputValues(): FormInputValues {
    const that = this;
    const formInputValues: FormInputValues = new FormInputValues();

    const textInputElements = this.content.querySelectorAll(
      ':not(.draggable) > input[type="text"]'
    );
    textInputElements.forEach(function (inputElement) {
      const casted = inputElement as HTMLInputElement;
      formInputValues.textNameToValue.set(casted.name, casted.value);
    });

    const textAreaElements = this.content.querySelectorAll(
      ":not(.draggable) > textarea"
    );
    textAreaElements.forEach(function (textAreaElement) {
      const casted = textAreaElement as HTMLTextAreaElement;
      formInputValues.textNameToValue.set(casted.name, casted.value);
    });

    const checkboxInputElements = this.content.querySelectorAll(
      ':not(.draggable) > input[type="checkbox"]'
    );
    checkboxInputElements.forEach(function (inputElement) {
      const casted = inputElement as HTMLInputElement;
      formInputValues.checkboxNameToValue.set(casted.name, casted.checked);
    });

    const radioInputFields = this.content.querySelectorAll(
      ':not(.draggable) > input[type="radio"]'
    );
    const radioGroups: Set<string> = new Set();
    radioInputFields.forEach(function (inputElement) {
      const casted = inputElement as HTMLInputElement;
      radioGroups.add(casted.name);
    });
    radioGroups.forEach(function (groupName) {
      const radioButtons = Array.from(document.getElementsByName(groupName));
      var selected = radioButtons.find(
        (radioButton) => (radioButton as HTMLInputElement).checked
      );
      if (selected != null) {
        // pdfjs doesn't necessarily add form fields in the same order as
        // in the original PDF. Instead we rely on the zIndex which is in
        // the correct order.
        var minZIndex = that.calculateSmallestZIndex(
          radioButtons.map((el) => el.parentElement as HTMLElement)
        );
        var adjustedIndex =
          parseInt(
            getComputedStyle(selected.parentElement as HTMLElement).zIndex
          ) - minZIndex;
        formInputValues.radioGroupNameToSelectedIndex.set(
          groupName,
          adjustedIndex
        );
      }
    });

    const selectFields = this.content.querySelectorAll(
      ":not(.draggable) > select"
    );
    selectFields.forEach(function (selectElement) {
      const casted = selectElement as HTMLSelectElement;
      if (casted.size > 1) {
        formInputValues.optionNameToSelectedIndex.set(
          casted.name,
          casted.selectedIndex
        );
      } else {
        formInputValues.dropdownNameToSelectedIndex.set(
          casted.name,
          casted.selectedIndex
        );
      }
    });

    return formInputValues;
  }

  public setTotalPages(totalPages: number) {
    (document.querySelector("#total-pages") as HTMLElement).innerHTML =
      totalPages.toString();
  }

  public downloadBlob(data: Uint8Array, filename: string) {
    const blob = new Blob([data], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public createThumbnailPlaceholders(
    numThumbnails: number,
    thumbnailShownObserver: IntersectionObserver,
    onThumbnailClick: (pageNumber: number) => void
  ) {
    for (let i = 1; i <= numThumbnails; i++) {
      const div = document.createElement("div");
      div.classList.add("thumbnail-list-container");

      div.onclick = () => onThumbnailClick(i);

      const label = document.createElement("div");
      label.classList.add("thumbnail-list-label");
      label.innerHTML = `${i}`;

      const canvas = document.createElement("canvas");
      canvas.classList.add("thumbnail-list-canvas");
      canvas.setAttribute("data-pagenumber", `${i}`);

      div.append(canvas);
      div.append(label);

      this.pageListContainer.appendChild(div);
      thumbnailShownObserver.observe(canvas);
    }
  }

  public gotoPage(
    pageNumber: number,
    oldPage: number,
    scrollToPage: boolean = true
  ) {
    if (oldPage >= 0) {
      const previousPageElement = document.querySelector(
        `.thumbnail-list-container:nth-child(${oldPage})`
      ) as HTMLElement | null;
      if (previousPageElement) {
        previousPageElement.classList.remove(
          "thumbnail-list-container-selected"
        );
      }
    }

    (document.querySelector("#current-page") as HTMLInputElement).value =
      pageNumber.toString();

    const nthElement = document.querySelector(
      `.thumbnail-list-container:nth-child(${pageNumber})`
    ) as HTMLElement | null;
    if (nthElement) {
      nthElement.classList.add("thumbnail-list-container-selected");
    }

    nthElement?.scrollIntoView({
      block: "nearest",
    });

    if (scrollToPage) {
      const pageElement = document.querySelector(
        `.page:nth-child(${pageNumber})`
      ) as HTMLElement | null;
      if (pageElement != null) {
        pageElement.scrollIntoView({
          block: "start", // Scroll to the start of the target element
        });
      } else {
        console.log("page element null");
      }
    }
  }

  public calculateOriginalToActualRatio(
    pageNumber: number,
    pdfPage: PdfPage
  ): number {
    const [_, height] = pdfPage.getSize();
    const actualPdfHeight = (
      this.container.querySelectorAll(".page")[pageNumber - 1] as HTMLElement
    ).offsetHeight;
    return height / actualPdfHeight;
  }

  public getTextDraggableMetadata(): Array<TextDraggableMetadata> {
    const that = this;
    return Array.from(document.querySelectorAll(".draggable"))
      .filter((draggable) => draggable.classList.contains("text"))
      .map(function (draggable) {
        const casted = draggable as HTMLElement;
        const textInputCasted = draggable.querySelector(
          'input[type="text"]'
        ) as HTMLInputElement;
        const offsetRelativeToAncestor = that.offsetRelativeToAncestor(
          textInputCasted,
          that.contentInner
        );
        const computedStyle = window.getComputedStyle(textInputCasted, null);
        return new TextDraggableMetadata(
          textInputCasted,
          textInputCasted.value,
          computedStyle.fontFamily,
          parseInt(computedStyle.fontSize),
          computedStyle.color,
          textInputCasted.offsetHeight,
          offsetRelativeToAncestor,
          /* draggableTopLeft = */ [casted.offsetLeft, casted.offsetTop],
          /* draggableBottomRight = */ [
            casted.offsetLeft + casted.offsetWidth,
            casted.offsetTop + casted.offsetHeight,
          ]
        );
      });
  }

  public getImageDraggableMetadata(): Array<ImageDraggableMetadata> {
    const that = this;
    return Array.from(document.querySelectorAll(".draggable"))
      .filter((draggable) => draggable.classList.contains("image"))
      .map(function (draggable) {
        const casted = draggable as HTMLElement;
        const scale =
          parseFloat(
            (
              draggable.querySelector(
                "input[type=number].scale"
              ) as HTMLInputElement
            ).value
          ) / 100;
        const image = draggable.querySelector(
          ".image-wrapper"
        ) as HTMLImageElement;

        const [offsetLeft, offsetTop] = that.offsetRelativeToAncestor(
          image,
          that.contentInner
        );
        return new ImageDraggableMetadata(
          image.src,
          [image.naturalWidth * scale, image.naturalHeight * scale],
          [offsetLeft, offsetTop],
          /* draggableTopLeft = */ [casted.offsetLeft, casted.offsetTop],
          /* draggableBottomRight = */ [
            casted.offsetLeft + casted.offsetWidth,
            casted.offsetTop + casted.offsetHeight,
          ]
        );
      });
  }

  private calculateSmallestZIndex(collection: Array<HTMLElement>): number {
    return Math.min(
      ...Array.from(collection, (el) => parseInt(getComputedStyle(el).zIndex))
    );
  }

  private handleFontSizeInputChange(event: Event, newDraggable: HTMLElement) {
    // Access the current value of the input field
    const inputValue = (event.target as HTMLInputElement).value;

    // Convert the input value to a number
    const numericValue = parseFloat(inputValue);

    // Check if the conversion is successful and not NaN
    if (!isNaN(numericValue)) {
      (
        newDraggable.querySelector("input[type=text].text") as HTMLElement
      ).style.fontSize = `${numericValue}px`;
    } else {
      console.log("Invalid Input");
    }
  }

  private offsetRelativeToAncestor(
    child: HTMLElement,
    ancestor: HTMLElement
  ): [number, number] {
    var x: number = 0;
    var y: number = 0;

    var currentElement: HTMLElement | null = child;
    while (currentElement != ancestor && currentElement != null) {
      x += currentElement.offsetLeft;
      y += currentElement.offsetTop;
      currentElement = currentElement.parentElement;
    }

    return [x, y];
  }

  private handleTextInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const inputValue = input.value;
    if (inputValue.length * 1.25 > input.size) {
      input.size = Math.max(inputValue.length * 1.25, 20);
    } else if (inputValue.length * 0.75 < input.size) {
      input.size = Math.max(inputValue.length * 1.25, 20);
    }
  }

  private handleFontColorInputChange(event: Event, newDraggable: HTMLElement) {
    const inputValue = (event.target as HTMLInputElement).value;
    if (inputValue) {
      (
        newDraggable.querySelector("input[type=text].text") as HTMLElement
      ).style.color = inputValue;
    }
  }

  private handleScaleInputChange(event: Event, image: HTMLImageElement) {
    // Access the current value of the input field
    const inputValue = (event.target as HTMLInputElement).value;

    // Convert the input value to a number
    const numericValue = parseFloat(inputValue);

    // Check if the conversion is successful and not NaN
    if (!isNaN(numericValue)) {
      image.width = (image.naturalWidth * numericValue) / 100;
      image.height = (image.naturalHeight * numericValue) / 100;
    } else {
      console.log("Invalid Input");
    }
  }

  /** Sets up the draggable overlay's button options and dragging. */
  private setupDraggable(
    draggableElement: HTMLElement,
    numDraggables: number
  ): void {
    let offsetX: number, offsetY: number;

    const scrollTop = (document.getElementById("content") as HTMLElement)
      .scrollTop;
    draggableElement.style.left = 50 + (numDraggables - 1) * 10 + "px";
    draggableElement.style.top =
      scrollTop + (50 + (numDraggables - 1) * 10) + "px";

    // Note that focusing scrolls the PDF page to the element
    draggableElement.focus();

    (draggableElement.querySelector(".options-delete") as HTMLElement).onclick =
      function () {
        draggableElement.remove();
      };

    const mouseDownListener = function (event: MouseEvent) {
      offsetX = event.clientX - draggableElement.offsetLeft;
      offsetY = event.clientY - draggableElement.offsetTop;
      draggableElement.style.opacity = "0.7";

      window.addEventListener("mousemove", mouseMoveListener);
      window.addEventListener("mouseup", mouseUpListener);
    };
    const mouseMoveListener = function (event: MouseEvent) {
      const x = event.clientX - offsetX;
      const y = event.clientY - offsetY;

      draggableElement.style.left = `${x}px`;
      draggableElement.style.top = `${y}px`;
    };
    const mouseUpListener = function (event: MouseEvent) {
      window.removeEventListener("mousemove", mouseMoveListener);
      window.removeEventListener("mouseup", mouseUpListener);
      draggableElement.style.opacity = "1";
    };

    const a = draggableElement.querySelector(".drag-handle") as HTMLElement;
    a.addEventListener("mousedown", mouseDownListener);
    draggableElement.addEventListener("focusin", function (event: FocusEvent) {
      const targetElement: Element = event.target as Element;
      const parent = targetElement.closest(".draggable");
      if (
        parent != draggableElement ||
        draggableElement.classList.contains("focused")
      ) {
        return;
      }
      draggableElement.classList.remove("unfocused");
      draggableElement.classList.add("focused");
    });

    draggableElement.addEventListener("focusout", function (event: FocusEvent) {
      if (draggableElement.classList.contains("unfocused")) {
        return;
      }
      const newlyFocusedElement: Element = event.relatedTarget as Element;
      if (newlyFocusedElement != null) {
        const parent = newlyFocusedElement.closest(".draggable");
        if (parent == draggableElement) {
          return;
        }
      }

      draggableElement.classList.remove("focused");
      draggableElement.classList.add("unfocused");
    });
  }
}
