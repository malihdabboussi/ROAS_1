import type { SlackBlock, SlackEventEnvelope } from '../types/slack.types'
import {
  buildSlackAskAssets,
  collectInboundSlackFiles,
  formatSlackAskAssetsBlock,
} from './slack-ask-assets'
import { classifySlackAskKind, formatSlackAskKindContext } from './slack-ask-kind'
import { formatSlackClientContextBlock } from './slack-client-context'
import { expandInboundSlackMentions } from './slack-inbound-mention-expansion'
import { SlackConversationBase } from './slack-service-conversation.base'
import {
  CREDITS_EXHAUSTED_SLACK_MESSAGE,
  GENERIC_SLACK_AGENT_ERROR_MESSAGE,
  isSlackDirectConversation,
  MACHINE_NOT_READY_SLACK_MESSAGE,
  MACHINE_UNREACHABLE_SLACK_MESSAGE,
  MACHINE_WAKE_START_SLACK_MESSAGE,
  SLACK_AGENT_STREAM_TIMEOUT_MS,
} from './slack-service.shared'
import { buildInboundSlackTurnPrompt, buildSlackMentionClientLookupText } from './slack-turn-prompt'
import {
  recordSlackPixelTurn,
  type SlackTurnSeed,
  type SlackTurnToolCall,
} from './slack-turn-telemetry'

export type SlackAgentTurn = {
  content: string | null
  toolEvents: SlackTurnToolCall[]
  conversationId: string | null
}

export abstract class SlackEventsBase extends SlackConversationBase {
  protected async processEventAsync(envelope: SlackEventEnvelope): Promise<void> {
    const event = envelope.event
    const teamId = envelope.team_id
    if (!teamId || !event) return

    if (event.subtype === 'bot_message') return
    if (event.bot_id) return

    this.logger.log(
      `[TRACE] processEventAsync PASS: team=${teamId} type=${event.type} user=${event.user} channel=${event.channel} channel_type=${event.channel_type} subtype=${event.subtype ?? 'none'} text_len=${(event.text ?? '').length} files=${event.files?.length ?? 0}`,
    )

    if (event.type === 'app_mention') {
      await this.handleAppMentionEvent(teamId, event)
    } else if (event.type === 'message') {
      await this.handleMessageEvent(teamId, event)
    } else if (event.type === 'reaction_added') {
      await this.handleReactionAddedEvent(teamId, event)
    }
  }

  protected async handleReactionAddedEvent(
    _teamId: string,
    _event: NonNullable<SlackEventEnvelope['event']>,
  ): Promise<void> {
    /* default no-op */
  }

  protected async handleMessageEvent(
    teamId: string,
    event: NonNullable<SlackEventEnvelope['event']>,
  ): Promise<void> {
    const channelId = event.channel
    if (!channelId) {
      this.logger.warn(`[TRACE] handleMessageEvent EXIT: missing channelId`)
      return
    }

    const text = event.text ?? ''
    const hasFiles = Array.isArray(event.files) && event.files.length > 0
    const hasAttachments = Array.isArray(event.attachments) && event.attachments.length > 0
    if (!text && !hasFiles && !hasAttachments) {
      this.logger.warn(
        `[TRACE] handleMessageEvent EXIT: no text and no files, channel=${channelId}`,
      )
      return
    }

    const serviceSupabase = this.getServiceRoleClient()
    const channel = await this.slackRepo.findActiveChannelByTeamAndChannel(
      serviceSupabase,
      teamId,
      channelId,
    )

    let channelOrgId: string | null | undefined = channel?.org_id

    let botToken: string
    let userId: string
    let agentKey: string
    let accessToken: string
    let ownerSlackUserId: string | null
    let botUserId: string | null = null

    if (channel) {
      const pc = channel.provider_config as Record<string, unknown>
      botToken = typeof pc.bot_token === 'string' ? pc.bot_token : ''
      ownerSlackUserId = typeof pc.authed_user_id === 'string' ? pc.authed_user_id : null
      botUserId = typeof pc.bot_user_id === 'string' ? pc.bot_user_id : null
      if (botUserId && event.user === botUserId) {
        this.logger.warn(
          `[TRACE] handleMessageEvent EXIT: message is from bot itself user=${event.user} botUserId=${botUserId}`,
        )
        return
      }

      userId = channel.user_id
      agentKey = channel.agent_key
      this.logger.log(
        `[TRACE] handleMessageEvent DIRECT_CHANNEL: userId=${userId} agentKey=${agentKey} botToken_len=${botToken.length}`,
      )
      await this.slackRepo.touchLastMessage(serviceSupabase, channel.id)
      if (!botToken) {
        this.logger.warn(
          `[TRACE] handleMessageEvent: mapped channel ${channel.id} missing bot token; trying fallback`,
        )
        const fallback = await this.resolveFallbackRouting(serviceSupabase, teamId)
        if (!fallback) {
          this.logger.warn(
            `[TRACE] handleMessageEvent EXIT: empty bot token and no fallback team=${teamId}`,
          )
          return
        }
        botToken = fallback.botToken
        userId = fallback.userId
        agentKey = fallback.agentKey
        channelOrgId = fallback.orgId
        ownerSlackUserId = fallback.ownerSlackUserId
        botUserId = fallback.botUserId
      }
    } else if (
      event.channel_type === 'im' ||
      event.channel_type === 'mpim' ||
      channelId.startsWith('D')
    ) {
      this.logger.log(
        `[TRACE] handleMessageEvent FALLBACK_ROUTE: channel_type=${event.channel_type} channelId=${channelId}`,
      )
      const fallback = await this.resolveFallbackRouting(serviceSupabase, teamId)
      if (!fallback) {
        this.logger.warn(
          `[TRACE] handleMessageEvent EXIT: fallback routing returned null for team=${teamId}`,
        )
        return
      }
      this.logger.log(
        `[TRACE] handleMessageEvent FALLBACK_OK: userId=${fallback.userId} agentKey=${fallback.agentKey} botToken_len=${fallback.botToken.length}`,
      )
      botToken = fallback.botToken
      userId = fallback.userId
      agentKey = fallback.agentKey
      channelOrgId = fallback.orgId
      ownerSlackUserId = fallback.ownerSlackUserId
      botUserId = fallback.botUserId
    } else {
      this.logger.warn(
        `[TRACE] handleMessageEvent EXIT: unmapped channel team=${teamId} channel=${channelId} channel_type=${event.channel_type ?? 'unknown'}`,
      )
      return
    }

    const principal = await this.slackAccessControl.authorizeAndRespond({
      supabase: serviceSupabase,
      botToken,
      ownerUserId: userId,
      ownerSlackUserId,
      orgId: channelOrgId ?? null,
      slackUserId: event.user,
      channelId,
      isDirectMessage: isSlackDirectConversation(event.channel_type, channelId),
      threadTs: event.thread_ts ?? event.ts,
    })
    if (!principal) return
    accessToken = await this.userSessionMint.mintAccessToken(userId)

    const mentions = await expandInboundSlackMentions({
      supabase: serviceSupabase,
      slackApi: this.slackApi,
      orgId: channelOrgId ?? null,
      ownerUserId: userId,
      botToken,
      botUserId,
      text,
    }).catch(() => ({ text, directoryBlock: '' }))
    const inboundText = mentions.text

    let fullMessage = inboundText
    const inboundFiles = collectInboundSlackFiles(event)
    const documents = await this.resolveInboundSlackFiles(
      botToken,
      userId,
      channelOrgId ?? null,
      inboundFiles,
    )
    const currentStamp = channelOrgId
      ? await this.resolveSlackAskClientStamp(serviceSupabase, {
          orgId: channelOrgId,
          slackTeamId: teamId,
          channelId,
          botToken,
        }).catch(() => null)
      : null
    const clientBundle = channelOrgId
      ? await this.resolveSlackClientBundle(serviceSupabase, {
          orgId: channelOrgId,
          slackTeamId: teamId,
          botToken,
          stamp: currentStamp,
          text: inboundText,
        }).catch(() => null)
      : null
    const forwarded = await this.buildForwardedMessageContext(
      serviceSupabase,
      userId,
      botToken,
      channelId,
      event.attachments,
      { orgId: channelOrgId, slackTeamId: teamId },
    )
    const forwardedContext = forwarded.context
    const campaignId =
      currentStamp?.roasCampaignId ?? forwarded.campaignId ?? clientBundle?.campaigns[0]?.id ?? null
    const thread = event.thread_ts
      ? await this.buildSlackThreadReply(botToken, channelId, event.thread_ts, event.ts).catch(
          (error) => {
            this.logger.warn(
              `Failed to load Slack reply context: ${
                error instanceof Error ? error.message : String(error)
              }`,
            )
            return { context: '', parentIsPixel: false }
          },
        )
      : { context: '', parentIsPixel: false }

    // N0 — classify before Pixel sees any client identity (North Star §3, §11.0).
    const prompt = buildInboundSlackTurnPrompt({
      text: inboundText,
      currentStamp,
      forwardedContext,
      threadContext: thread.context,
      threadParentIsPixel: thread.parentIsPixel,
      isDirectMessage: isSlackDirectConversation(event.channel_type, channelId),
      fileContext:
        inboundFiles.length > 0 && documents.length === 0
          ? this.buildFileContext(inboundFiles)
          : undefined,
      hasDocuments: documents.length > 0,
      clientContextBlock: clientBundle ? formatSlackClientContextBlock(clientBundle) : undefined,
      namedClientId: clientBundle?.clientId ?? null,
    })
    fullMessage = prompt.fullMessage
    const assetsBlock = formatSlackAskAssetsBlock(
      buildSlackAskAssets({ documents, texts: [inboundText, forwardedContext] }),
      { sourcePermalink: forwardedContext.match(/^Source: (\S+)/m)?.[1] ?? null },
    )
    if (assetsBlock) fullMessage = `${fullMessage}\n\n${assetsBlock}`
    if (mentions.directoryBlock) fullMessage = `${fullMessage}\n\n${mentions.directoryBlock}`
    const askKind = prompt.askKind
    const clientSource = prompt.clientSource

    this.logger.log(
      `[TRACE] handleMessageEvent CALLING_processAndReply: userId=${userId} slackUser=${principal.sender.slackUserId} agentKey=${agentKey} message_len=${fullMessage.length} documents=${documents.length}`,
    )

    await this.processAndReply({
      userId,
      agentKey,
      botToken,
      channelId,
      message: fullMessage,
      titleText: inboundText,
      teamId,
      threadTs: event.thread_ts ?? event.ts,
      messageTs: event.ts,
      accessToken,
      channelUser: {
        platform_id: principal.sender.slackUserId,
        display_name: principal.sender.displayName,
        relationship_kind: principal.relationshipKind,
        is_connection_owner: principal.isConnectionOwner,
        personal_brain_access: principal.personalBrainAccess,
        organization_wide_data_access: principal.organizationWideDataAccess,
      },
      orgId: channelOrgId ?? null,
      documents: documents.length > 0 ? documents : undefined,
      campaignId,
      turn: {
        askKind: askKind.kind,
        kindSignals: askKind.signals,
        clientSource,
        clientId: prompt.clientId,
        slackUserId: principal.sender.slackUserId,
      },
    })
  }

  protected async handleAppMentionEvent(
    teamId: string,
    event: NonNullable<SlackEventEnvelope['event']>,
  ): Promise<void> {
    const channelId = event.channel
    if (!channelId) return

    let text = event.text ?? ''
    const hasFiles = Array.isArray(event.files) && event.files.length > 0
    const hasAttachments = Array.isArray(event.attachments) && event.attachments.length > 0
    if (!text && !hasFiles && !hasAttachments) return

    const serviceSupabase = this.getServiceRoleClient()
    // Mapped channels already process the same post via `message`. Skipping the
    // mention path prevents two Pixel turns and two Service Request drafts.
    const mappedChannel = await this.slackRepo.findActiveChannelByTeamAndChannel(
      serviceSupabase,
      teamId,
      channelId,
    )
    if (mappedChannel) {
      this.logger.log(
        `[TRACE] handleAppMentionEvent EXIT: mapped channel owns message path channel=${channelId}`,
      )
      return
    }

    const fallback = await this.resolveFallbackRouting(serviceSupabase, teamId)
    if (!fallback) return

    const principal = await this.slackAccessControl.authorizeAndRespond({
      supabase: serviceSupabase,
      botToken: fallback.botToken,
      ownerUserId: fallback.userId,
      ownerSlackUserId: fallback.ownerSlackUserId,
      orgId: fallback.orgId,
      slackUserId: event.user,
      channelId,
      isDirectMessage: isSlackDirectConversation(event.channel_type, channelId),
      threadTs: event.thread_ts ?? event.ts,
    })
    if (!principal) return

    const mentions = await expandInboundSlackMentions({
      supabase: serviceSupabase,
      slackApi: this.slackApi,
      orgId: fallback.orgId,
      ownerUserId: fallback.userId,
      botToken: fallback.botToken,
      botUserId: fallback.botUserId,
      text,
    }).catch(() => ({ text, directoryBlock: '' }))
    text = mentions.text

    const documents = await this.resolveInboundSlackFiles(
      fallback.botToken,
      fallback.userId,
      fallback.orgId,
      collectInboundSlackFiles(event),
    )
    const forwarded = await this.buildForwardedMessageContext(
      serviceSupabase,
      fallback.userId,
      fallback.botToken,
      channelId,
      event.attachments,
      { orgId: fallback.orgId, slackTeamId: teamId },
    )
    const forwardedContext = forwarded.context

    const thread = event.thread_ts
      ? await this.buildSlackThreadReply(
          fallback.botToken,
          channelId,
          event.thread_ts,
          event.ts,
        ).catch(() => ({ context: '', parentIsPixel: false }))
      : { context: '', parentIsPixel: false }

    const channel = await this.buildChannelContext(
      serviceSupabase,
      fallback.userId,
      fallback.botToken,
      channelId,
      {
        orgId: fallback.orgId,
        slackTeamId: teamId,
        text: buildSlackMentionClientLookupText(text, thread.context),
      },
    ).catch((err) => {
      this.logger.warn(`Failed to build channel context: ${err}`)
      return { context: '', stampCampaignId: null, bundleCampaignId: null }
    })
    const channelContext = channel.context
    const campaignId = channel.stampCampaignId ?? forwarded.campaignId ?? channel.bundleCampaignId

    const attachmentText = forwardedContext ? `${text}\n\n${forwardedContext}`.trim() : text
    const assetsBlock = formatSlackAskAssetsBlock(
      buildSlackAskAssets({ documents, texts: [text, forwardedContext] }),
      { sourcePermalink: forwardedContext.match(/^Source: (\S+)/m)?.[1] ?? null },
    )
    const mentionText =
      (assetsBlock ? `${attachmentText}\n\n${assetsBlock}`.trim() : attachmentText) ||
      (documents.length > 0 ? '[User sent a file]' : '')
    const askKind = classifySlackAskKind({
      text,
      hasChannelClientStamp: /Resolved ROAS Portal client:/.test(channelContext),
      hasQuotedClientChannel: /Channel: #roas-|\[Slack channel identity\]/.test(forwardedContext),
      threadParentIsPixel: thread.parentIsPixel,
      isDirectMessage: isSlackDirectConversation(event.channel_type, channelId),
    })
    const messageWithContext = channelContext
      ? `${formatSlackAskKindContext(askKind)}\n\n${channelContext}\n\n[You were mentioned with]: ${mentionText}`
      : `${formatSlackAskKindContext(askKind)}\n\n${mentionText}`
    const mentionWithThreadContext = thread.context
      ? `[Slack thread context]\n${thread.context}\n\n[Current message]\n${messageWithContext}`
      : messageWithContext
    const mentionClientId = channelContext.match(/\(id=([^)]+)\)/)?.[1] ?? null
    const mentionMessage = mentions.directoryBlock
      ? `${mentionWithThreadContext}\n\n${mentions.directoryBlock}`
      : mentionWithThreadContext

    await this.processAndReply({
      userId: fallback.userId,
      agentKey: fallback.agentKey,
      botToken: fallback.botToken,
      channelId,
      message: mentionMessage,
      titleText: mentionText,
      teamId,
      threadTs: event.thread_ts ?? event.ts,
      messageTs: event.ts,
      accessToken: fallback.accessToken,
      channelUser: {
        platform_id: principal.sender.slackUserId,
        display_name: principal.sender.displayName,
        relationship_kind: principal.relationshipKind,
        is_connection_owner: principal.isConnectionOwner,
        personal_brain_access: principal.personalBrainAccess,
        organization_wide_data_access: principal.organizationWideDataAccess,
      },
      orgId: fallback.orgId,
      documents: documents.length > 0 ? documents : undefined,
      campaignId,
      turn: {
        askKind: askKind.kind,
        kindSignals: askKind.signals,
        clientSource: mentionClientId ? 'stamp' : 'none',
        clientId: mentionClientId,
        slackUserId: principal.sender.slackUserId,
      },
    })
  }

  protected async processAndReply(params: {
    userId: string
    agentKey: string
    botToken: string
    channelId: string
    message: string
    teamId: string
    threadTs: string | undefined
    messageTs: string | undefined
    accessToken: string
    orgId?: string | null
    channelUser?: {
      platform_id: string
      username?: string
      display_name: string
      relationship_kind: 'internal'
      is_connection_owner: boolean
      personal_brain_access: boolean
      organization_wide_data_access: boolean
    }
    documents?: Array<{
      filename: string
      type: 'text' | 'image' | 'video'
      fileUrl: string
      mimeType?: string
      text?: string
    }>
    /** Client campaign resolved for this ask; binds the conversation's CONNECTIONS (§11.2). */
    campaignId?: string | null
    /**
     * Raw human message used ONLY for conversation naming. `message` is the prompt-wrapped
     * turn (leads with the `[Ask kind]` block), so titling from it names sidebar rows
     * "[Ask kind] Kind: client …". Falls back to `message` when omitted.
     */
    titleText?: string
    /** N0 stamp + client resolution for this turn; drives `slack_pixel_turns`. */
    turn?: SlackTurnSeed
  }): Promise<void> {
    this.logger.log(
      `[TRACE] processAndReply START: userId=${params.userId} agentKey=${params.agentKey} channel=${params.channelId} message_len=${params.message.length}`,
    )
    if (!this.tryClaimInboundSlackMessage(params.teamId, params.channelId, params.messageTs)) {
      this.logger.warn(
        `[TRACE] processAndReply EXIT: duplicate inbound claim team=${params.teamId} channel=${params.channelId} ts=${params.messageTs}`,
      )
      return
    }
    const canReact = Boolean(params.botToken && params.channelId && params.messageTs)
    if (canReact) {
      await this.slackApi
        .addReaction(params.botToken, params.channelId, params.messageTs!, 'eyes')
        .catch(() => {})
    }
    const startedAt = Date.now()
    let turnResult: SlackAgentTurn | null = null
    let outcome: 'replied' | 'no_answer' | 'error' = 'error'
    let outcomeError: string | null = null
    try {
      turnResult = await this.routeToAgent(
        params.userId,
        params.agentKey,
        params.message,
        params.teamId,
        params.channelId,
        params.threadTs,
        params.accessToken,
        params.botToken,
        params.messageTs,
        params.orgId,
        params.channelUser,
        params.documents,
        params.campaignId,
        params.titleText,
      )
      const response = turnResult?.content ?? null
      this.logger.log(
        `[TRACE] processAndReply routeToAgent RETURNED: response_len=${response?.length ?? 0}`,
      )
      if (!response) {
        outcome = 'no_answer'
        throw new Error('no_answer')
      }
      if (!params.botToken) throw new Error('missing_bot_token')

      this.logger.log(`[TRACE] processAndReply SENDING_REPLY: len=${response.length}`)
      await this.sendSlackReply(params.botToken, params.channelId, response, params.threadTs)
      outcome = 'replied'
      this.logger.log(`[TRACE] processAndReply REPLY_SENT`)
      if (canReact) {
        const markedComplete = await this.slackApi.addReaction(
          params.botToken,
          params.channelId,
          params.messageTs!,
          'white_check_mark',
        )
        if (markedComplete) {
          await this.slackApi
            .removeReaction(params.botToken, params.channelId, params.messageTs!, 'eyes')
            .catch(() => {})
        }
      }
    } catch (err) {
      if (canReact) {
        await this.slackApi
          .removeReaction(params.botToken, params.channelId, params.messageTs!, 'eyes')
          .catch(() => {})
      }
      const msg = err instanceof Error ? err.message : String(err)
      outcomeError = msg
      this.logger.error(`Agent routing failed: ${msg}`)
      if (params.botToken && params.channelId) {
        const userMessage = this.userFacingSlackError(msg)
        await this.slackApi
          .postMessage(params.botToken, params.channelId, userMessage, params.threadTs)
          .catch((e) => this.logger.error(`Failed to post error feedback: ${e}`))
      }
    } finally {
      if (params.turn) {
        recordSlackPixelTurn({
          repo: this.slackRuntimeRepo,
          logger: this.logger,
          params,
          turn: params.turn,
          result: turnResult,
          startedAt,
          outcome,
          error: outcomeError,
        })
      }
    }
  }

  protected async routeToAgent(
    userId: string,
    agentKey: string,
    userMessage: string,
    slackTeamId: string,
    slackChannelId: string,
    slackThreadTs: string | undefined,
    accessToken: string,
    botToken?: string,
    messageTs?: string,
    orgId?: string | null,
    channelUser?: {
      platform_id: string
      username?: string
      display_name: string
      relationship_kind: 'internal'
      is_connection_owner: boolean
      personal_brain_access: boolean
      organization_wide_data_access: boolean
    },
    documents?: Array<{
      filename: string
      type: 'text' | 'image' | 'video'
      fileUrl: string
      mimeType?: string
      text?: string
    }>,
    campaignId?: string | null,
    titleText?: string,
  ): Promise<SlackAgentTurn | null> {
    this.logger.log(
      `[TRACE] routeToAgent START: userId=${userId} agentKey=${agentKey} team=${slackTeamId} channel=${slackChannelId}`,
    )
    const serviceSupabase = this.getServiceRoleClient()

    const conversation = await this.getOrCreateSlackConversation(
      serviceSupabase,
      userId,
      agentKey,
      slackTeamId,
      slackChannelId,
      slackThreadTs,
      orgId,
      titleText ?? userMessage,
    )
    const conversationId = conversation.id
    this.logger.log(`[TRACE] routeToAgent CONVERSATION: conversationId=${conversationId}`)
    void this.retitleSlackConversationIfNeeded(
      serviceSupabase,
      conversationId,
      userId,
      titleText ?? userMessage,
      conversation.title,
    ).catch((err) =>
      this.logger.warn(
        `[TRACE] routeToAgent RETITLE_FAILED: ${err instanceof Error ? err.message : String(err)}`,
      ),
    )

    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    const chatPayload = JSON.stringify({
      user_id: userId,
      conversation_id: conversationId,
      content: userMessage,
      source: 'slack',
      access_token: accessToken,
      org_id: orgId ?? null,
      ...(channelUser
        ? {
            channel_user: {
              ...channelUser,
              source_context: {
                slack_team_id: slackTeamId,
                slack_channel_id: slackChannelId,
                slack_thread_ts: slackThreadTs ?? messageTs ?? null,
                slack_message_ts: messageTs ?? null,
                source_excerpt: userMessage.slice(0, 500),
              },
            },
          }
        : {}),
      ...(documents && documents.length > 0 ? { documents } : {}),
      ...(campaignId ? { campaign_id: campaignId } : {}),
    })
    this.logger.log(`[TRACE] routeToAgent FETCH_START: payload_len=${chatPayload.length}`)
    const response = await this.userAgentApi.invoke(
      userId,
      '/api/channel-chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken,
        },
        body: chatPayload,
      },
      {
        logTag: `slack user=${userId} agent=${agentKey}`,
        timeoutMs: SLACK_AGENT_STREAM_TIMEOUT_MS,
        onMachineWakeStart: async () => {
          if (botToken) {
            await this.slackApi
              .postMessage(
                botToken,
                slackChannelId,
                MACHINE_WAKE_START_SLACK_MESSAGE,
                slackThreadTs,
              )
              .catch((err) => this.logger.error(`Failed to post wake status: ${err}`))
          }
        },
      },
    )
    this.logger.log(`[TRACE] routeToAgent FETCH_OK: status=${response.status}`)

    if (!response.ok) {
      let body401: string | null = null
      if (response.status === 401) {
        try {
          body401 = await response.clone().text()
        } catch {
          /* ignore */
        }
      }
      const errMsg = `Agent API returned ${response.status}`
      if (response.status === 401 && body401?.includes('Token expired')) {
        throw new Error(`${errMsg} (token_expired)`)
      }
      throw new Error(errMsg)
    }
    const turn = await this.collectSseTurn(response)
    return { content: turn.content, toolEvents: turn.toolEvents, conversationId }
  }

  protected isCreditsExhaustedMessage(message: string): boolean {
    const normalized = message.toLowerCase()
    return (
      normalized.includes('credits_exhausted') || normalized.includes('agent request failed (402)')
    )
  }

  protected userFacingSlackError(message: string): string {
    if (this.isCreditsExhaustedMessage(message)) return CREDITS_EXHAUSTED_SLACK_MESSAGE
    if (message.includes('token_expired')) {
      return 'Your Slack connection expired. Reconnect Slack in Settings to continue.'
    }
    if (
      message.includes('UserMachineUnreachableError') ||
      message.includes('User machine failed to start') ||
      message.includes('User machine unavailable (circuit open)') ||
      message.includes('circuit open') ||
      message.includes('Machine start timeout')
    ) {
      return MACHINE_UNREACHABLE_SLACK_MESSAGE
    }
    if (message.includes('Machine not ready')) return MACHINE_NOT_READY_SLACK_MESSAGE
    return GENERIC_SLACK_AGENT_ERROR_MESSAGE
  }

  protected async sendWelcomeDm(botToken: string, slackUserId?: string): Promise<void> {
    if (!slackUserId) return

    const dmChannelId = await this.slackApi.openDmChannel(botToken, slackUserId)
    if (!dmChannelId) return

    const blocks: SlackBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "Hey 👋 I'm your new bot.\n\nI'm live in your Slack now.\n\nI'm not here to spit generic answers.\nI'm here to move work: campaigns, copy, funnels, the stuff that actually ships.",
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'I still have access to all your agents. I can *ask* one of them a question, *delegate* a full task so they run it with their tools, or *brainstorm* with a few of them when you want real angles. Same as in the app.',
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "*Three ways we work:*\n\n💬 *DM me here,* same as the app. Drop a task, a link, a file, a Loom. The messier the context, the sharper I get.\n\n📣 *@ me in a channel.* I'll jump in with thread context when you need the room, not just your DM.\n\n📌 *Map a channel in the ROAS App* if you want me on standby without the @ every time.",
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "Send me *one real thing* you want off your plate this week. I'll take it from there. 🚀",
        },
      },
    ]

    const fallback =
      "Hey, I'm your new bot. I'm live in your Slack. I move real work and I have your agents (ask, delegate, brainstorm) like the app. DM me, @ me in a channel, or map a channel. Send one thing to ship this week."

    await this.slackApi.postBlockMessage(botToken, dmChannelId, fallback, blocks)
  }
}
