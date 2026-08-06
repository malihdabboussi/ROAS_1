import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SlackSignalResolutionService } from '../../slack/services/slack-signal-resolution.service'
import type { SlackShadowAction } from '../../slack/types/slack.types'
import { SlackTeamLoopRepository } from '../repositories/slack-team-loop.repository'
import {
  composeDigestMessage,
  composeThreadFollowUp,
  signalMessageItemFromAction,
  SLACK_TEAM_DIGEST_THREAD_HOURS,
  type SlackTeamSignalMessageItem,
} from './slack-team-signal-message'

export const SLACK_SIGNAL_COOLING_MINUTES = {
  unanswered_question: 30,
  client_risk: 15,
  workflow_discovery: 60,
  team_win: 60,
  important_update: 60,
  decision: 60,
  strategic_opportunity: 60,
} as const

export type SlackSignalCoolingKind = keyof typeof SLACK_SIGNAL_COOLING_MINUTES

export type SlackSignalDeliveryPerson = {
  id: string
  platform_id: string
  display_name?: string
  relationship_kind: string
  delivery_mode: string
}

type ReadyDelivery = {
  action: SlackShadowAction
  recipient: SlackSignalDeliveryPerson
  checkedAt: string
  item: SlackTeamSignalMessageItem
}

export function slackSignalLifecycleMetadata(
  kind: SlackSignalCoolingKind | 'brain_memory',
  now = new Date(),
): Record<string, unknown> {
  if (!(kind in SLACK_SIGNAL_COOLING_MINUTES)) return {}
  const coolingMinutes = SLACK_SIGNAL_COOLING_MINUTES[kind as SlackSignalCoolingKind]
  return {
    lifecycle_state: 'cooling',
    cooling_minutes: coolingMinutes,
    eligible_at: new Date(now.getTime() + coolingMinutes * 60_000).toISOString(),
  }
}

@Injectable()
export class SlackTeamSignalDeliveryService {
  constructor(
    private readonly people: SlackPeopleRepository,
    private readonly loops: SlackTeamLoopRepository,
    private readonly slackTools: SlackAgentToolsService,
    private readonly resolution: SlackSignalResolutionService,
  ) {}

  async processCoolingActions(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string
    workflowKey: string
    deliveryMode: 'shadow' | 'active'
    personIds: string[]
    quietHoursActive: boolean
    people: SlackSignalDeliveryPerson[]
    now?: Date
  }): Promise<{ rechecked: number; resolved: number; sent: number }> {
    const now = input.now ?? new Date()
    const actions = await this.loops.listCoolingActions(input.supabase, {
      orgId: input.orgId,
      workflowKey: input.workflowKey,
    })
    const peopleById = new Map(input.people.map((person) => [person.id, person]))
    let rechecked = 0
    let resolved = 0
    const ready: ReadyDelivery[] = []

    for (const candidate of actions) {
      if (!this.isReady(candidate, now)) continue
      const kind = String(candidate.metadata.signal_kind ?? '')
      const needsResolutionCheck = kind === 'unanswered_question' || kind === 'client_risk'
      const refreshed = needsResolutionCheck
        ? await this.resolution.refresh(input.supabase, input.orgId, candidate.id)
        : {
            action: candidate,
            resolution: {
              resolved: false,
              source_available: true,
              reason: 'Contextual briefing signals do not expire when a thread receives a reply.',
              checked_at: now.toISOString(),
              reply_count: 0,
              reaction_count: 0,
            },
          }
      if (needsResolutionCheck) rechecked += 1
      if (refreshed.resolution.resolved) {
        await this.loops.updateActionMetadata(input.supabase, {
          actionId: candidate.id,
          orgId: input.orgId,
          metadata: {
            ...refreshed.action.metadata,
            lifecycle_state: 'resolved_before_delivery',
            resolved_at: refreshed.resolution.checked_at,
          },
        })
        await this.people.reviewShadowAction(input.supabase, {
          actionId: candidate.id,
          orgId: input.orgId,
          reviewedBy: input.userId,
          status: 'dismissed',
        })
        resolved += 1
        continue
      }

      const recipient = candidate.target_member_id
        ? peopleById.get(candidate.target_member_id)
        : undefined
      if (!refreshed.resolution.source_available) {
        await this.markReadyForReview(input, refreshed.action, {
          rechecked_at: refreshed.resolution.checked_at,
          recheck_reason: refreshed.resolution.reason,
        })
        continue
      }
      if (!this.canSend(input, candidate, recipient) || !recipient) {
        await this.markReadyForReview(input, refreshed.action, {
          rechecked_at: refreshed.resolution.checked_at,
        })
        continue
      }

      ready.push({
        action: refreshed.action,
        recipient,
        checkedAt: refreshed.resolution.checked_at,
        item: signalMessageItemFromAction({
          proposedContent: refreshed.action.proposed_content,
          metadata: refreshed.action.metadata,
        }),
      })
    }

    let sent = 0
    const byRecipient = new Map<string, ReadyDelivery[]>()
    for (const entry of ready) {
      const group = byRecipient.get(entry.recipient.id) ?? []
      group.push(entry)
      byRecipient.set(entry.recipient.id, group)
    }

    for (const [, group] of byRecipient) {
      sent += await this.deliverRecipientBatch(input, group, now)
    }

    return { rechecked, resolved, sent }
  }

  private async deliverRecipientBatch(
    input: {
      supabase: SupabaseClient
      userId: string
      orgId: string
      workflowKey: string
    },
    group: ReadyDelivery[],
    now: Date,
  ): Promise<number> {
    if (group.length === 0) return 0
    const recipient = group[0]!.recipient
    const claimed: ReadyDelivery[] = []
    for (const entry of group) {
      const approved = await this.people.reviewShadowAction(input.supabase, {
        actionId: entry.action.id,
        orgId: input.orgId,
        reviewedBy: input.userId,
        status: 'approved',
      })
      if (!approved) continue
      const next = await this.people.claimShadowActionForSend(
        input.supabase,
        input.orgId,
        entry.action.id,
      )
      if (!next) continue
      claimed.push(entry)
    }
    if (claimed.length === 0) return 0

    const sinceIso = new Date(
      now.getTime() - SLACK_TEAM_DIGEST_THREAD_HOURS * 60 * 60 * 1000,
    ).toISOString()
    const existingRoot = await this.loops.findRecentDigestRoot(input.supabase, {
      orgId: input.orgId,
      workflowKey: input.workflowKey,
      targetMemberId: recipient.id,
      sinceIso,
    })

    try {
      const dm = await this.slackTools.openDm(input.supabase, input.userId, input.orgId, {
        slack_user_id: recipient.platform_id,
      })
      const channelId = String(dm.channel_id)
      const items = claimed.map((entry) => entry.item)
      const composeOptions = {
        recipientName: recipient.display_name || recipient.platform_id,
        now,
      }
      const text = existingRoot
        ? composeThreadFollowUp(items, composeOptions)
        : composeDigestMessage(items, composeOptions)
      const delivery = await this.slackTools.sendMessage(
        input.supabase,
        input.userId,
        input.orgId,
        {
          channel_id: channelId,
          text,
          ...(existingRoot ? { thread_ts: existingRoot.threadTs } : {}),
        },
      )
      const messageTs = typeof delivery.ts === 'string' ? delivery.ts : null
      const digestThreadTs = existingRoot?.threadTs ?? messageTs
      const isRoot = !existingRoot

      for (const entry of claimed) {
        await this.people.markShadowActionSent(input.supabase, {
          actionId: entry.action.id,
          orgId: input.orgId,
          sentBy: input.userId,
          slackTs: messageTs,
          slackChannelId: channelId,
          metadata: {
            ...entry.action.metadata,
            lifecycle_state: 'sent',
            rechecked_at: entry.checkedAt,
            digest_is_root: isRoot,
            digest_thread_ts: digestThreadTs,
            digest_item_count: claimed.length,
            delivery_style: isRoot ? 'compiled_digest' : 'thread_follow_up',
          },
        })
      }
      return claimed.length
    } catch (cause) {
      for (const entry of claimed) {
        await this.people.markShadowActionFailed(input.supabase, input.orgId, entry.action.id)
      }
      throw cause
    }
  }

  private async markReadyForReview(
    input: { supabase: SupabaseClient; orgId: string },
    action: SlackShadowAction,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.loops.updateActionMetadata(input.supabase, {
      actionId: action.id,
      orgId: input.orgId,
      metadata: {
        ...action.metadata,
        lifecycle_state: 'ready_for_review',
        ...metadata,
      },
    })
  }

  private isReady(action: SlackShadowAction, now: Date): boolean {
    const eligibleAt =
      typeof action.metadata.eligible_at === 'string'
        ? Date.parse(action.metadata.eligible_at)
        : NaN
    return Number.isFinite(eligibleAt) && eligibleAt <= now.getTime()
  }

  private canSend(
    input: {
      deliveryMode: 'shadow' | 'active'
      personIds: string[]
      quietHoursActive: boolean
    },
    action: SlackShadowAction,
    recipient?: SlackSignalDeliveryPerson,
  ): boolean {
    if (
      input.quietHoursActive ||
      action.action_kind !== 'message' ||
      recipient?.relationship_kind !== 'internal' ||
      recipient.delivery_mode !== 'active'
    ) {
      return false
    }
    return input.deliveryMode === 'shadow' || input.personIds.includes(recipient.id)
  }
}
