import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackPeopleRepository } from '../repositories/slack-people.repository'
import { SlackSignalTrainingRepository } from '../repositories/slack-signal-training.repository'
import type { SlackHistoryMessage, SlackShadowAction } from '../types/slack.types'

export type SlackSignalResolution = {
  resolved: boolean
  source_available: boolean
  reason: string
  checked_at: string
  reply_count: number
  reaction_count: number
}

const RESOLVED_REACTIONS = new Set([
  'white_check_mark',
  'heavy_check_mark',
  'ballot_box_with_check',
])
const DIRECT_REPLY_WINDOW_SECONDS = 24 * 60 * 60
const ADJACENT_QUESTION_WINDOW_SECONDS = 15 * 60

@Injectable()
export class SlackSignalResolutionService {
  constructor(
    private readonly people: SlackPeopleRepository,
    private readonly slackApi: SlackApiIntegration,
    private readonly signals: SlackSignalTrainingRepository,
  ) {}

  async refresh(
    supabase: SupabaseClient,
    orgId: string,
    signalId: string,
  ): Promise<{ action: SlackShadowAction; resolution: SlackSignalResolution }> {
    const signal = (await this.people.listShadowActions(supabase, orgId, 500)).find(
      (candidate) => candidate.id === signalId,
    )
    if (!signal) throw new NotFoundException('Slack signal not found')
    const integration = await this.people.findOrgSlackIntegration(supabase, orgId)
    if (!integration || !signal.source_channel_id || !signal.source_message_ts) {
      return this.save(supabase, orgId, signal, {
        resolved: false,
        source_available: false,
        reason: 'Source thread is unavailable, so Pixel could not verify this signal.',
        checked_at: new Date().toISOString(),
        reply_count: 0,
        reaction_count: 0,
      })
    }

    const sourceChannelId = signal.source_channel_id
    const sourceMessageTs = signal.source_message_ts
    const threadTs =
      typeof signal.metadata?.source_thread_ts === 'string'
        ? signal.metadata.source_thread_ts
        : sourceMessageTs
    const resolution = await this.inspectSource(supabase, orgId, {
      channelId: sourceChannelId,
      sourceMessageTs,
      threadTs,
    })
    return this.save(supabase, orgId, signal, resolution)
  }

  async inspectSource(
    supabase: SupabaseClient,
    orgId: string,
    input: { channelId: string; sourceMessageTs: string; threadTs?: string | null },
  ): Promise<SlackSignalResolution> {
    const integration = await this.people.findOrgSlackIntegration(supabase, orgId)
    if (!integration) {
      return {
        resolved: false,
        source_available: false,
        reason: 'Source thread is unavailable, so Pixel could not verify this case.',
        checked_at: new Date().toISOString(),
        reply_count: 0,
        reaction_count: 0,
      }
    }
    const threadTs = input.threadTs || input.sourceMessageTs
    const replies = await this.slackApi.conversationsRepliesAll(
      integration.access_token,
      input.channelId,
      threadTs,
    )
    const source = replies.find((message) => message.ts === input.sourceMessageTs) ?? replies[0]
    const laterHumanReplies = replies.filter((message) =>
      this.isLaterHumanReply(message, input.sourceMessageTs, source?.user),
    )
    const reactionCount = (source?.reactions ?? []).reduce(
      (total, reaction) => total + (reaction.count ?? reaction.users?.length ?? 0),
      0,
    )
    const resolvedReaction = (source?.reactions ?? []).find(
      (reaction) =>
        RESOLVED_REACTIONS.has(reaction.name) &&
        (reaction.count ?? reaction.users?.length ?? 0) > 0,
    )
    const directChannelReplies =
      laterHumanReplies.length === 0 &&
      !resolvedReaction &&
      threadTs === input.sourceMessageTs &&
      source
        ? await this.findDirectChannelReplies(
            integration.access_token,
            input.channelId,
            input.sourceMessageTs,
            source,
          )
        : []
    const resolved =
      laterHumanReplies.length > 0 || directChannelReplies.length > 0 || Boolean(resolvedReaction)
    const replyCount = laterHumanReplies.length + directChannelReplies.length
    return {
      resolved,
      source_available: true,
      reason: resolved
        ? resolvedReaction
          ? `The source message has a :${resolvedReaction.name}: resolution reaction.`
          : directChannelReplies.length > 0
            ? 'A nearby human channel reply was found after the source message.'
            : `A later human reply was found in the source thread (${laterHumanReplies.length}).`
        : 'No later human reply was found in the source thread or nearby channel.',
      checked_at: new Date().toISOString(),
      reply_count: replyCount,
      reaction_count: reactionCount,
    }
  }

  private async findDirectChannelReplies(
    accessToken: string,
    channelId: string,
    sourceTs: string,
    source: SlackHistoryMessage,
  ): Promise<SlackHistoryMessage[]> {
    const sourceSeconds = Number(sourceTs)
    if (!Number.isFinite(sourceSeconds)) return []
    const history = await this.slackApi.getChannelHistoryPage(accessToken, channelId, {
      limit: 100,
      oldest: sourceTs,
      latest: String(sourceSeconds + DIRECT_REPLY_WINDOW_SECONDS),
    })
    const laterHumanMessages = history.messages
      .filter((message) => this.isLaterHumanReply(message, sourceTs, source.user))
      .sort((left, right) => Number(left.ts) - Number(right.ts))
    const mentionedUsers = new Set(
      [...(source.text ?? '').matchAll(/<@([A-Z0-9]+)>/g)].map((match) => match[1]),
    )
    if (mentionedUsers.size > 0) {
      const addressedReply = laterHumanMessages.find(
        (message) => message.user && mentionedUsers.has(message.user),
      )
      return addressedReply ? [addressedReply] : []
    }
    const adjacentReply = laterHumanMessages[0]
    if (!source.text?.includes('?') || !adjacentReply?.ts) return []
    return Number(adjacentReply.ts) - sourceSeconds <= ADJACENT_QUESTION_WINDOW_SECONDS
      ? [adjacentReply]
      : []
  }

  private isLaterHumanReply(
    message: SlackHistoryMessage,
    sourceTs: string,
    sourceUser?: string,
  ): boolean {
    return Boolean(
      message.ts &&
      Number(message.ts) > Number(sourceTs) &&
      message.user &&
      message.user !== sourceUser &&
      !message.bot_id &&
      message.subtype !== 'bot_message',
    )
  }

  private async save(
    supabase: SupabaseClient,
    orgId: string,
    signal: SlackShadowAction,
    resolution: SlackSignalResolution,
  ) {
    const action = await this.signals.updateSignalMetadata(supabase, {
      actionId: signal.id,
      orgId,
      metadata: { ...signal.metadata, resolution },
    })
    if (!action) throw new NotFoundException('Slack signal changed before refresh completed')
    return { action, resolution }
  }
}
