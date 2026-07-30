import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SlackSignalResolutionService } from '../../slack/services/slack-signal-resolution.service'
import type { SlackShadowAction } from '../../slack/types/slack.types'
import { SlackTeamLoopRepository } from '../repositories/slack-team-loop.repository'

export const SLACK_SIGNAL_COOLING_MINUTES = {
  unanswered_question: 30,
  client_risk: 15,
  workflow_discovery: 60,
} as const

export type SlackSignalCoolingKind = keyof typeof SLACK_SIGNAL_COOLING_MINUTES

export type SlackSignalDeliveryPerson = {
  id: string
  platform_id: string
  relationship_kind: string
  delivery_mode: string
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
    let sent = 0

    for (const candidate of actions) {
      if (!this.isReady(candidate, now)) continue
      const refreshed = await this.resolution.refresh(input.supabase, input.orgId, candidate.id)
      rechecked += 1
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
      if (!this.canSend(input, candidate, recipient)) {
        await this.markReadyForReview(input, refreshed.action, {
          rechecked_at: refreshed.resolution.checked_at,
        })
        continue
      }

      const approved = await this.people.reviewShadowAction(input.supabase, {
        actionId: candidate.id,
        orgId: input.orgId,
        reviewedBy: input.userId,
        status: 'approved',
      })
      if (!approved) continue
      const claimed = await this.people.claimShadowActionForSend(
        input.supabase,
        input.orgId,
        candidate.id,
      )
      if (!claimed) continue
      try {
        const dm = await this.slackTools.openDm(input.supabase, input.userId, input.orgId, {
          slack_user_id: recipient?.platform_id ?? '',
        })
        const delivery = await this.slackTools.sendMessage(
          input.supabase,
          input.userId,
          input.orgId,
          {
            channel_id: String(dm.channel_id),
            text: candidate.proposed_content,
          },
        )
        await this.people.markShadowActionSent(input.supabase, {
          actionId: candidate.id,
          orgId: input.orgId,
          sentBy: input.userId,
          slackTs: typeof delivery.ts === 'string' ? delivery.ts : null,
          slackChannelId: String(dm.channel_id),
          metadata: {
            ...refreshed.action.metadata,
            lifecycle_state: 'sent',
            rechecked_at: refreshed.resolution.checked_at,
          },
        })
        sent += 1
      } catch (cause) {
        await this.people.markShadowActionFailed(input.supabase, input.orgId, candidate.id)
        throw cause
      }
    }

    return { rechecked, resolved, sent }
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
