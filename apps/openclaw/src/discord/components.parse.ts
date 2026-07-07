import type {
  DiscordComponentBlock,
  DiscordComponentButtonSpec,
  DiscordComponentButtonStyle,
  DiscordComponentModalFieldType,
  DiscordComponentSelectOption,
  DiscordComponentSelectSpec,
  DiscordComponentSelectType,
  DiscordComponentSectionAccessory,
  DiscordModalFieldSpec,
} from "./components.types.js";
import {
  normalizeAttachmentRef,
  normalizeBlockType,
  normalizeModalFieldName,
  readOptionalNumber,
  readOptionalString,
  readString,
  requireObject,
} from "./components.internal-utils.js";

type SeparatorSpacing = Extract<DiscordComponentBlock, { type: "separator" }>["spacing"];

function parseSelectOptions(
  raw: unknown,
  label: string,
): DiscordComponentSelectOption[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new Error(`${label} must be an array`);
  }
  return raw.map((entry, index) => {
    const obj = requireObject(entry, `${label}[${index}]`);
    return {
      label: readString(obj.label, `${label}[${index}].label`),
      value: readString(obj.value, `${label}[${index}].value`),
      description: readOptionalString(obj.description),
      emoji:
        typeof obj.emoji === "object" && obj.emoji && !Array.isArray(obj.emoji)
          ? {
              name: readString(
                (obj.emoji as { name?: unknown }).name,
                `${label}[${index}].emoji.name`,
              ),
              id: readOptionalString((obj.emoji as { id?: unknown }).id),
              animated:
                typeof (obj.emoji as { animated?: unknown }).animated === "boolean"
                  ? (obj.emoji as { animated?: boolean }).animated
                  : undefined,
            }
          : undefined,
      default: typeof obj.default === "boolean" ? obj.default : undefined,
    };
  });
}

function parseButtonSpec(raw: unknown, label: string): DiscordComponentButtonSpec {
  const obj = requireObject(raw, label);
  const style = readOptionalString(obj.style) as DiscordComponentButtonStyle | undefined;
  const url = readOptionalString(obj.url);
  if ((style === "link" || url) && !url) {
    throw new Error(`${label}.url is required for link buttons`);
  }
  return {
    label: readString(obj.label, `${label}.label`),
    style,
    url,
    emoji:
      typeof obj.emoji === "object" && obj.emoji && !Array.isArray(obj.emoji)
        ? {
            name: readString((obj.emoji as { name?: unknown }).name, `${label}.emoji.name`),
            id: readOptionalString((obj.emoji as { id?: unknown }).id),
            animated:
              typeof (obj.emoji as { animated?: unknown }).animated === "boolean"
                ? (obj.emoji as { animated?: boolean }).animated
                : undefined,
          }
        : undefined,
    disabled: typeof obj.disabled === "boolean" ? obj.disabled : undefined,
  };
}

function parseSelectSpec(raw: unknown, label: string): DiscordComponentSelectSpec {
  const obj = requireObject(raw, label);
  const type = readOptionalString(obj.type) as DiscordComponentSelectType | undefined;
  const allowedTypes: DiscordComponentSelectType[] = [
    "string",
    "user",
    "role",
    "mentionable",
    "channel",
  ];
  if (type && !allowedTypes.includes(type)) {
    throw new Error(`${label}.type must be one of ${allowedTypes.join(", ")}`);
  }
  return {
    type,
    placeholder: readOptionalString(obj.placeholder),
    minValues: readOptionalNumber(obj.minValues),
    maxValues: readOptionalNumber(obj.maxValues),
    options: parseSelectOptions(obj.options, `${label}.options`),
  };
}

export function parseModalField(raw: unknown, label: string, index: number): DiscordModalFieldSpec {
  const obj = requireObject(raw, label);
  const type = readString(
    obj.type,
    `${label}.type`,
  ).toLowerCase() as DiscordComponentModalFieldType;
  const supported: DiscordComponentModalFieldType[] = [
    "text",
    "checkbox",
    "radio",
    "select",
    "role-select",
    "user-select",
  ];
  if (!supported.includes(type)) {
    throw new Error(`${label}.type must be one of ${supported.join(", ")}`);
  }
  const options = parseSelectOptions(obj.options, `${label}.options`);
  if (["checkbox", "radio", "select"].includes(type) && (!options || options.length === 0)) {
    throw new Error(`${label}.options is required for ${type} fields`);
  }
  return {
    type,
    name: normalizeModalFieldName(readOptionalString(obj.name), index),
    label: readString(obj.label, `${label}.label`),
    description: readOptionalString(obj.description),
    placeholder: readOptionalString(obj.placeholder),
    required: typeof obj.required === "boolean" ? obj.required : undefined,
    options,
    minValues: readOptionalNumber(obj.minValues),
    maxValues: readOptionalNumber(obj.maxValues),
    minLength: readOptionalNumber(obj.minLength),
    maxLength: readOptionalNumber(obj.maxLength),
    style: readOptionalString(obj.style) as DiscordModalFieldSpec["style"],
  };
}

export function parseComponentBlock(raw: unknown, label: string): DiscordComponentBlock {
  const obj = requireObject(raw, label);
  const typeRaw = readString(obj.type, `${label}.type`).toLowerCase();
  const type = normalizeBlockType(typeRaw);
  switch (type) {
    case "text":
      return {
        type: "text",
        text: readString(obj.text, `${label}.text`),
      };
    case "section": {
      const text = readOptionalString(obj.text);
      const textsRaw = obj.texts;
      const texts = Array.isArray(textsRaw)
        ? textsRaw.map((entry, idx) => readString(entry, `${label}.texts[${idx}]`))
        : undefined;
      if (!text && (!texts || texts.length === 0)) {
        throw new Error(`${label}.text or ${label}.texts is required for section blocks`);
      }
      let accessory: DiscordComponentSectionAccessory | undefined;
      if (obj.accessory !== undefined) {
        const accessoryObj = requireObject(obj.accessory, `${label}.accessory`);
        const accessoryType = readString(
          accessoryObj.type,
          `${label}.accessory.type`,
        ).toLowerCase();
        if (accessoryType === "thumbnail") {
          accessory = {
            type: "thumbnail",
            url: readString(accessoryObj.url, `${label}.accessory.url`),
          };
        } else if (accessoryType === "button") {
          accessory = {
            type: "button",
            button: parseButtonSpec(accessoryObj.button, `${label}.accessory.button`),
          };
        } else {
          throw new Error(`${label}.accessory.type must be "thumbnail" or "button"`);
        }
      }
      return {
        type: "section",
        text,
        texts,
        accessory,
      };
    }
    case "separator": {
      const spacingRaw = obj.spacing;
      let spacing: SeparatorSpacing | undefined;
      if (spacingRaw === "small" || spacingRaw === "large") {
        spacing = spacingRaw;
      } else if (spacingRaw === 1 || spacingRaw === 2) {
        spacing = spacingRaw;
      } else if (spacingRaw !== undefined) {
        throw new Error(`${label}.spacing must be "small", "large", 1, or 2`);
      }
      const divider = typeof obj.divider === "boolean" ? obj.divider : undefined;
      return {
        type: "separator",
        spacing,
        divider,
      };
    }
    case "actions": {
      const buttonsRaw = obj.buttons;
      const buttons = Array.isArray(buttonsRaw)
        ? buttonsRaw.map((entry, idx) => parseButtonSpec(entry, `${label}.buttons[${idx}]`))
        : undefined;
      const select = obj.select ? parseSelectSpec(obj.select, `${label}.select`) : undefined;
      if ((!buttons || buttons.length === 0) && !select) {
        throw new Error(`${label} requires buttons or select`);
      }
      if (buttons && select) {
        throw new Error(`${label} cannot include both buttons and select`);
      }
      return {
        type: "actions",
        buttons,
        select,
      };
    }
    case "media-gallery": {
      const itemsRaw = obj.items;
      if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
        throw new Error(`${label}.items must be a non-empty array`);
      }
      const items = itemsRaw.map((entry, idx) => {
        const itemObj = requireObject(entry, `${label}.items[${idx}]`);
        return {
          url: readString(itemObj.url, `${label}.items[${idx}].url`),
          description: readOptionalString(itemObj.description),
          spoiler: typeof itemObj.spoiler === "boolean" ? itemObj.spoiler : undefined,
        };
      });
      return {
        type: "media-gallery",
        items,
      };
    }
    case "file": {
      const file = readString(obj.file, `${label}.file`);
      return {
        type: "file",
        file: normalizeAttachmentRef(file, `${label}.file`),
        spoiler: typeof obj.spoiler === "boolean" ? obj.spoiler : undefined,
      };
    }
    default:
      throw new Error(`${label}.type must be a supported component block`);
  }
}
