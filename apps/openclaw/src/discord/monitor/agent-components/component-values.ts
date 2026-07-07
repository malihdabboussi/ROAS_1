import type { ModalInteraction } from "@buape/carbon";
import type { DiscordComponentEntry, DiscordModalEntry } from "../../components.js";
import { logError } from "../../../logger.js";
import { formatDiscordUserTag } from "../format.js";

function mapOptionLabels(
  options: Array<{ value: string; label: string }> | undefined,
  values: string[],
) {
  if (!options || options.length === 0) {
    return values;
  }
  const map = new Map(options.map((option) => [option.value, option.label]));
  return values.map((value) => map.get(value) ?? value);
}

export function mapSelectValues(entry: DiscordComponentEntry, values: string[]): string[] {
  if (entry.selectType === "string") {
    return mapOptionLabels(entry.options, values);
  }
  if (entry.selectType === "user") {
    return values.map((value) => `user:${value}`);
  }
  if (entry.selectType === "role") {
    return values.map((value) => `role:${value}`);
  }
  if (entry.selectType === "mentionable") {
    return values.map((value) => `mentionable:${value}`);
  }
  if (entry.selectType === "channel") {
    return values.map((value) => `channel:${value}`);
  }
  return values;
}

function resolveModalFieldValues(
  field: DiscordModalEntry["fields"][number],
  interaction: ModalInteraction,
): string[] {
  const fields = interaction.fields;
  const optionLabels = field.options?.map((option) => ({
    value: option.value,
    label: option.label,
  }));
  const required = field.required === true;
  try {
    switch (field.type) {
      case "text": {
        const value = required ? fields.getText(field.id, true) : fields.getText(field.id);
        return value ? [value] : [];
      }
      case "select":
      case "checkbox":
      case "radio": {
        const values = required
          ? fields.getStringSelect(field.id, true)
          : (fields.getStringSelect(field.id) ?? []);
        return mapOptionLabels(optionLabels, values);
      }
      case "role-select": {
        try {
          const roles = required
            ? fields.getRoleSelect(field.id, true)
            : (fields.getRoleSelect(field.id) ?? []);
          return roles.map((role) => role.name ?? role.id);
        } catch {
          const values = required
            ? fields.getStringSelect(field.id, true)
            : (fields.getStringSelect(field.id) ?? []);
          return values;
        }
      }
      case "user-select": {
        const users = required
          ? fields.getUserSelect(field.id, true)
          : (fields.getUserSelect(field.id) ?? []);
        return users.map((user) => formatDiscordUserTag(user));
      }
      default:
        return [];
    }
  } catch (err) {
    logError(`agent modal: failed to read field ${field.id}: ${String(err)}`);
    return [];
  }
}

export function formatModalSubmissionText(
  entry: DiscordModalEntry,
  interaction: ModalInteraction,
): string {
  const lines: string[] = [`Form "${entry.title}" submitted.`];
  for (const field of entry.fields) {
    const values = resolveModalFieldValues(field, interaction);
    if (values.length === 0) {
      continue;
    }
    lines.push(`- ${field.label}: ${values.join(", ")}`);
  }
  if (lines.length === 1) {
    lines.push("- (no values)");
  }
  return lines.join("\n");
}
