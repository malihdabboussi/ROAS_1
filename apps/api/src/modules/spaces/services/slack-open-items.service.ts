import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackSignalResolutionService } from '../../slack/services/slack-signal-resolution.service'
import {
  SlackOpenItemsRepository,
  type SlackOpenItem,
} from '../repositories/slack-open-items.repository'
import { SlackOfferFulfillmentService } from './slack-offer-fulfillment.service'

@Injectable()
export class SlackOpenItemsService {
  constructor(
    private readonly items: SlackOpenItemsRepository,
    private readonly resolution: SlackSignalResolutionService,
    @Optional() private readonly offerFulfillment?: SlackOfferFulfillmentService,
  ) {}

  async recordExternal(
    supabase: SupabaseClient,
    input: {
      orgId: string
      caseType:
        | 'quality_control'
        | 'proactive_launch'
        | 'campaign_quality_control'
        | 'post_call'
        | 'offer'
      sourceType: string
      sourceKey: string
      summary: string
      severity: 'low' | 'normal' | 'high' | 'critical'
      clientLabel?: string | null
      externalClientId?: string | null
      externalCampaignId?: string | null
      campaignId?: string | null
      spaceId?: string | null
      dueAt?: string | null
      sourceChannelId?: string | null
      sourceMessageTs?: string | null
      metadata?: Record<string, unknown>
      now?: Date
    },
  ): Promise<void> {
    const now = input.now ?? new Date()
    const nowIso = now.toISOString()
    const scope = await this.items.resolveExternalScope(supabase, {
      orgId: input.orgId,
      campaignId: input.campaignId,
      spaceId: input.spaceId,
      externalCampaignId: input.externalCampaignId,
      clientLabel: input.clientLabel,
      externalClientId: input.externalClientId,
    })
    await this.items.upsert(supabase, {
      org_id: input.orgId,
      ...scope,
      case_type: input.caseType,
      source_type: input.sourceType,
      source_key: input.sourceKey,
      subject_person_id: null,
      channel_id: input.sourceChannelId ?? input.sourceType,
      source_message_ts: input.sourceMessageTs ?? input.sourceKey,
      summary: input.summary,
      severity: input.severity,
      first_seen_at: nowIso,
      last_activity_at: nowIso,
      due_at: input.dueAt ?? null,
      breach_notified_at: null,
      snoozed_until: null,
      metadata: input.metadata ?? {},
    })
  }

  async applyExternalAction(
    supabase: SupabaseClient,
    input: {
      orgId: string
      sourceType: string
      sourceKey: string
      action: 'acknowledge' | 'resolve' | 'snooze_tomorrow'
      now?: Date
    },
  ): Promise<void> {
    await this.items.applyExternalAction(supabase, {
      ...input,
      nowIso: (input.now ?? new Date()).toISOString(),
    })
  }

  async record(
    supabase: SupabaseClient,
    input: {
      orgId: string
      signalKind: string
      subjectPersonId: string | null
      clientLabel: string | null
      slackTeamId: string
      channelId: string
      sourceMessageTs: string
      summary: string
      shadowActionId?: string | null
      sourceMetadata?: Record<string, unknown>
      now: Date
    },
  ): Promise<void> {
    const kind = this.kindFor(input.signalKind, input.summary)
    if (!kind) return
    const nowIso = input.now.toISOString()
    const sourceMetadata = input.sourceMetadata ?? {}
    const scope = await this.items.resolveSlackScope(supabase, {
      orgId: input.orgId,
      channelId: input.channelId,
      metadata: sourceMetadata,
    })
    await this.items.upsert(supabase, {
      org_id: input.orgId,
      ...scope,
      case_type: kind,
      source_type: 'slack_message',
      source_key: `${input.channelId}:${input.sourceMessageTs}`,
      subject_person_id: input.subjectPersonId,
      client_label: scope.client_label ?? input.clientLabel,
      channel_id: input.channelId,
      source_message_ts: input.sourceMessageTs,
      summary: input.summary,
      severity: kind === 'client_risk' ? 'high' : 'normal',
      first_seen_at: nowIso,
      last_activity_at: nowIso,
      due_at:
        kind === 'unanswered_ask'
          ? new Date(input.now.getTime() + 24 * 60 * 60_000).toISOString()
          : null,
      breach_notified_at: null,
      snoozed_until: null,
      metadata: {
        ...sourceMetadata,
        slack_team_id: input.slackTeamId,
        ...(input.shadowActionId ? { shadow_action_id: input.shadowActionId } : {}),
      },
    })
  }

  async reconcile(supabase: SupabaseClient, orgId: string, now: Date): Promise<void> {
    await this.offerFulfillment?.checkMissed(supabase, now)
    const checkedBefore = new Date(now.getTime() - 15 * 60_000).toISOString()
    for (const item of await this.items.listDueForResolution(supabase, orgId, checkedBefore)) {
      try {
        if (!item.channel_id || !item.source_message_ts) continue
        const result = await this.resolution.inspectSource(supabase, orgId, {
          channelId: item.channel_id,
          sourceMessageTs: item.source_message_ts,
          threadTs:
            typeof item.metadata.source_thread_ts === 'string'
              ? item.metadata.source_thread_ts
              : null,
        })
        await this.items.saveResolution(supabase, item, {
          resolved: result.resolved,
          note: result.reason,
          checkedAt: result.checked_at,
        })
      } catch {
        continue
      }
    }
    await this.items.enforceRetention(
      supabase,
      orgId,
      new Date(now.getTime() - 14 * 24 * 60 * 60_000).toISOString(),
    )
  }

  async continuityPack(
    supabase: SupabaseClient,
    input: { orgId: string; subjectPersonId?: string; now: Date },
  ): Promise<{
    open: Array<{ item: SlackOpenItem; text: string }>
    resolved: Array<{ item: SlackOpenItem; text: string }>
  }> {
    const rows = await this.items.listContinuity(supabase, {
      orgId: input.orgId,
      subjectPersonId: input.subjectPersonId,
      resolvedSince: new Date(input.now.getTime() - 8 * 60 * 60_000).toISOString(),
    })
    const open = rows
      .filter((item) => item.status === 'open' && this.shouldResurface(item, input.now))
      .map((item) => ({
        item,
        text: `${item.summary} (${this.ageLabel(item.first_seen_at, input.now)})`,
      }))
    const resolved = rows
      .filter(
        (item) =>
          (item.status === 'answered' || item.status === 'resolved') &&
          !item.metadata.resolution_surfaced_at,
      )
      .map((item) => ({ item, text: `Resolved: ${item.summary}` }))
    return { open, resolved }
  }

  async sundayCheckInPack(
    supabase: SupabaseClient,
    input: { orgId: string; now: Date },
  ): Promise<Array<{ item: SlackOpenItem; text: string }>> {
    const rows = await this.items.listContinuity(supabase, {
      orgId: input.orgId,
      resolvedSince: new Date(input.now.getTime() - 8 * 60 * 60_000).toISOString(),
    })
    return rows
      .filter((item) => item.status === 'open')
      .map((item) => ({
        item,
        text: `${item.client_label ? `${item.client_label}: ` : ''}${item.summary} (${this.ageLabel(item.first_seen_at, input.now)})`,
      }))
  }

  async breachPack(
    supabase: SupabaseClient,
    input: { orgId: string; now: Date },
  ): Promise<Array<{ item: SlackOpenItem; text: string }>> {
    const rows = await this.items.listUnnotifiedBreaches(
      supabase,
      input.orgId,
      input.now.toISOString(),
    )
    return rows.map((item) => ({
      item,
      text: `${item.client_label ? `${item.client_label}: ` : ''}${item.summary} (${this.ageLabel(item.first_seen_at, input.now)}, 24h response breach)`,
    }))
  }

  async markBreached(
    supabase: SupabaseClient,
    entries: Array<{ item: SlackOpenItem }>,
    now: Date,
  ): Promise<void> {
    for (const entry of entries) {
      await this.items.markBreachNotified(supabase, entry.item.id, now.toISOString())
    }
  }

  async markSurfaced(
    supabase: SupabaseClient,
    entries: Array<{ item: SlackOpenItem }>,
    now: Date,
  ): Promise<void> {
    for (const entry of entries) {
      await this.items.markSurfaced(supabase, entry.item, now.toISOString())
    }
  }

  private shouldResurface(item: SlackOpenItem, now: Date): boolean {
    if (item.times_surfaced >= 4) return false
    const ageHours = (now.getTime() - Date.parse(item.first_seen_at)) / 3_600_000
    const threshold = [8, 24, 72, 72][item.times_surfaced] ?? 72
    if (ageHours < threshold) return false
    return (
      !item.last_surfaced_at || now.getTime() - Date.parse(item.last_surfaced_at) >= 8 * 3_600_000
    )
  }

  private ageLabel(firstSeenAt: string, now: Date): string {
    const hours = Math.max(1, Math.round((now.getTime() - Date.parse(firstSeenAt)) / 3_600_000))
    return hours < 48 ? `open ~${hours}h` : `open ~${Math.round(hours / 24)}d`
  }

  private kindFor(
    signalKind: string,
    summary: string,
  ): 'unanswered_ask' | 'client_ask' | 'commitment' | 'client_risk' | null {
    if (signalKind === 'unanswered_question') return 'unanswered_ask'
    if (signalKind === 'client_risk') return 'client_risk'
    if (
      /\b(i('| a)m|we('| a)re|will|by (?:monday|tuesday|wednesday|thursday|friday|tomorrow|eod))\b/i.test(
        summary,
      )
    ) {
      return 'commitment'
    }
    return null
  }
}
