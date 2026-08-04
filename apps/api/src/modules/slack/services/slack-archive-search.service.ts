import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackObservationRepository } from '../repositories/slack-observation.repository'
import { parseSlackSearchWindow } from './slack-channel-history-search'
import { SlackObservationService } from './slack-observation.service'

const ARCHIVE_FRESHNESS_MS = 60 * 60 * 1000

@Injectable()
export class SlackArchiveSearchService {
  constructor(
    private readonly repository: SlackObservationRepository,
    private readonly observation: SlackObservationService,
    private readonly slackApi: SlackApiIntegration,
  ) {}

  async search(input: {
    supabase: SupabaseClient
    orgId: string | null | undefined
    slackTeamId: string | null
    botToken: string
    query: string
    count: number
    now?: Date
  }) {
    if (!input.orgId || !input.slackTeamId) return null
    const now = input.now ?? new Date()
    const window = parseSlackSearchWindow(input.query, now)
    if (!window.channelNeedle) return null
    const channels = await this.slackApi.listConversations(input.botToken)
    const channel = channels.find(
      (candidate) =>
        candidate.id.toLowerCase() === window.channelNeedle ||
        candidate.name.toLowerCase() === window.channelNeedle,
    )
    if (!channel) return null

    await this.repository.upsertChannels(input.supabase, [
      {
        orgId: input.orgId,
        slackTeamId: input.slackTeamId,
        channelId: channel.id,
        channelName: channel.name,
        isPrivate: Boolean(channel.is_private),
        isMember: channel.is_member !== false,
      },
    ])
    const settings = await this.repository.listChannelSettings(input.supabase, {
      orgId: input.orgId,
      slackTeamId: input.slackTeamId,
    })
    const coverage = settings.find((setting) => setting.channel_id === channel.id)
    const backfilledAt = coverage?.archive_backfilled_at
      ? new Date(coverage.archive_backfilled_at).getTime()
      : 0
    const coversWindow =
      coverage?.archive_oldest_ts != null &&
      Number(coverage.archive_oldest_ts) <= Number(window.oldestTs)
    const isFresh =
      Number.isFinite(backfilledAt) && backfilledAt >= now.getTime() - ARCHIVE_FRESHNESS_MS
    if (!coversWindow || !isFresh) {
      await this.observation.backfillChannelPeriod({
        supabase: input.supabase,
        orgId: input.orgId,
        slackTeamId: input.slackTeamId,
        botToken: input.botToken,
        channelId: channel.id,
        channelName: channel.name,
        periodStartTs: window.oldestTs,
        periodEndTs: window.latestTs ?? String(now.getTime() / 1000),
      })
    }

    const events = await this.repository.listEventsBetween(input.supabase, {
      orgId: input.orgId,
      slackTeamId: input.slackTeamId,
      channelId: channel.id,
      periodStartTs: window.oldestTs,
      periodEndTs: window.latestTs ?? String(now.getTime() / 1000),
    })
    const scored = events
      .map((event) => {
        const text = event.text.toLowerCase()
        const matches = window.terms.filter((term) => text.includes(term)).length
        const score = window.terms.length === 0 ? 1 : matches / window.terms.length
        return { event, score: score + (/https?:\/\//i.test(text) ? 0.1 : 0) }
      })
      .filter((candidate) => candidate.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          Number(right.event.message_ts) - Number(left.event.message_ts),
      )
      .slice(0, input.count)
    const matches = await Promise.all(
      scored.map(async ({ event }) => {
        const permalink = await this.slackApi.getPermalink(
          input.botToken,
          event.channel_id,
          event.message_ts,
        )
        return {
          text: event.text,
          user: event.sender_slack_user_id ?? undefined,
          ts: event.message_ts,
          thread_ts: event.thread_ts ?? undefined,
          channel: { id: event.channel_id, name: event.channel_name },
          ...(permalink ? { permalink } : {}),
        }
      }),
    )
    return {
      ok: true as const,
      search_mode: 'observation_archive' as const,
      coverage: {
        status: 'complete' as const,
        channels_scanned: 1,
        messages_scanned: events.length,
        oldest_ts: window.oldestTs,
        freshest_at: now.toISOString(),
      },
      messages: { total: matches.length, matches },
    }
  }
}
