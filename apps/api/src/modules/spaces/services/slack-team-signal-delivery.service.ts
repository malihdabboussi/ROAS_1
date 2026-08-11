import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SlackSignalResolutionService } from '../../slack/services/slack-signal-resolution.service'
import type { SlackShadowAction } from '../../slack/types/slack.types'
import { SlackTeamLoopRepository } from '../repositories/slack-team-loop.repository'
import {
  composePersonalMomentMessage,
  filterBrainDetailsFromSlackCopy,
  isPersonalMomentEventType,
  PERSONAL_MOMENT_COOLING_MINUTES,
} from './slack-team-personal-moment'
import {
  composeDigestMessage,
  composeThreadFollowUp,
  signalMessageItemFromAction,
  SLACK_TEAM_DIGEST_THREAD_HOURS,
  type SlackTeamSignalMessageItem,
} from './slack-team-signal-message'
import { SlackTeamMessageComposerService } from './slack-team-message-composer.service'
import { SlackOpenItemsService } from './slack-open-items.service'

export const SLACK_SIGNAL_COOLING_MINUTES = {
  unanswered_question: 30,
  client_risk: 15,
  workflow_discovery: 60,
  team_win: 60,
  important_update: 60,
  decision: 60,
  strategic_opportunity: 60,
  personal_moment: PERSONAL_MOMENT_COOLING_MINUTES,
} as const

export type SlackSignalCoolingKind = keyof typeof SLACK_SIGNAL_COOLING_MINUTES

export type SlackSignalDeliveryPerson = {
  id: string
  platform_id: string
  display_name?: string
  relationship_kind: string
  delivery_mode: string
  title?: string
}

type ReadyDelivery = {
  action: SlackShadowAction
  recipient: SlackSignalDeliveryPerson
  checkedAt: string
  item: SlackTeamSignalMessageItem
}

export type SlackDeliveryOutcome = {
  action_id: string
  recipient_id: string | null
  can_send: boolean
  reason: string
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
    @Optional() private readonly composer?: SlackTeamMessageComposerService,
    @Optional() private readonly openItems?: SlackOpenItemsService,
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
    timezone?: string
  }): Promise<{
    rechecked: number
    resolved: number
    sent: number
    delivery_outcomes: SlackDeliveryOutcome[]
  }> {
    const now = input.now ?? new Date()
    const actions = await this.loops.listCoolingActions(input.supabase, {
      orgId: input.orgId,
      workflowKey: input.workflowKey,
    })
    const peopleById = new Map(input.people.map((person) => [person.id, person]))
    let rechecked = 0
    let resolved = 0
    const ready: ReadyDelivery[] = []
    const deliveryOutcomes: SlackDeliveryOutcome[] = []

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
        deliveryOutcomes.push(this.outcome(candidate, false, 'resolved_before_delivery'))
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

      const recipient = candidate.target_member_id ? peopleById.get(candidate.target_member_id) : undefined
      if (!refreshed.resolution.source_available) {
        deliveryOutcomes.push(this.outcome(candidate, false, 'source_unavailable'))
        await this.markReadyForReview(input, refreshed.action, {
          rechecked_at: refreshed.resolution.checked_at,
          recheck_reason: refreshed.resolution.reason,
        })
        continue
      }
      const sendDecision = this.canSend(input, candidate, recipient, kind)
      deliveryOutcomes.push(this.outcome(candidate, sendDecision.canSend, sendDecision.reason))
      if (!sendDecision.canSend || !recipient) {
        await this.markReadyForReview(input, refreshed.action, {
          rechecked_at: refreshed.resolution.checked_at,
          ...(kind === 'personal_moment' && input.deliveryMode === 'shadow'
            ? { personal_moment_shadow_only: true }
            : {}),
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
    const personalMoments = ready.filter(
      (entry) => String(entry.action.metadata.signal_kind ?? '') === 'personal_moment',
    )
    const digestReady = ready.filter((entry) => String(entry.action.metadata.signal_kind ?? '') !== 'personal_moment')

    for (const entry of personalMoments) {
      sent += await this.deliverPersonalMoment(input, entry, now)
    }

    const byRecipient = new Map<string, ReadyDelivery[]>()
    for (const entry of digestReady) {
      const group = byRecipient.get(entry.recipient.id) ?? []
      group.push(entry)
      byRecipient.set(entry.recipient.id, group)
    }

    for (const [, group] of byRecipient) {
      sent += await this.deliverRecipientBatch(input, group, now)
    }

    return { rechecked, resolved, sent, delivery_outcomes: deliveryOutcomes }
  }

  private async deliverPersonalMoment(
    input: {
      supabase: SupabaseClient
      userId: string
      orgId: string
      workflowKey: string
    },
    entry: ReadyDelivery,
    now: Date,
  ): Promise<number> {
    const approved = await this.people.reviewShadowAction(input.supabase, {
      actionId: entry.action.id,
      orgId: input.orgId,
      reviewedBy: input.userId,
      status: 'approved',
    })
    if (!approved) return 0
    const claimed = await this.people.claimShadowActionForSend(input.supabase, input.orgId, entry.action.id)
    if (!claimed) return 0

    const eventTypeRaw = entry.action.metadata.moment_event_type
    const eventType = isPersonalMomentEventType(eventTypeRaw) ? eventTypeRaw : 'personal_milestone'
    const finding =
      typeof entry.action.metadata.signal_finding === 'string' && entry.action.metadata.signal_finding.trim()
        ? entry.action.metadata.signal_finding
        : entry.action.proposed_content
    const historical =
      typeof entry.action.metadata.personal_moment_historical_connection === 'string'
        ? entry.action.metadata.personal_moment_historical_connection
        : null
    const channelName =
      typeof entry.action.metadata.source_channel_name === 'string'
        ? entry.action.metadata.source_channel_name
        : entry.item.channelName
    const fallbackText = filterBrainDetailsFromSlackCopy(
      composePersonalMomentMessage({
        recipientName: entry.recipient.display_name || entry.recipient.platform_id,
        eventType,
        channelName,
        finding,
        historicalConnection: historical,
      }),
    )
    const text = entry.action.metadata.composition_usage
      ? filterBrainDetailsFromSlackCopy(entry.action.proposed_content)
      : fallbackText

    try {
      const dm = await this.slackTools.openDm(input.supabase, input.userId, input.orgId, {
        slack_user_id: entry.recipient.platform_id,
      })
      const channelId = String(dm.channel_id)
      const delivery = await this.slackTools.sendMessage(input.supabase, input.userId, input.orgId, {
        channel_id: channelId,
        text,
      })
      const messageTs = typeof delivery.ts === 'string' ? delivery.ts : null
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
          digest_is_root: true,
          digest_thread_ts: messageTs,
          digest_item_count: 1,
          delivery_style: 'personal_moment',
        },
      })
      return 1
    } catch (cause) {
      await this.people.markShadowActionFailed(input.supabase, input.orgId, entry.action.id)
      throw cause
    }
  }

  private async deliverRecipientBatch(
    input: {
      supabase: SupabaseClient
      userId: string
      orgId: string
      workflowKey: string
      timezone?: string
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
      const next = await this.people.claimShadowActionForSend(input.supabase, input.orgId, entry.action.id)
      if (!next) continue
      claimed.push(entry)
    }
    if (claimed.length === 0) return 0

    const sinceIso = new Date(now.getTime() - SLACK_TEAM_DIGEST_THREAD_HOURS * 3_600_000).toISOString()
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
      const fallbackText = existingRoot
        ? composeThreadFollowUp(items, composeOptions)
        : composeDigestMessage(items, composeOptions)
      const continuity =
        (await this.loops.listRecentDigestSummaries?.(input.supabase, {
          orgId: input.orgId,
          workflowKey: input.workflowKey,
          targetMemberId: recipient.id,
          limit: 3,
        })) ?? []
      const ledgerContinuity = await this.openItems?.continuityPack(input.supabase, {
        orgId: input.orgId,
        now,
      })
      const continuityEntries = [...(ledgerContinuity?.open ?? []), ...(ledgerContinuity?.resolved ?? [])]
      let text = fallbackText
      let composition: Awaited<ReturnType<SlackTeamMessageComposerService['compose']>> | null = null
      if (this.composer) {
        try {
          composition = await this.composer.compose({
            userId: input.userId,
            orgId: input.orgId,
            recipient: {
              name: recipient.display_name || recipient.platform_id,
              role: recipient.title,
              relationship: recipient.relationship_kind,
            },
            signals: claimed.map((entry) => ({
              kind: String(entry.action.metadata.signal_kind ?? ''),
              finding: String(entry.action.metadata.signal_finding ?? entry.item.finding),
              quote: String(entry.action.metadata.source_message_text ?? ''),
              senderName: String(entry.action.metadata.source_sender_display_name ?? ''),
              channelName: String(entry.action.metadata.source_channel_name ?? entry.item.channelName),
              timestamp: String(entry.action.metadata.source_message_ts ?? ''),
            })),
            continuity: [...continuityEntries.map((entry) => entry.text), ...continuity],
            context: {
              now,
              timezone: input.timezone ?? 'America/Los_Angeles',
              threadFollowUp: Boolean(existingRoot),
            },
          })
          text = composition.text
        } catch {
          composition = null
        }
      }
      const delivery = await this.slackTools.sendMessage(input.supabase, input.userId, input.orgId, {
        channel_id: channelId,
        text,
        ...(existingRoot ? { thread_ts: existingRoot.threadTs } : {}),
      })
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
            delivered_text: text,
            ...(composition
              ? {
                  composition_offers: composition.offers,
                  composition_usage: composition.usage,
                }
              : { composition_fallback: true }),
          },
        })
      }
      await this.openItems?.markSurfaced(input.supabase, continuityEntries, now)
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
    const eligibleAt = typeof action.metadata.eligible_at === 'string' ? Date.parse(action.metadata.eligible_at) : NaN
    return Number.isFinite(eligibleAt) && eligibleAt <= now.getTime()
  }

  private outcome(action: SlackShadowAction, canSend: boolean, reason: string): SlackDeliveryOutcome {
    return {
      action_id: action.id,
      recipient_id: action.target_member_id,
      can_send: canSend,
      reason,
    }
  }

  private canSend(
    input: {
      deliveryMode: 'shadow' | 'active'
      personIds: string[]
      quietHoursActive: boolean
    },
    action: SlackShadowAction,
    recipient?: SlackSignalDeliveryPerson,
    kind = '',
  ): { canSend: boolean; reason: string } {
    if (input.quietHoursActive) return { canSend: false, reason: 'quiet_hours' }
    if (action.action_kind !== 'message') return { canSend: false, reason: 'not_message' }
    if (!recipient) return { canSend: false, reason: 'recipient_missing' }
    if (recipient.relationship_kind !== 'internal') {
      return { canSend: false, reason: 'recipient_not_internal' }
    }
    if (recipient.delivery_mode !== 'active') {
      return { canSend: false, reason: 'recipient_not_active' }
    }
    // Personal moments are Active-only: Shadow keeps a reviewable proposal.
    if (kind === 'personal_moment') {
      if (input.deliveryMode !== 'active') return { canSend: false, reason: 'flow_shadow' }
      if (!input.personIds.includes(recipient.id)) {
        return { canSend: false, reason: 'recipient_not_allowlisted' }
      }
      return { canSend: true, reason: 'allowed' }
    }
    if (input.deliveryMode !== 'shadow' && !input.personIds.includes(recipient.id)) {
      return { canSend: false, reason: 'recipient_not_allowlisted' }
    }
    return { canSend: true, reason: 'allowed' }
  }
}
