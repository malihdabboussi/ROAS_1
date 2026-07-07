import { Modal, type ComponentData, type ModalInteraction } from "@buape/carbon";
import type { AgentComponentContext } from "./context.js";
import { logError } from "../../../logger.js";
import { resolveDiscordModalEntry } from "../../components-registry.js";
import { parseDiscordModalCustomIdForCarbon } from "../../components.js";
import { resolveDiscordGuildEntry } from "../allow-list.js";
import { ensureGuildComponentMemberAllowed, resolveInteractionContextWithDmAuth } from "./auth.js";
import { formatModalSubmissionText } from "./component-values.js";
import { resolveDiscordChannelContext } from "./context.js";
import { dispatchDiscordComponentEvent } from "./event-dispatch.js";
import { parseDiscordModalId, resolveInteractionCustomId } from "./parsing.js";

class DiscordComponentModal extends Modal {
  title = "OpenClaw form";
  customId = "*";
  components = [];
  customIdParser = parseDiscordModalCustomIdForCarbon;
  private ctx: AgentComponentContext;

  constructor(ctx: AgentComponentContext) {
    super();
    this.ctx = ctx;
  }

  async run(interaction: ModalInteraction, data: ComponentData): Promise<void> {
    const modalId = parseDiscordModalId(data, resolveInteractionCustomId(interaction));
    if (!modalId) {
      logError("discord component modal: missing modal id");
      try {
        await interaction.reply({
          content: "This form is no longer valid.",
          ephemeral: true,
        });
      } catch {
        // Interaction may have expired
      }
      return;
    }

    const modalEntry = resolveDiscordModalEntry({ id: modalId, consume: false });
    if (!modalEntry) {
      try {
        await interaction.reply({
          content: "This form has expired.",
          ephemeral: true,
        });
      } catch {
        // Interaction may have expired
      }
      return;
    }

    const interactionCtx = await resolveInteractionContextWithDmAuth({
      ctx: this.ctx,
      interaction,
      label: "discord component modal",
      componentLabel: "form",
      defer: false,
    });
    if (!interactionCtx) {
      return;
    }
    const { channelId, user, replyOpts, rawGuildId, memberRoleIds } = interactionCtx;
    const guildInfo = resolveDiscordGuildEntry({
      guild: interaction.guild ?? undefined,
      guildEntries: this.ctx.guildEntries,
    });
    const channelCtx = resolveDiscordChannelContext(interaction);
    const memberAllowed = await ensureGuildComponentMemberAllowed({
      interaction,
      guildInfo,
      channelId,
      rawGuildId,
      channelCtx,
      memberRoleIds,
      user,
      replyOpts,
      componentLabel: "form",
      unauthorizedReply: "You are not authorized to use this form.",
    });
    if (!memberAllowed) {
      return;
    }

    const consumed = resolveDiscordModalEntry({ id: modalId });
    if (!consumed) {
      try {
        await interaction.reply({
          content: "This form has expired.",
          ephemeral: true,
        });
      } catch {
        // Interaction may have expired
      }
      return;
    }

    try {
      await interaction.acknowledge();
    } catch (err) {
      logError(`discord component modal: failed to acknowledge: ${String(err)}`);
    }

    const eventText = formatModalSubmissionText(consumed, interaction);
    await dispatchDiscordComponentEvent({
      ctx: this.ctx,
      interaction,
      interactionCtx,
      channelCtx,
      guildInfo,
      eventText,
      replyToId: consumed.messageId,
      routeOverrides: {
        sessionKey: consumed.sessionKey,
        agentId: consumed.agentId,
        accountId: consumed.accountId,
      },
    });
  }
}

export function createDiscordComponentModal(ctx: AgentComponentContext): Modal {
  return new DiscordComponentModal(ctx);
}
