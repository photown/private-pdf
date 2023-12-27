/** Container for the values for all form elements for a PDF. */
export class FormInputValues {
  public readonly textNameToValue: Map<string, string> = new Map();
  public readonly checkboxNameToValue: Map<string, boolean> = new Map();
  public readonly dropdownNameToSelectedIndex: Map<string, number> = new Map();
  public readonly optionNameToSelectedIndex: Map<string, number> = new Map();
  public readonly radioGroupNameToSelectedIndex: Map<string, number> =
    new Map();

  public isEmpty(): boolean {
    return (
      this.textNameToValue.size == 0 &&
      this.checkboxNameToValue.size == 0 &&
      this.dropdownNameToSelectedIndex.size == 0 &&
      this.optionNameToSelectedIndex.size == 0 &&
      this.radioGroupNameToSelectedIndex.size == 0
    );
  }
}
