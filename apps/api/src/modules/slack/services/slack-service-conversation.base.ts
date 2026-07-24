import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlackHistoryMessage, SlackResolvedSender } from '../types/slack.types'
import { SlackMediaBase } from './slack-service-media.base'

export abstract class SlackConversationBase extends SlackMediaBase {
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

  protected async getDefaultCampaignIdForUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<string | null> {
    return (
      (await this.slackRuntimeRepo.findRecentCampaignIdForUser(supabase, userId)) ??
      (await this.slackRuntimeRepo.findGeneralCampaignIdForUser(supabase, userId))
    )
  }

  protected async getOrCreateSlackConversation(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    slackTeamId: string,
    slackChannelId: string,
    slackThreadTs?: string,
    orgId?: string | null,
  ): Promise<string> {
    const existing = await this.slackRuntimeRepo.findSlackConversation(supabase, {
      userId,
      agentKey,
      slackTeamId,
      slackChannelId,
      slackThreadTs,
      orgId,
    })
    if (existing) {
      if (!existing.campaign_id) {
        const campaignId = await this.getDefaultCampaignIdForUser(supabase, userId)
        if (campaignId) {
          await this.slackRuntimeRepo.updateConversationCampaign(supabase, existing.id, campaignId)
        }
      }
      return existing.id
    }

    const campaignId = await this.getDefaultCampaignIdForUser(supabase, userId)
    const metadata: Record<string, unknown> = {
      source: 'slack',
      slack_team_id: slackTeamId,
      slack_channel_id: slackChannelId,
    }
    if (slackThreadTs) metadata.slack_thread_ts = slackThreadTs

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      title: 'Slack Chat',
      agent_id: agentKey,
      metadata,
      org_id: orgId ?? null,
    }
    if (campaignId) insertPayload.campaign_id = campaignId

    return this.slackRuntimeRepo.createSlackConversation(supabase, insertPayload)
  }
}
