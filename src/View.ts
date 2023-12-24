import { FormInputValues } from "./FormInputValues";

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

  public setOnContentScrollEventListener(scrollEvent: () => void) {
    (document.getElementById("content") as HTMLElement).addEventListener(
      "scroll",
      scrollEvent
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
            <input type="text" class="text" value="test123" />
            <div class="text-options focused">
              <div class="img-container drag-handle">
                <img src="../img/icon_drag.png" draggable="false" />
              </div>
              <div class="separator"></div>
              <div class="img-container">
                <img src="../img/icon_font_size.png" />
              </div>
              <input type="number" class="fontSize" min="8" max="96" value="14">
              <div class="separator"></div>
              <div class="img-container">
                <img src="../img/icon_text_color.png" />
              </div>
              <input type="color" class="fontColor">
              <div class="separator"></div>
              <div class="img-container">
                <button class="options-delete" style="background: url('../img/icon_delete.png'); width: 20px; height: 20px; padding: 0; margin: 0; border: 0" />
              </div>
            </div>
          </div>
          `
        );
        const draggables = document.querySelectorAll(".draggable");
        const newDraggable = draggables[draggables.length - 1] as HTMLElement;
        that.setupDraggable(newDraggable, draggables.length);

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
              <img src="../img/icon_drag.png" draggable="false" />
            </div>
            <div class="separator"></div>
            <input type="number" class="scale" min="1" value="100">
            <div class="img-container">
              <button class="options-delete" style="background: url('../img/icon_delete.png'); width: 20px; height: 20px; padding: 0; margin: 0; border: 0" />
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
        console.log(input.files);
        if (input.files && input.files.length > 0) {
          onPdfFileChosen(input.files[0]);
        }
      };
  }

  public extractFormInputValues() {
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