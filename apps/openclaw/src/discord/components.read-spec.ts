import type {
  DiscordComponentButtonStyle,
  DiscordComponentMessageSpec,
  DiscordModalSpec,
} from "./components.types.js";
import { readOptionalString, readString, requireObject } from "./components.internal-utils.js";
import { parseComponentBlock, parseModalField } from "./components.parse.js";

export function readDiscordComponentSpec(raw: unknown): DiscordComponentMessageSpec | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  const obj = requireObject(raw, "components");
  const blocksRaw = obj.blocks;
  const blocks = Array.isArray(blocksRaw)
    ? blocksRaw.map((entry, idx) => parseComponentBlock(entry, `components.blocks[${idx}]`))
    : undefined;
  const modalRaw = obj.modal;
  let modal: DiscordModalSpec | undefined;
  if (modalRaw !== undefined) {
    const modalObj = requireObject(modalRaw, "components.modal");
    const fieldsRaw = modalObj.fields;
    if (!Array.isArray(fieldsRaw) || fieldsRaw.length === 0) {
      throw new Error("components.modal.fields must be a non-empty array");
    }
    if (fieldsRaw.length > 5) {
      throw new Error("components.modal.fields supports up to 5 inputs");
    }
    const fields = fieldsRaw.map((entry, idx) =>
      parseModalField(entry, `components.modal.fields[${idx}]`, idx),
    );
    modal = {
      title: readString(modalObj.title, "components.modal.title"),
      triggerLabel: readOptionalString(modalObj.triggerLabel),
      triggerStyle: readOptionalString(modalObj.triggerStyle) as DiscordComponentButtonStyle,
      fields,
    };
  }
  return {
    text: readOptionalString(obj.text),
    container:
      typeof obj.container === "object" && obj.container && !Array.isArray(obj.container)
        ? {
            accentColor: (obj.container as { accentColor?: unknown }).accentColor as
              | string
              | number
              | undefined,
            spoiler:
              typeof (obj.container as { spoiler?: unknown }).spoiler === "boolean"
                ? ((obj.container as { spoiler?: boolean }).spoiler as boolean)
                : undefined,
          }
        : undefined,
    blocks,
    modal,
  };
}
