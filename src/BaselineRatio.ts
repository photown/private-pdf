export const baselineRatio = (
  fontFamily: string,
  fontSizePx: number
): number => {
  const elem = document.body;

  // The container is a little defensive.
  const container = document.createElement("div");
  container.style.display = "block";
  container.style.position = "absolute";
  container.style.bottom = "0";
  container.style.right = "0";
  container.style.width = "0px";
  container.style.height = "0px";
  container.style.margin = "0";
  container.style.padding = "0";
  container.style.visibility = "hidden";
  container.style.overflow = "hidden";

  // Intentionally unprotected style definition.
  const small = document.createElement("span");
  const large = document.createElement("span");

  // Large numbers help improve accuracy.
  small.style.fontFamily = fontFamily;
  small.style.fontSize = "0px";
  large.style.fontFamily = fontFamily;
  large.style.fontSize = `${fontSizePx}px`;

  small.innerHTML = "X";
  large.innerHTML = "X";

  container.appendChild(small);
  container.appendChild(large);

  // Put the element in the DOM for a split second.
  elem.appendChild(container);
  const smalldims = small.getBoundingClientRect();
  const largedims = large.getBoundingClientRect();
  elem.removeChild(container);

  // Calculate where the baseline was, percentage-wise.
  const baselineposition = smalldims.top - largedims.top;
  const height = largedims.height;

  return 1 - baselineposition / height;
};
