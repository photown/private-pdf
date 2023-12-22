export class FormInputValues {
  public readonly textNameToValue: Map<string, string> = new Map();
  public readonly checkboxNameToValue: Map<string, boolean> = new Map();
  public readonly dropdownNameToSelectedIndex: Map<string, number> = new Map();
  public readonly optionNameToSelectedIndex: Map<string, number> = new Map();
  public readonly radioGroupNameToSelectedIndex: Map<string, number> = new Map();
}