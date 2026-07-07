import type {
  AgentComponentContext,
  AgentComponentInteraction,
  ComponentInteractionContext,
  DiscordChannelContext,
  DiscordUser,
} from "./context.js";
import { logVerbose } from "../../../globals.js";
import { logError } from "../../../logger.js";
import { buildPairingReply } from "../../../pairing/pairing-messages.js";
import {
  readChannelAllowFromStore,
  upsertChannelPairingRequest,
} from "../../../pairing/pairing-store.js";
import {
  normalizeDiscordAllowList,
  resolveDiscordAllowListMatch,
  resolveDiscordChannelConfigWithFallback,
  resolveDiscordGuildEntry,
  resolveDiscordMemberAccessState,
} from "../allow-list.js";
import { formatDiscordUserTag } from "../format.js";
import { resolveComponentInteractionContext, resolveDiscordChannelContext } from "./context.js";

export async function ackComponentInteraction(params: {
  interaction: AgentComponentInteraction;
  replyOpts: { ephemeral?: boolean };
  label: string;
}) {
  try {
    await params.interaction.reply({
      content: "\u2713",
      ...params.replyOpts,
    });
  } catch (err) {
    logError(`${params.label}: failed to acknowledge interaction: ${String(err)}`);
  }
}

export async function ensureGuildComponentMemberAllowed(params: {
  interaction: AgentComponentInteraction;
  guildInfo: ReturnType<typeof resolveDiscordGuildEntry>;
  channelId: string;
  rawGuildId: string | undefined;
  channelCtx: DiscordChannelContext;
  memberRoleIds: string[];
  user: DiscordUser;
  replyOpts: { ephemeral?: boolean };
  componentLabel: string;
  unauthorizedReply: string;
}): Promise<boolean> {
  const {
    interaction,
    guildInfo,
    channelId,
    rawGuildId,
    channelCtx,
    memberRoleIds,
    user,
    replyOpts,
    componentLabel,
    unauthorizedReply,
  } = params;

  if (!rawGuildId) {
    return true;
  }

  const channelConfig = resolveDiscordChannelConfigWithFallback({
    guildInfo,
    channelId,
    channelName: channelCtx.channelName,
    channelSlug: channelCtx.channelSlug,
    parentId: channelCtx.parentId,
    parentName: channelCtx.parentName,
    parentSlug: channelCtx.parentSlug,
    scope: channelCtx.isThread ? "thread" : "channel",
  });

  const { memberAllowed } = resolveDiscordMemberAccessState({
    channelConfig,
    guildInfo,
    memberRoleIds,
    sender: {
      id: user.id,
      name: user.username,
      tag: user.discriminator ? `${user.username}#${user.discriminator}` : undefined,
    },
  });
  if (memberAllowed) {
    return true;
  }

  logVerbose(`agent ${componentLabel}: blocked user ${user.id} (not in users/roles allowlist)`);
  try {
    await interaction.reply({
      content: unauthorizedReply,
      ...replyOpts,
    });
  } catch {
    // Interaction may have expired
  }
  return false;
}

export async function ensureAgentComponentInteractionAllowed(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentInteraction;
  channelId: string;
  rawGuildId: string | undefined;
  memberRoleIds: string[];
  user: DiscordUser;
  replyOpts: { ephemeral?: boolean };
  componentLabel: string;
  unauthorizedReply: string;
}): Promise<{ parentId: string | undefined } | null> {
  const guildInfo = resolveDiscordGuildEntry({
    guild: params.interaction.guild ?? undefined,
    guildEntries: params.ctx.guildEntries,
  });
  const channelCtx = resolveDiscordChannelContext(params.interaction);
  const memberAllowed = await ensureGuildComponentMemberAllowed({
    interaction: params.interaction,
    guildInfo,
    channelId: params.channelId,
    rawGuildId: params.rawGuildId,
    channelCtx,
    memberRoleIds: params.memberRoleIds,
    user: params.user,
    replyOpts: params.replyOpts,
    componentLabel: params.componentLabel,
    unauthorizedReply: params.unauthorizedReply,
  });
  if (!memberAllowed) {
    return null;
  }
  return { parentId: channelCtx.parentId };
}

export async function ensureDmComponentAuthorized(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentInteraction;
  user: DiscordUser;
  componentLabel: string;
  replyOpts: { ephemeral?: boolean };
}): Promise<boolean> {
  const { ctx, interaction, user, componentLabel, replyOpts } = params;
  const dmPolicy = ctx.dmPolicy ?? "pairing";
  if (dmPolicy === "disabled") {
    logVerbose(`agent ${componentLabel}: blocked (DM policy disabled)`);
    try {
      await interaction.reply({
        content: "DM interactions are disabled.",
        ...replyOpts,
      });
    } catch {
      // Interaction may have expired
    }
    return false;
  }
  if (dmPolicy === "open") {
    return true;
  }

  const storeAllowFrom = await readChannelAllowFromStore("discord").catch(() => []);
  const effectiveAllowFrom = [...(ctx.allowFrom ?? []), ...storeAllowFrom];
  const allowList = normalizeDiscordAllowList(effectiveAllowFrom, ["discord:", "user:", "pk:"]);
  const allowMatch = allowList
    ? resolveDiscordAllowListMatch({
        allowList,
        candidate: {
          id: user.id,
          name: user.username,
          tag: formatDiscordUserTag(user),
        },
      })
    : { allowed: false };
  if (allowMatch.allowed) {
    return true;
  }

  if (dmPolicy === "pairing") {
    const { code, created } = await upsertChannelPairingRequest({
      channel: "discord",
      id: user.id,
      meta: {
        tag: formatDiscordUserTag(user),
        name: user.username,
      },
    });
    try {
      await interaction.reply({
        content: created
          ? buildPairingReply({
              channel: "discord",
              idLine: `Your Discord user id: ${user.id}`,
              code,
            })
          : "Pairing already requested. Ask the bot owner to approve your code.",
        ...replyOpts,
      });
    } catch {
      // Interaction may have expired
    }
    return false;
  }

  logVerbose(`agent ${componentLabel}: blocked DM user ${user.id} (not in allowFrom)`);
  try {
    await interaction.reply({
      content: `You are not authorized to use this ${componentLabel}.`,
      ...replyOpts,
    });
  } catch {
    // Interaction may have expired
  }
  return false;
}

export async function resolveInteractionContextWithDmAuth(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentInteraction;
  label: string;
  componentLabel: string;
  defer?: boolean;
}): Promise<ComponentInteractionContext | null> {
  const interactionCtx = await resolveComponentInteractionContext({
    interaction: params.interaction,
    label: params.label,
    defer: params.defer,
  });
  if (!interactionCtx) {
    return null;
  }
  if (interactionCtx.isDirectMessage) {
    const authorized = await ensureDmComponentAuthorized({
      ctx: params.ctx,
      interaction: params.interaction,
      user: interactionCtx.user,
      componentLabel: params.componentLabel,
      replyOpts: interactionCtx.replyOpts,
    });
    if (!authorized) {
      return null;
    }
  }
  return interactionCtx;
}
