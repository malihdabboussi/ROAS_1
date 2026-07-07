import type {
  AgentComponentContext,
  AgentComponentInteraction,
  ComponentInteractionContext,
  DiscordChannelContext,
} from "./context.js";
import { resolveHumanDelayConfig } from "../../../agents/identity.js";
import { resolveChunkMode, resolveTextChunkLimit } from "../../../auto-reply/chunk.js";
import {
  formatInboundEnvelope,
  resolveEnvelopeFormatOptions,
} from "../../../auto-reply/envelope.js";
import { finalizeInboundContext } from "../../../auto-reply/reply/inbound-context.js";
import { dispatchReplyWithBufferedBlockDispatcher } from "../../../auto-reply/reply/provider-dispatcher.js";
import { createReplyReferencePlanner } from "../../../auto-reply/reply/reply-reference.js";
import { createReplyPrefixOptions } from "../../../channels/reply-prefix.js";
import { recordInboundSession } from "../../../channels/session.js";
import { resolveMarkdownTableMode } from "../../../config/markdown-tables.js";
import { readSessionUpdatedAt, resolveStorePath } from "../../../config/sessions.js";
import { logVerbose } from "../../../globals.js";
import { logError } from "../../../logger.js";
import { resolveAgentRoute } from "../../../routing/resolve-route.js";
import { createNonExitingRuntime } from "../../../runtime.js";
import {
  resolveDiscordChannelConfigWithFallback,
  resolveDiscordGuildEntry,
  resolveDiscordOwnerAllowFrom,
} from "../allow-list.js";
import { formatDiscordUserTag } from "../format.js";
import { buildDirectLabel, buildGuildLabel } from "../reply-context.js";
import { deliverDiscordReply } from "../reply-delivery.js";
import { sendTyping } from "../typing.js";

export async function dispatchDiscordComponentEvent(params: {
  ctx: AgentComponentContext;
  interaction: AgentComponentInteraction;
  interactionCtx: ComponentInteractionContext;
  channelCtx: DiscordChannelContext;
  guildInfo: ReturnType<typeof resolveDiscordGuildEntry>;
  eventText: string;
  replyToId?: string;
  routeOverrides?: { sessionKey?: string; agentId?: string; accountId?: string };
}): Promise<void> {
  const { ctx, interaction, interactionCtx, channelCtx, guildInfo, eventText } = params;
  const runtime = ctx.runtime ?? createNonExitingRuntime();
  const route = resolveAgentRoute({
    cfg: ctx.cfg,
    channel: "discord",
    accountId: ctx.accountId,
    guildId: interactionCtx.rawGuildId,
    memberRoleIds: interactionCtx.memberRoleIds,
    peer: {
      kind: interactionCtx.isDirectMessage ? "direct" : "channel",
      id: interactionCtx.isDirectMessage ? interactionCtx.userId : interactionCtx.channelId,
    },
    parentPeer: channelCtx.parentId ? { kind: "channel", id: channelCtx.parentId } : undefined,
  });
  const sessionKey = params.routeOverrides?.sessionKey ?? route.sessionKey;
  const agentId = params.routeOverrides?.agentId ?? route.agentId;
  const accountId = params.routeOverrides?.accountId ?? route.accountId;

  const fromLabel = interactionCtx.isDirectMessage
    ? buildDirectLabel(interactionCtx.user)
    : buildGuildLabel({
        guild: interaction.guild ?? undefined,
        channelName: channelCtx.channelName ?? interactionCtx.channelId,
        channelId: interactionCtx.channelId,
      });
  const senderName = interactionCtx.user.globalName ?? interactionCtx.user.username;
  const senderUsername = interactionCtx.user.username;
  const senderTag = formatDiscordUserTag(interactionCtx.user);
  const groupChannel =
    !interactionCtx.isDirectMessage && channelCtx.channelSlug
      ? `#${channelCtx.channelSlug}`
      : undefined;
  const groupSubject = interactionCtx.isDirectMessage ? undefined : groupChannel;
  const channelConfig = resolveDiscordChannelConfigWithFallback({
    guildInfo,
    channelId: interactionCtx.channelId,
    channelName: channelCtx.channelName,
    channelSlug: channelCtx.channelSlug,
    parentId: channelCtx.parentId,
    parentName: channelCtx.parentName,
    parentSlug: channelCtx.parentSlug,
    scope: channelCtx.isThread ? "thread" : "channel",
  });
  const groupSystemPrompt = channelConfig?.systemPrompt?.trim() || undefined;
  const ownerAllowFrom = resolveDiscordOwnerAllowFrom({
    channelConfig,
    guildInfo,
    sender: { id: interactionCtx.user.id, name: interactionCtx.user.username, tag: senderTag },
  });
  const storePath = resolveStorePath(ctx.cfg.session?.store, { agentId });
  const envelopeOptions = resolveEnvelopeFormatOptions(ctx.cfg);
  const previousTimestamp = readSessionUpdatedAt({
    storePath,
    sessionKey,
  });
  const timestamp = Date.now();
  const combinedBody = formatInboundEnvelope({
    channel: "Discord",
    from: fromLabel,
    timestamp,
    body: eventText,
    chatType: interactionCtx.isDirectMessage ? "direct" : "channel",
    senderLabel: senderName,
    previousTimestamp,
    envelope: envelopeOptions,
  });

  const ctxPayload = finalizeInboundContext({
    Body: combinedBody,
    BodyForAgent: eventText,
    RawBody: eventText,
    CommandBody: eventText,
    From: interactionCtx.isDirectMessage
      ? `discord:${interactionCtx.userId}`
      : `discord:channel:${interactionCtx.channelId}`,
    To: `channel:${interactionCtx.channelId}`,
    SessionKey: sessionKey,
    AccountId: accountId,
    ChatType: interactionCtx.isDirectMessage ? "direct" : "channel",
    ConversationLabel: fromLabel,
    SenderName: senderName,
    SenderId: interactionCtx.userId,
    SenderUsername: senderUsername,
    SenderTag: senderTag,
    GroupSubject: groupSubject,
    GroupChannel: groupChannel,
    GroupSystemPrompt: interactionCtx.isDirectMessage ? undefined : groupSystemPrompt,
    GroupSpace: guildInfo?.id ?? guildInfo?.slug ?? interactionCtx.rawGuildId ?? undefined,
    OwnerAllowFrom: ownerAllowFrom,
    Provider: "discord" as const,
    Surface: "discord" as const,
    WasMentioned: true,
    CommandAuthorized: true,
    CommandSource: "text" as const,
    MessageSid: interaction.rawData.id,
    Timestamp: timestamp,
    OriginatingChannel: "discord" as const,
    OriginatingTo: `channel:${interactionCtx.channelId}`,
  });

  await recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? sessionKey,
    ctx: ctxPayload,
    updateLastRoute: interactionCtx.isDirectMessage
      ? {
          sessionKey: route.mainSessionKey,
          channel: "discord",
          to: `user:${interactionCtx.userId}`,
          accountId,
        }
      : undefined,
    onRecordError: (err) => {
      logVerbose(`discord: failed updating component session meta: ${String(err)}`);
    },
  });

  const deliverTarget = `channel:${interactionCtx.channelId}`;
  const typingChannelId = interactionCtx.channelId;
  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg: ctx.cfg,
    agentId,
    channel: "discord",
    accountId,
  });
  const tableMode = resolveMarkdownTableMode({
    cfg: ctx.cfg,
    channel: "discord",
    accountId,
  });
  const textLimit = resolveTextChunkLimit(ctx.cfg, "discord", accountId, {
    fallbackLimit: 2000,
  });
  const token = ctx.token ?? "";
  const replyToMode =
    ctx.discordConfig?.replyToMode ?? ctx.cfg.channels?.discord?.replyToMode ?? "off";
  const replyReference = createReplyReferencePlanner({
    replyToMode,
    startId: params.replyToId,
  });

  await dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: ctx.cfg,
    replyOptions: { onModelSelected },
    dispatcherOptions: {
      ...prefixOptions,
      humanDelay: resolveHumanDelayConfig(ctx.cfg, agentId),
      deliver: async (payload) => {
        const replyToId = replyReference.use();
        await deliverDiscordReply({
          replies: [payload],
          target: deliverTarget,
          token,
          accountId,
          rest: interaction.client.rest,
          runtime,
          replyToId,
          textLimit,
          maxLinesPerMessage: ctx.discordConfig?.maxLinesPerMessage,
          tableMode,
          chunkMode: resolveChunkMode(ctx.cfg, "discord", accountId),
        });
        replyReference.markSent();
      },
      onReplyStart: async () => {
        try {
          await sendTyping({ client: interaction.client, channelId: typingChannelId });
        } catch (err) {
          logVerbose(`discord: typing failed for component reply: ${String(err)}`);
        }
      },
      onError: (err) => {
        logError(`discord component dispatch failed: ${String(err)}`);
      },
    },
  });
}
