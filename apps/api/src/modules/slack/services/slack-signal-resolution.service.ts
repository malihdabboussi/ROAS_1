import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackPeopleRepository } from '../repositories/slack-people.repository'
import { SlackSignalTrainingRepository } from '../repositories/slack-signal-training.repository'
import type { SlackHistoryMessage, SlackShadowAction } from '../types/slack.types'

export type SlackSignalResolution = {
  resolved: boolean
  reason: string
  checked_at: string
  reply_count: number
  reaction_count: number
}

const RESOLVED_REACTIONS = new Set(['white_check_mark', 'heavy_check_mark', 'ballot_box_with_check'])

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
      (candidate) => candidate.id === signalId && !candidate.target_member_id,
    )
    if (!signal) throw new NotFoundException('Slack signal not found')
    const integration = await this.people.findOrgSlackIntegration(supabase, orgId)
    if (!integration || !signal.source_channel_id || !signal.source_message_ts) {
      return this.save(supabase, orgId, signal, {
        resolved: false,
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
    const replies = await this.slackApi.conversationsRepliesAll(
      integration.access_token,
      sourceChannelId,
      threadTs,
    )
    const source = replies.find((message) => message.ts === sourceMessageTs) ?? replies[0]
    const laterHumanReplies = replies.filter((message) =>
      this.isLaterHumanReply(message, sourceMessageTs, source?.user),
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
    const resolved = laterHumanReplies.length > 0 || Boolean(resolvedReaction)
    return this.save(supabase, orgId, signal, {
      resolved,
      reason: resolved
        ? resolvedReaction
          ? `The source message has a :${resolvedReaction.name}: resolution reaction.`
          : `A later human reply was found in the source thread (${laterHumanReplies.length}).`
        : 'No later human reply was found in the source thread.',
      checked_at: new Date().toISOString(),
      reply_count: laterHumanReplies.length,
      reaction_count: reactionCount,
    })
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
