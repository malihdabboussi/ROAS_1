import type { APIStringSelectComponent } from "discord-api-types/v10";
import {
  Button,
  ChannelSelectMenu,
  MentionableSelectMenu,
  RoleSelectMenu,
  StringSelectMenu,
  UserSelectMenu,
  type ButtonInteraction,
  type ChannelSelectMenuInteraction,
  type ComponentData,
  type MentionableSelectMenuInteraction,
  type RoleSelectMenuInteraction,
  type StringSelectMenuInteraction,
  type UserSelectMenuInteraction,
} from "@buape/carbon";
import { ButtonStyle } from "discord-api-types/v10";
import type { AgentComponentContext } from "./context.js";
import { parseDiscordComponentCustomIdForCarbon } from "../../components.js";
import { handleDiscordComponentEvent, handleDiscordModalTrigger } from "./component-handlers.js";
import { parseDiscordComponentData, resolveInteractionCustomId } from "./parsing.js";

class DiscordComponentButton extends Button {
  label = "component";
  customId = "*";
  style = ButtonStyle.Primary;
  customIdParser = parseDiscordComponentCustomIdForCarbon;
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: ButtonInteraction, data: ComponentData): Promise<void> {
    const parsed = parseDiscordComponentData(data, resolveInteractionCustomId(interaction));
    if (parsed?.modalId) {
      await handleDiscordModalTrigger({
        ctx: this.ctx,
        interaction,
        data,
        label: "discord component modal",
      });
      return;
    }
    await handleDiscordComponentEvent({
      ctx: this.ctx,
      interaction,
      data,
      componentLabel: "button",
      label: "discord component button",
    });
  }
}

class DiscordComponentStringSelect extends StringSelectMenu {
  customId = "*";
  options: APIStringSelectComponent["options"] = [];
  customIdParser = parseDiscordComponentCustomIdForCarbon;
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: StringSelectMenuInteraction, data: ComponentData): Promise<void> {
    await handleDiscordComponentEvent({
      ctx: this.ctx,
      interaction,
      data,
      componentLabel: "select menu",
      label: "discord component select",
      values: interaction.values ?? [],
    });
  }
}

class DiscordComponentUserSelect extends UserSelectMenu {
  customId = "*";
  customIdParser = parseDiscordComponentCustomIdForCarbon;
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: UserSelectMenuInteraction, data: ComponentData): Promise<void> {
    await handleDiscordComponentEvent({
      ctx: this.ctx,
      interaction,
      data,
      componentLabel: "user select",
      label: "discord component user select",
      values: interaction.values ?? [],
    });
  }
}

class DiscordComponentRoleSelect extends RoleSelectMenu {
  customId = "*";
  customIdParser = parseDiscordComponentCustomIdForCarbon;
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: RoleSelectMenuInteraction, data: ComponentData): Promise<void> {
    await handleDiscordComponentEvent({
      ctx: this.ctx,
      interaction,
      data,
      componentLabel: "role select",
      label: "discord component role select",
      values: interaction.values ?? [],
    });
  }
}

class DiscordComponentMentionableSelect extends MentionableSelectMenu {
  customId = "*";
  customIdParser = parseDiscordComponentCustomIdForCarbon;
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: MentionableSelectMenuInteraction, data: ComponentData): Promise<void> {
    await handleDiscordComponentEvent({
      ctx: this.ctx,
      interaction,
      data,
      componentLabel: "mentionable select",
      label: "discord component mentionable select",
      values: interaction.values ?? [],
    });
  }
}

class DiscordComponentChannelSelect extends ChannelSelectMenu {
  customId = "*";
  customIdParser = parseDiscordComponentCustomIdForCarbon;
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: ChannelSelectMenuInteraction, data: ComponentData): Promise<void> {
    await handleDiscordComponentEvent({
      ctx: this.ctx,
      interaction,
      data,
      componentLabel: "channel select",
      label: "discord component channel select",
      values: interaction.values ?? [],
    });
  }
}

export function createDiscordComponentButton(ctx: AgentComponentContext): Button {
  return new DiscordComponentButton(ctx);
}

export function createDiscordComponentStringSelect(ctx: AgentComponentContext): StringSelectMenu {
  return new DiscordComponentStringSelect(ctx);
}

export function createDiscordComponentUserSelect(ctx: AgentComponentContext): UserSelectMenu {
  return new DiscordComponentUserSelect(ctx);
}

export function createDiscordComponentRoleSelect(ctx: AgentComponentContext): RoleSelectMenu {
  return new DiscordComponentRoleSelect(ctx);
}

export function createDiscordComponentMentionableSelect(
  ctx: AgentComponentContext,
): MentionableSelectMenu {
  return new DiscordComponentMentionableSelect(ctx);
}

export function createDiscordComponentChannelSelect(ctx: AgentComponentContext): ChannelSelectMenu {
  return new DiscordComponentChannelSelect(ctx);
}
