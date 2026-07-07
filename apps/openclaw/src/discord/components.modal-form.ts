import { Label, Modal, TextDisplay } from "@buape/carbon";
import type { DiscordModalEntry, DiscordModalFieldDefinition } from "./components.types.js";
import {
  buildDiscordModalCustomId,
  parseDiscordModalCustomIdForCarbon,
} from "./components.custom-id.js";
import { createModalFieldComponent } from "./components.modal-field-builders.js";

export class DiscordFormModal extends Modal {
  title: string;
  customId: string;
  components: Array<Label | TextDisplay>;
  customIdParser = parseDiscordModalCustomIdForCarbon;

  constructor(params: { modalId: string; title: string; fields: DiscordModalFieldDefinition[] }) {
    super();
    this.title = params.title;
    this.customId = buildDiscordModalCustomId(params.modalId);
    this.components = params.fields.map((field) => {
      const component = createModalFieldComponent(field);
      class DynamicLabel extends Label {
        label = field.label;
        description = field.description;
        component = component;
        customId = field.id;
      }
      return new DynamicLabel(component);
    });
  }

  async run(): Promise<void> {
    throw new Error("Modal handler is not registered for dynamic forms");
  }
}

export function createDiscordFormModal(entry: DiscordModalEntry): Modal {
  return new DiscordFormModal({
    modalId: entry.id,
    title: entry.title,
    fields: entry.fields,
  });
}
