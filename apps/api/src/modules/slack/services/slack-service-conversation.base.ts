import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SlackHistoryMessage,
  SlackMessageAttachment,
  SlackResolvedSender,
  SlackWorkspaceChannel,
} from '../types/slack.types'
import { parseSlackForwardedMessage } from './slack-forwarded-message-context'
import { SlackMediaBase } from './slack-service-media.base'

export abstract class SlackConversationBase extends SlackMediaBase {
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

  protected async buildSlackThreadReplyContext(
    botToken: string,
    channelId: string,
    threadTs: string,
    currentMessageTs?: string,
  ): Promise<string> {
    const messages = await this.slackApi.conversationsRepliesAll(botToken, channelId, threadTs)
    const preceding = messages
      .filter((message) => {
        const text = String(message.text ?? '').trim()
        return text.length > 0 && message.ts !== currentMessageTs
      })
      .slice(-12)
    if (preceding.length === 0) return ''

    const lines = preceding.map((message) => {
      const sender = message.bot_id ? 'Pixel' : message.user ? `<@${message.user}>` : 'Unknown'
      return `${sender}: ${String(message.text ?? '').trim()}`
    })
    const context = lines.join('\n')
    return context.length > 12_000 ? context.slice(-12_000) : context
  }

  protected async buildForwardedMessageContext(
    supabase: SupabaseClient,
    userId: string,
    botToken: string,
    currentChannelId: string,
    attachments: SlackMessageAttachment[] | undefined,
    identity?: { orgId?: string | null; slackTeamId?: string | null },
  ): Promise<{ context: string; campaignId: string | null }> {
    const forwarded = parseSlackForwardedMessage(attachments)
    if (!forwarded) return { context: '', campaignId: null }

    const sections = [forwarded.context]
    let campaignId: string | null = null
    let sourceChannelId = forwarded.channelId
    if (!sourceChannelId && forwarded.channelName && identity?.orgId && identity.slackTeamId) {
      // Thread-reply unfurls often carry only a footer name (N1 "Andy or Krista?" case).
      sourceChannelId = await this.resolveSlackChannelIdByName(supabase, {
        orgId: identity.orgId,
        slackTeamId: identity.slackTeamId,
        channelName: forwarded.channelName,
        botToken,
      }).catch(() => null)
    }

    if (sourceChannelId && sourceChannelId !== currentChannelId) {
      if (identity?.orgId && identity.slackTeamId) {
        // Quoted channel decides the client: stamp + Client Context Bundle for the source channel.
        const forwardedIdentity = await this.resolveSlackAskContext(supabase, {
          orgId: identity.orgId,
          slackTeamId: identity.slackTeamId,
          channelId: sourceChannelId,
          botToken,
          channelNameHint: forwarded.channelName,
        }).catch(() => null)
        if (forwardedIdentity?.text) {
          sections.push(
            `[Quoted message identity]\nThe forwarded message below belongs to the channel above; inherit its client. Do not ask which client.\n\n${forwardedIdentity.text}`,
          )
        }
        campaignId = forwardedIdentity?.stampCampaignId ?? null
      }
      const threadTs = forwarded.threadTs
      if (threadTs) {
        const threadContext = await this.buildSlackThreadReplyContext(
          botToken,
          sourceChannelId,
          threadTs,
          '',
        ).catch(() => '')
        if (threadContext) sections.push(`[Forwarded thread context]\n${threadContext}`)
      }
    }

    if (!sourceChannelId || sourceChannelId === currentChannelId) {
      return { context: sections.join('\n\n'), campaignId }
    }

    const channelContext = await this.buildChannelContext(
      supabase,
      userId,
      botToken,
      sourceChannelId,
      undefined,
    ).catch((error) => {
      this.logger.warn(
        `Failed to load forwarded Slack channel ${sourceChannelId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return { context: '', stampCampaignId: null, bundleCampaignId: null }
    })

    if (channelContext.context) sections.push(channelContext.context)
    return { context: sections.join('\n\n'), campaignId }
  }

  /** Name → id for channels the org observes; falls back to the bot's conversation list. */
  protected async resolveSlackChannelIdByName(
    supabase: SupabaseClient,
    input: { orgId: string; slackTeamId: string; channelName: string; botToken?: string },
  ): Promise<string | null> {
    const name = input.channelName.replace(/^#/, '').trim().toLowerCase()
    if (!name) return null
    const { data } = await supabase
      .from('slack_observation_channels')
      .select('channel_id')
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .eq('channel_name', name)
      .limit(1)
      .maybeSingle()
    if (data?.channel_id) return String(data.channel_id)
    if (!input.botToken) return null
    const channels: SlackWorkspaceChannel[] = await this.slackApi
      .listConversations(input.botToken)
      .catch(() => [])
    return channels.find((channel) => channel.name?.toLowerCase() === name)?.id ?? null
  }

  async pushSlackAwarenessPoint(userId: string, agentKey: string, content: string) {
    const serviceSupabase = this.getServiceRoleClient()
    const channel = await this.slackRepo.findChannelByAgentKey(serviceSupabase, userId, agentKey)
    if (!channel?.is_active) return { ok: false, reason: 'channel_not_found' }

    const providerConfig = channel.provider_config as Record<string, unknown>
    const botToken = typeof providerConfig.bot_token === 'string' ? providerConfig.bot_token : ''
    const channelId = typeof providerConfig.channel_id === 'string' ? providerConfig.channel_id : ''
    if (!botToken || !channelId) return { ok: false, reason: 'missing_bot_or_channel' }

    await this.slackApi.postMessage(botToken, channelId, content)
    return { ok: true }
  }

  async pullChannelHistorySince(
    botToken: string,
    channelId: string,
    oldestTs: string,
  ): Promise<SlackHistoryMessage[]> {
    return this.slackApi.getChannelHistorySince(botToken, channelId, oldestTs)
  }

  async expandThreads(
    botToken: string,
    channelId: string,
    messages: SlackHistoryMessage[],
  ): Promise<SlackHistoryMessage[][]> {
    const threadRoots = new Map<string, SlackHistoryMessage>()
    for (const message of messages) {
      const ts = message.ts
      if (!ts || message.bot_id || !message.text) continue
      const rootTs = message.thread_ts ?? ts
      if (!threadRoots.has(rootTs)) threadRoots.set(rootTs, message)
    }

    const threads: SlackHistoryMessage[][] = []
    for (const [rootTs, root] of threadRoots.entries()) {
      if ((root.reply_count ?? 0) > 0 || root.thread_ts) {
        const replies = await this.slackApi.conversationsRepliesAll(botToken, channelId, rootTs)
        threads.push(replies.filter((message) => !message.bot_id && !!message.text))
      } else {
        threads.push([root])
      }
    }
    return threads
  }

  formatThreadsAsBlob(
    channelName: string,
    threads: SlackHistoryMessage[][],
    senderResolutionMap: Map<string, SlackResolvedSender>,
  ): string {
    const sections: string[] = []
    for (const thread of threads) {
      const usefulMessages = thread.filter((message) => (message.text ?? '').trim().length > 0)
      const totalChars = usefulMessages.reduce(
        (sum, message) => sum + (message.text ?? '').length,
        0,
      )
      if (usefulMessages.length < 2 && totalChars < 200) continue
      const startedAt = this.formatSlackTimestamp(usefulMessages[0]?.ts)
      sections.push(`### Thread in #${channelName} (started ${startedAt})`)
      for (const message of usefulMessages) {
        const sender = message.user ? senderResolutionMap.get(message.user) : undefined
        sections.push(
          `${sender?.displayName ?? message.user ?? 'Unknown'} ${this.senderAnnotation(sender)}: ${message.text ?? ''}`,
        )
      }
      sections.push('---')
    }
    return sections.join('\n')
  }

  protected senderAnnotation(sender: SlackResolvedSender | undefined): string {
    if (!sender) return '[role=unknown]'
    const parts: string[] = []
    if (sender.contactId) parts.push(`contact_id=${sender.contactId}`)
    if (sender.vibeyUserId) parts.push(`vibey_user=${sender.vibeyUserId}`)
    parts.push(`role=${sender.contactRole ?? 'unknown'}`)
    return `[${parts.join(', ')}]`
  }

  protected formatSlackTimestamp(ts: string | undefined): string {
    if (!ts) return 'unknown'
    const seconds = Number(ts.split('.')[0])
    if (!Number.isFinite(seconds)) return ts
    return new Date(seconds * 1000).toISOString()
  }

  // ---------------------------------------------------------------------------
  // SSE response collector
  // ---------------------------------------------------------------------------

  protected async collectSseResponse(response: Response): Promise<string | null> {
    const reader = response.body?.getReader()
    if (!reader) return null

    const decoder = new TextDecoder()
    let fullContent = ''
    let buffer = ''

    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data || data === '[DONE]') continue
          let event: Record<string, unknown>
          try {
            event = JSON.parse(data) as Record<string, unknown>
          } catch {
            continue
          }
          if (event.type === 'content_delta' && typeof event.content === 'string') {
            fullContent += event.content
          } else if (event.type === 'error') {
            const detail =
              typeof event.message === 'string'
                ? event.message
                : typeof event.code === 'string'
                  ? event.code
                  : 'agent_error'
            throw new Error(detail)
          } else if (
            event.type === 'status' &&
            event.status === 'failed' &&
            typeof event.message === 'string'
          ) {
            throw new Error(event.message)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return fullContent || null
  }

  // ---------------------------------------------------------------------------
  // Conversation management
  // ---------------------------------------------------------------------------

  protected async getOrCreateSlackConversation(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    slackTeamId: string,
    slackChannelId: string,
    slackThreadTs?: string,
    orgId?: string | null,
    firstMessage?: string,
  ): Promise<{ id: string; title: string | null }> {
    const existing = await this.slackRuntimeRepo.findSlackConversation(supabase, {
      userId,
      agentKey,
      slackTeamId,
      slackChannelId,
      slackThreadTs,
      orgId,
    })
    if (existing) {
      return { id: existing.id, title: existing.title ?? null }
    }

    const metadata: Record<string, unknown> = {
      source: 'slack',
      slack_team_id: slackTeamId,
      slack_channel_id: slackChannelId,
    }
    if (slackThreadTs) metadata.slack_thread_ts = slackThreadTs

    const { titleFromFirstUserMessage } =
      await import('../../conversations/utils/conversation-title.util')
    const seedTitle = titleFromFirstUserMessage(firstMessage, 48) || null

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      title: seedTitle,
      agent_id: agentKey,
      metadata,
      org_id: orgId ?? null,
    }
    const id = await this.slackRuntimeRepo.createSlackConversation(supabase, insertPayload)
    return { id, title: seedTitle }
  }

  /** Nest ModuleRef when available — enables Gemini title suggestion from SlackService. */
  protected titleModuleRef: import('@nestjs/core').ModuleRef | null = null

  protected async retitleSlackConversationIfNeeded(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    firstMessage: string,
    currentTitle: string | null,
  ): Promise<void> {
    const { retitleSlackConversationIfNeeded } = await import('./slack-conversation-title')
    await retitleSlackConversationIfNeeded({
      supabase,
      conversationId,
      userId,
      firstMessage,
      currentTitle,
      slackRuntimeRepo: this.slackRuntimeRepo,
      moduleRef: this.titleModuleRef,
    })
  }
}
