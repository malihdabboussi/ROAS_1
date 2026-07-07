import {
  Button,
  ChannelSelectMenu,
  LinkButton,
  MentionableSelectMenu,
  RoleSelectMenu,
  StringSelectMenu,
  UserSelectMenu,
} from "@buape/carbon";
import { ButtonStyle } from "discord-api-types/v10";
import type {
  DiscordComponentButtonSpec,
  DiscordComponentEntry,
  DiscordComponentSelectSpec,
  DiscordComponentSelectType,
} from "./components.types.js";
import { buildDiscordComponentCustomId } from "./components.custom-id.js";
import { createShortId, mapButtonStyle } from "./components.internal-utils.js";

function createButtonComponent(params: {
  spec: DiscordComponentButtonSpec;
  componentId?: string;
  modalId?: string;
}): { component: Button | LinkButton; entry?: DiscordComponentEntry } {
  const style = mapButtonStyle(params.spec.style);
  const isLink = style === ButtonStyle.Link || Boolean(params.spec.url);
  if (isLink) {
    if (!params.spec.url) {
      throw new Error("Link buttons require a url");
    }
    const linkUrl = params.spec.url;
    class DynamicLinkButton extends LinkButton {
      label = params.spec.label;
      url = linkUrl;
    }
    return { component: new DynamicLinkButton() };
  }
  const componentId = params.componentId ?? createShortId("btn_");
  const customId = buildDiscordComponentCustomId({
    componentId,
    modalId: params.modalId,
  });
  class DynamicButton extends Button {
    label = params.spec.label;
    customId = customId;
    style = style;
    emoji = params.spec.emoji;
    disabled = params.spec.disabled ?? false;
  }
  return {
    component: new DynamicButton(),
    entry: {
      id: componentId,
      kind: params.modalId ? "modal-trigger" : "button",
      label: params.spec.label,
      modalId: params.modalId,
    },
  };
}

function createSelectComponent(params: {
  spec: DiscordComponentSelectSpec;
  componentId?: string;
}): {
  component:
    | StringSelectMenu
    | UserSelectMenu
    | RoleSelectMenu
    | MentionableSelectMenu
    | ChannelSelectMenu;
  entry: DiscordComponentEntry;
} {
  const type = (params.spec.type ?? "string").toLowerCase() as DiscordComponentSelectType;
  const componentId = params.componentId ?? createShortId("sel_");
  const customId = buildDiscordComponentCustomId({ componentId });
  if (type === "string") {
    const options = params.spec.options ?? [];
    if (options.length === 0) {
      throw new Error("String select menus require options");
    }
    class DynamicStringSelect extends StringSelectMenu {
      customId = customId;
      options = options;
      minValues = params.spec.minValues;
      maxValues = params.spec.maxValues;
      placeholder = params.spec.placeholder;
      disabled = false;
    }
    return {
      component: new DynamicStringSelect(),
      entry: {
        id: componentId,
        kind: "select",
        label: params.spec.placeholder ?? "select",
        selectType: "string",
        options: options.map((option) => ({ value: option.value, label: option.label })),
      },
    };
  }
  if (type === "user") {
    class DynamicUserSelect extends UserSelectMenu {
      customId = customId;
      minValues = params.spec.minValues;
      maxValues = params.spec.maxValues;
      placeholder = params.spec.placeholder;
      disabled = false;
    }
    return {
      component: new DynamicUserSelect(),
      entry: {
        id: componentId,
        kind: "select",
        label: params.spec.placeholder ?? "user select",
        selectType: "user",
      },
    };
  }
  if (type === "role") {
    class DynamicRoleSelect extends RoleSelectMenu {
      customId = customId;
      minValues = params.spec.minValues;
      maxValues = params.spec.maxValues;
      placeholder = params.spec.placeholder;
      disabled = false;
    }
    return {
      component: new DynamicRoleSelect(),
      entry: {
        id: componentId,
        kind: "select",
        label: params.spec.placeholder ?? "role select",
        selectType: "role",
      },
    };
  }
  if (type === "mentionable") {
    class DynamicMentionableSelect extends MentionableSelectMenu {
      customId = customId;
      minValues = params.spec.minValues;
      maxValues = params.spec.maxValues;
      placeholder = params.spec.placeholder;
      disabled = false;
    }
    return {
      component: new DynamicMentionableSelect(),
      entry: {
        id: componentId,
        kind: "select",
        label: params.spec.placeholder ?? "mentionable select",
        selectType: "mentionable",
      },
    };
  }
  class DynamicChannelSelect extends ChannelSelectMenu {
    customId = customId;
    minValues = params.spec.minValues;
    maxValues = params.spec.maxValues;
    placeholder = params.spec.placeholder;
    disabled = false;
  }
  return {
    component: new DynamicChannelSelect(),
    entry: {
      id: componentId,
      kind: "select",
      label: params.spec.placeholder ?? "channel select",
      selectType: "channel",
    },
  };
}

export function isSelectComponent(
  component: unknown,
): component is
  | StringSelectMenu
  | UserSelectMenu
  | RoleSelectMenu
  | MentionableSelectMenu
  | ChannelSelectMenu {
  return (
    component instanceof StringSelectMenu ||
    component instanceof UserSelectMenu ||
    component instanceof RoleSelectMenu ||
    component instanceof MentionableSelectMenu ||
    component instanceof ChannelSelectMenu
  );
}

export { createButtonComponent, createSelectComponent };
