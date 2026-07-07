import type {
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  ModalInteraction,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from "@buape/carbon";
import { ChannelType } from "discord-api-types/v10";
import type { OpenClawConfig } from "../../../config/config.js";
import type { DiscordAccountConfig } from "../../../config/types.discord.js";
import type { RuntimeEnv } from "../../../runtime.js";
import { logError } from "../../../logger.js";
import { resolveAgentRoute } from "../../../routing/resolve-route.js";
import { normalizeDiscordSlug, type DiscordGuildEntryResolved } from "../allow-list.js";
import { formatDiscordUserTag } from "../format.js";

export type AgentComponentContext = {
  cfg: OpenClawConfig;
  accountId: string;
  discordConfig?: DiscordAccountConfig;
  runtime?: RuntimeEnv;
  token?: string;
  guildEntries?: Record<string, DiscordGuildEntryResolved>;
  /** DM allowlist (from allowFrom config; legacy: dm.allowFrom) */
  allowFrom?: Array<string | number>;
  /** DM policy (default: "pairing") */
  dmPolicy?: "open" | "pairing" | "allowlist" | "disabled";
};

export type DiscordUser = Parameters<typeof formatDiscordUserTag>[0];

export type AgentComponentMessageInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | RoleSelectMenuInteraction
  | UserSelectMenuInteraction
  | MentionableSelectMenuInteraction
  | ChannelSelectMenuInteraction;

export type AgentComponentInteraction = AgentComponentMessageInteraction | ModalInteraction;

export type DiscordChannelContext = {
  channelName: string | undefined;
  channelSlug: string;
  channelType: number | undefined;
  isThread: boolean;
  parentId: string | undefined;
  parentName: string | undefined;
  parentSlug: string;
};

export function resolveAgentComponentRoute(params: {
  ctx: AgentComponentContext;
  rawGuildId: string | undefined;
  memberRoleIds: string[];
  isDirectMessage: boolean;
  userId: string;
  channelId: string;
  parentId: string | undefined;
}) {
  return resolveAgentRoute({
    cfg: params.ctx.cfg,
    channel: "discord",
    accountId: params.ctx.accountId,
    guildId: params.rawGuildId,
    memberRoleIds: params.memberRoleIds,
    peer: {
      kind: params.isDirectMessage ? "direct" : "channel",
      id: params.isDirectMessage ? params.userId : params.channelId,
    },
    parentPeer: params.parentId ? { kind: "channel", id: params.parentId } : undefined,
  });
}

function formatUsername(user: { username: string; discriminator?: string | null }): string {
  if (user.discriminator && user.discriminator !== "0") {
    return `${user.username}#${user.discriminator}`;
  }
  return user.username;
}

/**
 * Check if a channel type is a thread type
 */
function isThreadChannelType(channelType: number | undefined): boolean {
  return (
    channelType === ChannelType.PublicThread ||
    channelType === ChannelType.PrivateThread ||
    channelType === ChannelType.AnnouncementThread
  );
}

export function resolveDiscordChannelContext(
  interaction: AgentComponentInteraction,
): DiscordChannelContext {
  const channel = interaction.channel;
  const channelName = channel && "name" in channel ? (channel.name as string) : undefined;
  const channelSlug = channelName ? normalizeDiscordSlug(channelName) : "";
  const channelType = channel && "type" in channel ? (channel.type as number) : undefined;
  const isThread = isThreadChannelType(channelType);

  let parentId: string | undefined;
  let parentName: string | undefined;
  let parentSlug = "";
  if (isThread && channel && "parentId" in channel) {
    parentId = (channel.parentId as string) ?? undefined;
    if ("parent" in channel) {
      const parent = (channel as { parent?: { name?: string } }).parent;
      if (parent?.name) {
        parentName = parent.name;
        parentSlug = normalizeDiscordSlug(parentName);
      }
    }
  }

  return { channelName, channelSlug, channelType, isThread, parentId, parentName, parentSlug };
}

export async function resolveComponentInteractionContext(params: {
  interaction: AgentComponentInteraction;
  label: string;
  defer?: boolean;
}): Promise<{
  channelId: string;
  user: DiscordUser;
  username: string;
  userId: string;
  replyOpts: { ephemeral?: boolean };
  rawGuildId: string | undefined;
  isDirectMessage: boolean;
  memberRoleIds: string[];
} | null> {
  const { interaction, label } = params;

  // Use interaction's actual channel_id (trusted source from Discord)
  // This prevents channel spoofing attacks
  const channelId = interaction.rawData.channel_id;
  if (!channelId) {
    logError(`${label}: missing channel_id in interaction`);
    return null;
  }

  const user = interaction.user;
  if (!user) {
    logError(`${label}: missing user in interaction`);
    return null;
  }

  const shouldDefer = params.defer !== false && "defer" in interaction;
  let didDefer = false;
  // Defer immediately to satisfy Discord's 3-second interaction ACK requirement.
  // We use an ephemeral deferred reply so subsequent interaction.reply() calls
  // can safely edit the original deferred response.
  if (shouldDefer) {
    try {
      await (interaction as AgentComponentMessageInteraction).defer({ ephemeral: true });
      didDefer = true;
    } catch (err) {
      logError(`${label}: failed to defer interaction: ${String(err)}`);
    }
  }
  const replyOpts = didDefer ? {} : { ephemeral: true };

  const username = formatUsername(user);
  const userId = user.id;

  // P1 FIX: Use rawData.guild_id as source of truth - interaction.guild can be null
  // when guild is not cached even though guild_id is present in rawData
  const rawGuildId = interaction.rawData.guild_id;
  const isDirectMessage = !rawGuildId;
  const memberRoleIds = Array.isArray(interaction.rawData.member?.roles)
    ? interaction.rawData.member.roles.map((roleId: string) => String(roleId))
    : [];

  return {
    channelId,
    user,
    username,
    userId,
    replyOpts,
    rawGuildId,
    isDirectMessage,
    memberRoleIds,
  };
}

export type ComponentInteractionContext = NonNullable<
  Awaited<ReturnType<typeof resolveComponentInteractionContext>>
>;
