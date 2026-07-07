import type { ButtonInteraction, ComponentData } from "@buape/carbon";
import type { AgentComponentContext, AgentComponentMessageInteraction } from "./context.js";
import { logError } from "../../../logger.js";
import {
  resolveDiscordComponentEntry,
  resolveDiscordModalEntry,
} from "../../components-registry.js";
import { createDiscordFormModal, formatDiscordComponentEventText } from "../../components.js";
import { resolveDiscordGuildEntry } from "../allow-list.js";
import { ensureGuildComponentMemberAllowed, resolveInteractionContextWithDmAuth } from "./auth.js";
import { mapSelectValues } from "./component-values.js";
import { resolveDiscordChannelContext } from "./context.js";
import { dispatchDiscordComponentEvent } from "./event-dispatch.js";
import { parseDiscordComponentData, resolveInteractionCustomId } from "./parsing.js";

export async function handleDiscordComponentEvent(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentMessageInteraction;
  data: ComponentData;
  componentLabel: string;
  values?: string[];
  label: string;
}): Promise<void> {
  const parsed = parseDiscordComponentData(
    params.data,
    resolveInteractionCustomId(params.interaction),
  );
  if (!parsed) {
    logError(`${params.label}: failed to parse component data`);
    try {
      await params.interaction.reply({
        content: "This component is no longer valid.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const entry = resolveDiscordComponentEntry({ id: parsed.componentId, consume: false });
  if (!entry) {
    try {
      await params.interaction.reply({
        content: "This component has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const interactionCtx = await resolveInteractionContextWithDmAuth({
    ctx: params.ctx,
    interaction: params.interaction,
    label: params.label,
    componentLabel: params.componentLabel,
  });
  if (!interactionCtx) {
    return;
  }
  const { channelId, user, replyOpts, rawGuildId, memberRoleIds } = interactionCtx;
  const guildInfo = resolveDiscordGuildEntry({
    guild: params.interaction.guild ?? undefined,
    guildEntries: params.ctx.guildEntries,
  });
  const channelCtx = resolveDiscordChannelContext(params.interaction);
  const memberAllowed = await ensureGuildComponentMemberAllowed({
    interaction: params.interaction,
    guildInfo,
    channelId,
    rawGuildId,
    channelCtx,
    memberRoleIds,
    user,
    replyOpts,
    componentLabel: params.componentLabel,
    unauthorizedReply: `You are not authorized to use this ${params.componentLabel}.`,
  });
  if (!memberAllowed) {
    return;
  }

  const consumed = resolveDiscordComponentEntry({ id: parsed.componentId });
  if (!consumed) {
    try {
      await params.interaction.reply({
        content: "This component has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  if (consumed.kind === "modal-trigger") {
    try {
      await params.interaction.reply({
        content: "This form is no longer available.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const values = params.values ? mapSelectValues(consumed, params.values) : undefined;
  const eventText = formatDiscordComponentEventText({
    kind: consumed.kind === "select" ? "select" : "button",
    label: consumed.label,
    values,
  });

  try {
    await params.interaction.reply({ content: "\u2713", ...replyOpts });
  } catch (err) {
    logError(`${params.label}: failed to acknowledge interaction: ${String(err)}`);
  }

  await dispatchDiscordComponentEvent({
    ctx: params.ctx,
    interaction: params.interaction,
    interactionCtx,
    channelCtx,
    guildInfo,
    eventText,
    replyToId: consumed.messageId ?? params.interaction.message?.id,
    routeOverrides: {
      sessionKey: consumed.sessionKey,
      agentId: consumed.agentId,
      accountId: consumed.accountId,
    },
  });
}

export async function handleDiscordModalTrigger(params: {
  ctx: AgentComponentContext;
  interaction: ButtonInteraction;
  data: ComponentData;
  label: string;
}): Promise<void> {
  const parsed = parseDiscordComponentData(
    params.data,
    resolveInteractionCustomId(params.interaction),
  );
  if (!parsed) {
    logError(`${params.label}: failed to parse modal trigger data`);
    try {
      await params.interaction.reply({
        content: "This button is no longer valid.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }
  const entry = resolveDiscordComponentEntry({ id: parsed.componentId, consume: false });
  if (!entry || entry.kind !== "modal-trigger") {
    try {
      await params.interaction.reply({
        content: "This button has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const modalId = entry.modalId ?? parsed.modalId;
  if (!modalId) {
    try {
      await params.interaction.reply({
        content: "This form is no longer available.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const interactionCtx = await resolveInteractionContextWithDmAuth({
    ctx: params.ctx,
    interaction: params.interaction,
    label: params.label,
    componentLabel: "form",
    defer: false,
  });
  if (!interactionCtx) {
    return;
  }
  const { channelId, user, replyOpts, rawGuildId, memberRoleIds } = interactionCtx;
  const guildInfo = resolveDiscordGuildEntry({
    guild: params.interaction.guild ?? undefined,
    guildEntries: params.ctx.guildEntries,
  });
  const channelCtx = resolveDiscordChannelContext(params.interaction);
  const memberAllowed = await ensureGuildComponentMemberAllowed({
    interaction: params.interaction,
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

  const consumed = resolveDiscordComponentEntry({ id: parsed.componentId });
  if (!consumed) {
    try {
      await params.interaction.reply({
        content: "This form has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  const resolvedModalId = consumed.modalId ?? modalId;
  const modalEntry = resolveDiscordModalEntry({ id: resolvedModalId, consume: false });
  if (!modalEntry) {
    try {
      await params.interaction.reply({
        content: "This form has expired.",
        ephemeral: true,
      });
    } catch {
      // Interaction may have expired
    }
    return;
  }

  try {
    await params.interaction.showModal(createDiscordFormModal(modalEntry));
  } catch (err) {
    logError(`${params.label}: failed to show modal: ${String(err)}`);
  }
}
