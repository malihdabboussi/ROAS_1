import {
  CheckboxGroup,
  RadioGroup,
  RoleSelectMenu,
  StringSelectMenu,
  TextInput,
  UserSelectMenu,
} from "@buape/carbon";
import type { DiscordModalFieldDefinition } from "./components.types.js";
import { mapTextInputStyle } from "./components.internal-utils.js";

export function createModalFieldComponent(
  field: DiscordModalFieldDefinition,
): TextInput | StringSelectMenu | UserSelectMenu | RoleSelectMenu | CheckboxGroup | RadioGroup {
  if (field.type === "text") {
    class DynamicTextInput extends TextInput {
      customId = field.id;
      style = mapTextInputStyle(field.style);
      placeholder = field.placeholder;
      required = field.required;
      minLength = field.minLength;
      maxLength = field.maxLength;
    }
    return new DynamicTextInput();
  }
  if (field.type === "select") {
    const options = field.options ?? [];
    class DynamicModalSelect extends StringSelectMenu {
      customId = field.id;
      options = options;
      required = field.required;
      minValues = field.minValues;
      maxValues = field.maxValues;
      placeholder = field.placeholder;
    }
    return new DynamicModalSelect();
  }
  if (field.type === "role-select") {
    class DynamicModalRoleSelect extends RoleSelectMenu {
      customId = field.id;
      required = field.required;
      minValues = field.minValues;
      maxValues = field.maxValues;
      placeholder = field.placeholder;
    }
    return new DynamicModalRoleSelect();
  }
  if (field.type === "user-select") {
    class DynamicModalUserSelect extends UserSelectMenu {
      customId = field.id;
      required = field.required;
      minValues = field.minValues;
      maxValues = field.maxValues;
      placeholder = field.placeholder;
    }
    return new DynamicModalUserSelect();
  }
  if (field.type === "checkbox") {
    const options = field.options ?? [];
    class DynamicCheckboxGroup extends CheckboxGroup {
      customId = field.id;
      options = options;
      required = field.required;
      minValues = field.minValues;
      maxValues = field.maxValues;
    }
    return new DynamicCheckboxGroup();
  }
  const options = field.options ?? [];
  class DynamicRadioGroup extends RadioGroup {
    customId = field.id;
    options = options;
    required = field.required;
    minValues = field.minValues;
    maxValues = field.maxValues;
  }
  return new DynamicRadioGroup();
}
