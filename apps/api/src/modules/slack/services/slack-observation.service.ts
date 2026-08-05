import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackObservationRepository } from '../repositories/slack-observation.repository'
import type { SlackObservationEventInput } from '../types/slack-observation.types'
import type { SlackEventEnvelope, SlackHistoryMessage } from '../types/slack.types'
import { normalizeSlackTimestamp } from '../utils/normalize-slack-timestamp'

type SlackMessageEvent = NonNullable<SlackEventEnvelope['event']>
const RECONCILIATION_INTERVAL_MS = 60 * 60 * 1000

@Injectable()
export class SlackObservationService {
  constructor(
    private readonly repository: SlackObservationRepository,
    private readonly slackApi: SlackApiIntegration,
  ) {}

  async recordWebhookEvent(input: {
    supabase: SupabaseClient
    slackTeamId: string
    event: SlackMessageEvent
  }): Promise<void> {
    if (input.event.type !== 'message' && input.event.type !== 'app_mention') return
    const channelId = String(input.event.channel ?? '').trim()
    const messageTs = String(input.event.ts ?? '').trim()
    if (!channelId || !messageTs) return
    const workspace = await this.repository.findWorkspaceBySlackTeamId(
      input.supabase,
      input.slackTeamId,
    )
    if (!workspace) return
    const event = this.normalizeEvent({
      orgId: workspace.org_id,
      slackTeamId: input.slackTeamId,
      channelId,
      channelName: null,
      message: input.event,
      source: 'webhook',
    })
    if (!event) return
    await this.repository.upsertEvents(input.supabase, [event])
  }

  async reconcile(input: {
    supabase: SupabaseClient
    orgId: string
    slackTeamId: string
    botToken: string
    channelIds: string[]
    initialLookbackMinutes: number
  }): Promise<{
    channelsListed: number
    channelsJoined: number
    channelsExcluded: number
    channelsInaccessible: number
    channelsReconciled: number
    historyRequests: number
    threadRequests: number
    eventsStored: number
    duplicatesSkipped: number
  }> {
    const available = await this.slackApi.listConversations(input.botToken)
    await this.repository.upsertChannels(
      input.supabase,
      available.map((channel) => ({
        orgId: input.orgId,
        slackTeamId: input.slackTeamId,
        channelId: channel.id,
        channelName: channel.name,
        isPrivate: Boolean(channel.is_private),
        isMember: channel.is_member !== false,
      })),
    )
    const settings = await this.repository.listChannelSettings(input.supabase, {
      orgId: input.orgId,
      slackTeamId: input.slackTeamId,
    })
    const settingsByChannel = new Map(settings.map((setting) => [setting.channel_id, setting]))
    let channelsJoined = 0
    let channelsInaccessible = 0
    for (const channel of available) {
      const setting = settingsByChannel.get(channel.id)
      if (setting?.is_excluded || channel.is_im || channel.is_member !== false) {
        continue
      }
      if (channel.is_private) {
        channelsInaccessible += 1
        await this.repository.recordChannelJoinOutcome(input.supabase, {
          orgId: input.orgId,
          slackTeamId: input.slackTeamId,
          channelId: channel.id,
          joined: false,
          error: 'Private channels require an invitation in Slack',
        })
        continue
      }
      try {
        await this.slackApi.joinConversation(input.botToken, channel.id)
        channel.is_member = true
        channelsJoined += 1
        await this.repository.recordChannelJoinOutcome(input.supabase, {
          orgId: input.orgId,
          slackTeamId: input.slackTeamId,
          channelId: channel.id,
          joined: true,
        })
      } catch (cause) {
        channelsInaccessible += 1
        await this.repository.recordChannelJoinOutcome(input.supabase, {
          orgId: input.orgId,
          slackTeamId: input.slackTeamId,
          channelId: channel.id,
          joined: false,
          error: cause instanceof Error ? cause.message : 'Slack channel could not be joined',
        })
      }
    }
    const selectedChannels = available.filter(
      (channel) =>
        channel.is_member !== false &&
        !settingsByChannel.get(channel.id)?.is_excluded &&
        (input.channelIds.length === 0 || input.channelIds.includes(channel.id)),
    )
    const cursorRows = await this.repository.listChannelCursors(input.supabase, {
      orgId: input.orgId,
      slackTeamId: input.slackTeamId,
    })
    const cursors = new Map(cursorRows.map((row) => [row.channel_id, row.last_message_ts]))
    const lastReconciledAt = new Map(
      cursorRows.map((row) => [row.channel_id, row.last_reconciled_at]),
    )
    const reconcileBefore = Date.now() - RECONCILIATION_INTERVAL_MS
    const channels = selectedChannels.filter((channel) => {
      const value = lastReconciledAt.get(channel.id)
      if (!value) return true
      const timestamp = new Date(value).getTime()
      return !Number.isFinite(timestamp) || timestamp <= reconcileBefore
    })
    const initialOldestTs = String((Date.now() - input.initialLookbackMinutes * 60_000) / 1000)
    let historyRequests = 0
    let threadRequests = 0
    let eventsStored = 0
    let duplicatesSkipped = 0

    for (const channel of channels) {
      const oldestTs = cursors.get(channel.id) || initialOldestTs
      const roots = await this.slackApi.getChannelHistorySince(input.botToken, channel.id, oldestTs)
      historyRequests += 1
      const messages = new Map<string, SlackHistoryMessage>()
      for (const root of roots) {
        if (root.ts) messages.set(root.ts, root)
        if (Number(root.reply_count ?? 0) <= 0 || !root.ts) continue
        const replies = await this.slackApi.conversationsRepliesAll(
          input.botToken,
          channel.id,
          root.ts,
        )
        threadRequests += 1
        for (const reply of replies) if (reply.ts) messages.set(reply.ts, reply)
      }
      const normalized = [...messages.values()]
        .map((message) =>
          this.normalizeEvent({
            orgId: input.orgId,
            slackTeamId: input.slackTeamId,
            channelId: channel.id,
            channelName: channel.name,
            message,
            source: 'reconciliation',
          }),
        )
        .filter((event): event is SlackObservationEventInput => Boolean(event))
      const stored = await this.repository.upsertEvents(input.supabase, normalized)
      eventsStored += stored.inserted
      duplicatesSkipped += stored.duplicates
      const latestTs = normalized.reduce(
        (latest, event) => (Number(event.messageTs) > Number(latest) ? event.messageTs : latest),
        oldestTs,
      )
      if (latestTs !== oldestTs) {
        await this.repository.advanceChannelCursor(input.supabase, {
          orgId: input.orgId,
          slackTeamId: input.slackTeamId,
          channelId: channel.id,
          lastMessageTs: latestTs,
        })
      } else {
        await this.repository.markChannelReconciled(input.supabase, {
          orgId: input.orgId,
          slackTeamId: input.slackTeamId,
          channelId: channel.id,
        })
      }
    }

    return {
      channelsListed: available.length,
      channelsJoined,
      channelsExcluded: settings.filter((setting) => setting.is_excluded).length,
      channelsInaccessible,
      channelsReconciled: channels.length,
      historyRequests,
      threadRequests,
      eventsStored,
      duplicatesSkipped,
    }
  }

  async loadRecentEvents(input: {
    supabase: SupabaseClient
    orgId: string
    slackTeamId: string
    lookbackMinutes: number
    channelIds: string[]
    senderSlackUserIds: string[]
    limit?: number
  }) {
    const oldestTs = String((Date.now() - input.lookbackMinutes * 60_000) / 1000)
    return this.repository.listEventsSince(input.supabase, {
      orgId: input.orgId,
      slackTeamId: input.slackTeamId,
      oldestTs,
      channelIds: input.channelIds.length > 0 ? input.channelIds : undefined,
      senderSlackUserIds:
        input.senderSlackUserIds.length > 0 ? input.senderSlackUserIds : undefined,
      limit: input.limit ?? 2000,
    })
  }

  async loadPendingEvents(input: {
    supabase: SupabaseClient
    orgId: string
    slackTeamId: string
    consumerKey: string
    initialLookbackMinutes: number
    channelIds: string[]
    senderSlackUserIds: string[]
    limit?: number
  }) {
    const cursor = await this.repository.getConsumerCursor(input.supabase, input)
    // The ledger is the durable handoff between Slack capture and analysis. A new consumer must
    // start at the beginning of the stored ledger so provider outages cannot strand events after
    // a moving lookback window expires. The limit keeps each recovery batch bounded; advancing the
    // consumer cursor lets subsequent runs drain the remainder incrementally.
    const oldestTs = cursor ?? '0'
    const events = await this.repository.listEventsSince(input.supabase, {
      orgId: input.orgId,
      slackTeamId: input.slackTeamId,
      oldestTs,
      channelIds: input.channelIds.length > 0 ? input.channelIds : undefined,
      senderSlackUserIds:
        input.senderSlackUserIds.length > 0 ? input.senderSlackUserIds : undefined,
      limit: input.limit ?? 2000,
    })
    return { cursor, events }
  }

  async advanceConsumer(input: {
    supabase: SupabaseClient
    orgId: string
    slackTeamId: string
    consumerKey: string
    lastMessageTs: string
  }): Promise<void> {
    await this.repository.advanceConsumerCursor(input.supabase, input)
  }

  async backfillChannelPeriod(input: {
    supabase: SupabaseClient
    orgId: string
    slackTeamId: string
    botToken: string
    channelId: string
    channelName: string
    periodStartTs: string
    periodEndTs: string
  }): Promise<{ historyRequests: number; threadRequests: number; eventsStored: number }> {
    const periodStartTs = normalizeSlackTimestamp(input.periodStartTs)
    const periodEndTs = normalizeSlackTimestamp(input.periodEndTs)
    const roots = await this.slackApi.getChannelHistorySince(
      input.botToken,
      input.channelId,
      periodStartTs,
    )
    const messages = new Map<string, SlackHistoryMessage>()
    let threadRequests = 0
    for (const root of roots) {
      if (root.ts && Number(root.ts) <= Number(periodEndTs)) messages.set(root.ts, root)
      if (Number(root.reply_count ?? 0) <= 0 || !root.ts) continue
      const replies = await this.slackApi.conversationsRepliesAll(
        input.botToken,
        input.channelId,
        root.ts,
      )
      threadRequests += 1
      for (const reply of replies) {
        if (reply.ts && Number(reply.ts) <= Number(periodEndTs)) {
          messages.set(reply.ts, reply)
        }
      }
    }
    const events = [...messages.values()]
      .map((message) =>
        this.normalizeEvent({
          orgId: input.orgId,
          slackTeamId: input.slackTeamId,
          channelId: input.channelId,
          channelName: input.channelName,
          message,
          source: 'backfill',
        }),
      )
      .filter((event): event is SlackObservationEventInput => Boolean(event))
    const stored = await this.repository.upsertEvents(input.supabase, events)
    await this.repository.markArchiveBackfilled(input.supabase, {
      orgId: input.orgId,
      slackTeamId: input.slackTeamId,
      channelId: input.channelId,
      oldestTs: periodStartTs,
    })
    return { historyRequests: 1, threadRequests, eventsStored: stored.inserted }
  }

  async loadPeriodThreads(input: {
    supabase: SupabaseClient
    orgId: string
    slackTeamId: string
    channelId: string
    periodStartTs: string
    periodEndTs: string
  }): Promise<SlackHistoryMessage[][]> {
    const events = await this.repository.listEventsBetween(input.supabase, {
      ...input,
      periodStartTs: normalizeSlackTimestamp(input.periodStartTs),
      periodEndTs: normalizeSlackTimestamp(input.periodEndTs),
    })
    const threads = new Map<string, SlackHistoryMessage[]>()
    for (const event of events) {
      const threadKey = event.thread_ts || event.message_ts
      const thread = threads.get(threadKey) ?? []
      thread.push({
        ts: event.message_ts,
        thread_ts: event.thread_ts ?? undefined,
        user: event.sender_slack_user_id ?? undefined,
        text: event.text,
        bot_id: event.is_bot ? 'observed-bot' : undefined,
      })
      threads.set(threadKey, thread)
    }
    return [...threads.values()]
  }

  private normalizeEvent(input: {
    orgId: string
    slackTeamId: string
    channelId: string
    channelName: string | null
    message: SlackHistoryMessage | SlackMessageEvent
    source: 'webhook' | 'reconciliation' | 'backfill'
  }): SlackObservationEventInput | null {
    const messageTs = String(input.message.ts ?? '').trim()
    const text = String(input.message.text ?? '').trim()
    if (!messageTs || !text) return null
    return {
      orgId: input.orgId,
      slackTeamId: input.slackTeamId,
      channelId: input.channelId,
      channelName: input.channelName,
      messageTs,
      threadTs: input.message.thread_ts ? String(input.message.thread_ts) : null,
      senderSlackUserId: input.message.user ? String(input.message.user) : null,
      text,
      isBot: Boolean(input.message.bot_id || input.message.subtype === 'bot_message'),
      source: input.source,
    }
  }
}
