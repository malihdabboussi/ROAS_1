import {
  Button,
  ChannelSelectMenu,
  Container,
  File,
  LinkButton,
  MediaGallery,
  MentionableSelectMenu,
  RoleSelectMenu,
  Row,
  Section,
  Separator,
  StringSelectMenu,
  TextDisplay,
  Thumbnail,
  UserSelectMenu,
  type TopLevelComponents,
} from "@buape/carbon";
import { MessageFlags } from "discord-api-types/v10";
import type {
  DiscordComponentBuildResult,
  DiscordComponentButtonSpec,
  DiscordComponentEntry,
  DiscordComponentMessageSpec,
  DiscordModalEntry,
} from "./components.types.js";
import {
  createButtonComponent,
  createSelectComponent,
  isSelectComponent,
} from "./components.interactive-builders.js";
import { createShortId, normalizeModalFieldName } from "./components.internal-utils.js";

function buildTextDisplays(text?: string, texts?: string[]): TextDisplay[] {
  if (texts && texts.length > 0) {
    return texts.map((entry) => new TextDisplay(entry));
  }
  if (text) {
    return [new TextDisplay(text)];
  }
  return [];
}

export function buildDiscordComponentMessage(params: {
  spec: DiscordComponentMessageSpec;
  fallbackText?: string;
  sessionKey?: string;
  agentId?: string;
  accountId?: string;
}): DiscordComponentBuildResult {
  const entries: DiscordComponentEntry[] = [];
  const modals: DiscordModalEntry[] = [];
  const components: TopLevelComponents[] = [];
  const containerChildren: Array<
    | Row<
        | Button
        | LinkButton
        | StringSelectMenu
        | UserSelectMenu
        | RoleSelectMenu
        | MentionableSelectMenu
        | ChannelSelectMenu
      >
    | TextDisplay
    | Section
    | MediaGallery
    | Separator
    | File
  > = [];

  const addEntry = (entry: DiscordComponentEntry) => {
    entries.push({
      ...entry,
      sessionKey: params.sessionKey,
      agentId: params.agentId,
      accountId: params.accountId,
    });
  };

  const text = params.spec.text ?? params.fallbackText;
  if (text) {
    containerChildren.push(new TextDisplay(text));
  }

  for (const block of params.spec.blocks ?? []) {
    if (block.type === "text") {
      containerChildren.push(new TextDisplay(block.text));
      continue;
    }
    if (block.type === "section") {
      const displays = buildTextDisplays(block.text, block.texts);
      if (displays.length > 3) {
        throw new Error("Section blocks support up to 3 text displays");
      }
      let accessory: Thumbnail | Button | LinkButton | undefined;
      if (block.accessory?.type === "thumbnail") {
        accessory = new Thumbnail(block.accessory.url);
      } else if (block.accessory?.type === "button") {
        const { component, entry } = createButtonComponent({ spec: block.accessory.button });
        accessory = component;
        if (entry) {
          addEntry(entry);
        }
      }
      containerChildren.push(new Section(displays, accessory));
      continue;
    }
    if (block.type === "separator") {
      containerChildren.push(new Separator({ spacing: block.spacing, divider: block.divider }));
      continue;
    }
    if (block.type === "media-gallery") {
      containerChildren.push(new MediaGallery(block.items));
      continue;
    }
    if (block.type === "file") {
      containerChildren.push(new File(block.file, block.spoiler));
      continue;
    }
    if (block.type === "actions") {
      const rowComponents: Array<
        | Button
        | LinkButton
        | StringSelectMenu
        | UserSelectMenu
        | RoleSelectMenu
        | MentionableSelectMenu
        | ChannelSelectMenu
      > = [];
      if (block.buttons) {
        if (block.buttons.length > 5) {
          throw new Error("Action rows support up to 5 buttons");
        }
        for (const button of block.buttons) {
          const { component, entry } = createButtonComponent({ spec: button });
          rowComponents.push(component);
          if (entry) {
            addEntry(entry);
          }
        }
      } else if (block.select) {
        const { component, entry } = createSelectComponent({ spec: block.select });
        rowComponents.push(component);
        addEntry(entry);
      }
      containerChildren.push(new Row(rowComponents));
    }
  }

  if (params.spec.modal) {
    const modalId = createShortId("mdl_");
    const fields = params.spec.modal.fields.map((field, index) => ({
      id: createShortId("fld_"),
      name: normalizeModalFieldName(field.name, index),
      label: field.label,
      type: field.type,
      description: field.description,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options,
      minValues: field.minValues,
      maxValues: field.maxValues,
      minLength: field.minLength,
      maxLength: field.maxLength,
      style: field.style,
    }));
    modals.push({
      id: modalId,
      title: params.spec.modal.title,
      fields,
      sessionKey: params.sessionKey,
      agentId: params.agentId,
      accountId: params.accountId,
    });

    const triggerSpec: DiscordComponentButtonSpec = {
      label: params.spec.modal.triggerLabel ?? "Open form",
      style: params.spec.modal.triggerStyle ?? "primary",
    };

    const { component, entry } = createButtonComponent({
      spec: triggerSpec,
      modalId,
    });

    if (entry) {
      addEntry(entry);
    }

    const lastChild = containerChildren.at(-1);
    if (lastChild instanceof Row) {
      const row = lastChild;
      const hasSelect = row.components.some((comp) => isSelectComponent(comp));
      if (row.components.length < 5 && !hasSelect) {
        row.addComponent(component as Button);
      } else {
        containerChildren.push(new Row([component as Button]));
      }
    } else {
      containerChildren.push(new Row([component as Button]));
    }
  }

  if (containerChildren.length === 0) {
    throw new Error("components must include at least one block, text, or modal trigger");
  }

  const container = new Container(containerChildren, params.spec.container);
  components.push(container);
  return { components, entries, modals };
}

export function buildDiscordComponentMessageFlags(
  components: TopLevelComponents[],
): number | undefined {
  const hasV2 = components.some((component) => component.isV2);
  return hasV2 ? MessageFlags.IsComponentsV2 : undefined;
}
