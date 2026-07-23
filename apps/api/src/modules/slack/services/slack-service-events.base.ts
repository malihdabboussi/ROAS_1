import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlackBlock, SlackEventEnvelope } from '../types/slack.types'
import { SlackConversationBase } from './slack-service-conversation.base'
import {
  CREDITS_EXHAUSTED_SLACK_MESSAGE,
  GENERIC_SLACK_AGENT_ERROR_MESSAGE,
  MACHINE_NOT_READY_SLACK_MESSAGE,
  MACHINE_UNREACHABLE_SLACK_MESSAGE,
  MACHINE_WAKE_START_SLACK_MESSAGE,
  SLACK_AGENT_STREAM_TIMEOUT_MS,
} from './slack-service.shared'

export abstract class SlackEventsBase extends SlackConversationBase {
  protected async processEventAsync(envelope: SlackEventEnvelope): Promise<void> {
    const event = envelope.event
    const teamId = envelope.team_id
    if (!teamId || !event) {
      this.logger.warn(
        `[TRACE] processEventAsync EXIT: teamId=${teamId ?? 'missing'} event=${event ? 'present' : 'missing'}`,
      )
      return
    }

    if (event.subtype === 'bot_message') {
      this.logger.warn(`[TRACE] processEventAsync EXIT: subtype=bot_message`)
      return
    }
    if (event.bot_id) {
      this.logger.warn(`[TRACE] processEventAsync EXIT: bot_id=${event.bot_id}`)
      return
    }

    this.logger.log(
      `[TRACE] processEventAsync PASS: team=${teamId} type=${event.type} user=${event.user} channel=${event.channel} channel_type=${event.channel_type} subtype=${event.subtype ?? 'none'} text_len=${(event.text ?? '').length} files=${event.files?.length ?? 0}`,
    )

    if (event.type === 'app_mention') {
      await this.handleAppMentionEvent(teamId, event)
    } else if (event.type === 'message') {
      await this.handleMessageEvent(teamId, event)
    } else if (event.type === 'reaction_added') {
      await this.handleReactionAddedEvent(teamId, event)
    } else {
      this.logger.warn(`[TRACE] processEventAsync EXIT: unhandled event.type=${event.type}`)
    }
  }

  /** Override in SlackService to route meeting follow-up confirms (emoji → approve). */
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
    if (!text && !hasFiles) {
      this.logger.warn(
        `[TRACE] handleMessageEvent EXIT: no text and no files, channel=${channelId}`,
      )
      return
    }

    this.logger.log(
      `[TRACE] handleMessageEvent START: team=${teamId} channel=${channelId} channel_type=${event.channel_type ?? 'unknown'} text_len=${text.length} hasFiles=${hasFiles}`,
    )

    const serviceSupabase = this.getServiceRoleClient()
    const channel = await this.slackRepo.findActiveChannelByTeamAndChannel(
      serviceSupabase,
      teamId,
      channelId,
    )

    let channelOrgId: string | null | undefined = channel?.org_id

    this.logger.log(
      `[TRACE] handleMessageEvent channel_lookup: found=${!!channel} channel_id=${channel?.id ?? 'none'}`,
    )

    let botToken: string
    let userId: string
    let agentKey: string
    let accessToken: string
    let ownerSlackUserId: string | null

    if (channel) {
      const pc = channel.provider_config as Record<string, unknown>
      botToken = typeof pc.bot_token === 'string' ? pc.bot_token : ''
      ownerSlackUserId = typeof pc.authed_user_id === 'string' ? pc.authed_user_id : null
      const botUserId = typeof pc.bot_user_id === 'string' ? pc.bot_user_id : null
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
      isDirectMessage: event.channel_type === 'im' || channelId.startsWith('D'),
      threadTs: event.thread_ts ?? event.ts,
    })
    if (!principal) return
    accessToken = await this.userSessionMint.mintAccessToken(userId)

    let fullMessage = text
    const documents = await this.resolveInboundSlackFiles(
      botToken,
      userId,
      channelOrgId ?? null,
      event.files,
    )
    if (hasFiles && documents.length === 0) {
      const fileContext = this.buildFileContext(event.files!)
      fullMessage = fullMessage ? `${fullMessage}\n\n${fileContext}` : fileContext
    }
    if (!fullMessage && documents.length > 0) {
      fullMessage = '[User sent a file]'
    }

    this.logger.log(
      `[TRACE] handleMessageEvent CALLING_processAndReply: userId=${userId} slackUser=${principal.sender.slackUserId} agentKey=${agentKey} message_len=${fullMessage.length} documents=${documents.length}`,
    )

    await this.processAndReply({
      userId,
      agentKey,
      botToken,
      channelId,
      message: fullMessage,
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
      },
      orgId: channelOrgId ?? null,
      documents: documents.length > 0 ? documents : undefined,
    })
  }

  protected async handleAppMentionEvent(
    teamId: string,
    event: NonNullable<SlackEventEnvelope['event']>,
  ): Promise<void> {
    const channelId = event.channel
    if (!channelId) return

    let text = event.text ?? ''
    text = text.replace(/<@[A-Z0-9]+>\s*/g, '').trim()
    const hasFiles = Array.isArray(event.files) && event.files.length > 0
    if (!text && !hasFiles) return

    const serviceSupabase = this.getServiceRoleClient()
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
      isDirectMessage: event.channel_type === 'im' || channelId.startsWith('D'),
      threadTs: event.thread_ts ?? event.ts,
    })
    if (!principal) return

    const documents = await this.resolveInboundSlackFiles(
      fallback.botToken,
      fallback.userId,
      fallback.orgId,
      event.files,
    )

    const channelContext = await this.buildChannelContext(
      serviceSupabase,
      fallback.userId,
      fallback.botToken,
      channelId,
    ).catch((err) => {
      this.logger.warn(`Failed to build channel context: ${err}`)
      return ''
    })

    const mentionText = text || (documents.length > 0 ? '[User sent a file]' : '')
    const messageWithContext = channelContext
      ? `${channelContext}\n\n[You were mentioned with]: ${mentionText}`
      : mentionText

    await this.processAndReply({
      userId: fallback.userId,
      agentKey: fallback.agentKey,
      botToken: fallback.botToken,
      channelId,
      message: messageWithContext,
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
      },
      orgId: fallback.orgId,
      documents: documents.length > 0 ? documents : undefined,
    })
  }

  protected async resolveFallbackRouting(
    serviceSupabase: SupabaseClient,
    teamId: string,
  ): Promise<{
    userId: string
    agentKey: string
    botToken: string
    accessToken: string
    orgId: string | null
    ownerSlackUserId: string | null
  } | null> {
    const channel = await this.slackRepo.findFallbackChannelByTeam(serviceSupabase, teamId)
    if (!channel) {
      this.logger.warn(`[TRACE] resolveFallbackRouting EXIT: no active channel for team=${teamId}`)
      return null
    }

    const providerConfig = channel.provider_config as Record<string, unknown>
    const botToken = typeof providerConfig.bot_token === 'string' ? providerConfig.bot_token : ''
    if (!botToken) {
      this.logger.warn(
        `[TRACE] resolveFallbackRouting EXIT: fallback channel ${channel.id} missing bot token`,
      )
      return null
    }

    this.logger.log(
      `[TRACE] resolveFallbackRouting: channel=${channel.id} userId=${channel.user_id} agentKey=${channel.agent_key} orgId=${channel.org_id ?? 'personal'}`,
    )
    const accessToken = await this.userSessionMint.mintAccessToken(channel.user_id)
    this.logger.log(
      `[TRACE] resolveFallbackRouting OK: minted accessToken_len=${accessToken.length}`,
    )
    return {
      userId: channel.user_id,
      agentKey: channel.agent_key,
      botToken,
      accessToken,
      orgId: channel.org_id ?? null,
      ownerSlackUserId:
        typeof providerConfig.authed_user_id === 'string' ? providerConfig.authed_user_id : null,
    }
  }

  // ---------------------------------------------------------------------------
  // Agent routing + reply

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
    }
    documents?: Array<{
      filename: string
      type: 'text' | 'image' | 'video'
      fileUrl: string
      mimeType?: string
      text?: string
    }>
  }): Promise<void> {
    this.logger.log(
      `[TRACE] processAndReply START: userId=${params.userId} agentKey=${params.agentKey} channel=${params.channelId} message_len=${params.message.length}`,
    )
    if (params.botToken && params.channelId && params.messageTs) {
      this.slackApi
        .addReaction(params.botToken, params.channelId, params.messageTs, 'eyes')
        .catch(() => {})
    }
    try {
      const response = await this.routeToAgent(
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
      )
      this.logger.log(
        `[TRACE] processAndReply routeToAgent RETURNED: response_len=${response?.length ?? 0}`,
      )
      if (params.botToken && params.channelId && params.messageTs) {
        this.slackApi
          .removeReaction(params.botToken, params.channelId, params.messageTs, 'eyes')
          .catch(() => {})
      }
      if (response && params.botToken) {
        this.logger.log(`[TRACE] processAndReply SENDING_REPLY: len=${response.length}`)
        await this.sendSlackReply(params.botToken, params.channelId, response, params.threadTs)
        this.logger.log(`[TRACE] processAndReply REPLY_SENT`)
      } else {
        this.logger.warn(
          `[TRACE] processAndReply NO_REPLY: response=${response ? 'truthy' : 'null/empty'} botToken=${params.botToken ? 'present' : 'missing'}`,
        )
      }
    } catch (err) {
      if (params.botToken && params.channelId && params.messageTs) {
        this.slackApi
          .removeReaction(params.botToken, params.channelId, params.messageTs, 'eyes')
          .catch(() => {})
      }
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Agent routing failed: ${msg}`)
      if (params.botToken && params.channelId) {
        const userMessage = this.userFacingSlackError(msg)
        await this.slackApi
          .postMessage(params.botToken, params.channelId, userMessage, params.threadTs)
          .catch((e) => this.logger.error(`Failed to post error feedback: ${e}`))
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
    },
    documents?: Array<{
      filename: string
      type: 'text' | 'image' | 'video'
      fileUrl: string
      mimeType?: string
      text?: string
    }>,
  ): Promise<string | null> {
    this.logger.log(
      `[TRACE] routeToAgent START: userId=${userId} agentKey=${agentKey} team=${slackTeamId} channel=${slackChannelId}`,
    )
    const serviceSupabase = this.getServiceRoleClient()

    const conversationId = await this.getOrCreateSlackConversation(
      serviceSupabase,
      userId,
      agentKey,
      slackTeamId,
      slackChannelId,
      slackThreadTs,
      orgId,
    )
    this.logger.log(`[TRACE] routeToAgent CONVERSATION: conversationId=${conversationId}`)

    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    const chatPayload = JSON.stringify({
      user_id: userId,
      conversation_id: conversationId,
      content: userMessage,
      source: 'slack',
      access_token: accessToken,
      org_id: orgId ?? null,
      ...(channelUser ? { channel_user: channelUser } : {}),
      ...(documents && documents.length > 0 ? { documents } : {}),
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
    const result = await this.collectSseResponse(response)
    return result
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

  // ---------------------------------------------------------------------------
  // Welcome DM
  // ---------------------------------------------------------------------------

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
