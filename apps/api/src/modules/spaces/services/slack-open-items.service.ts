import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackSignalResolutionService } from '../../slack/services/slack-signal-resolution.service'
import {
  SlackOpenItemsRepository,
  type SlackOpenItem,
} from '../repositories/slack-open-items.repository'
import { Optional } from '@nestjs/common'
import { SlackOfferFulfillmentService } from './slack-offer-fulfillment.service'

@Injectable()
export class SlackOpenItemsService {
  constructor(
    private readonly items: SlackOpenItemsRepository,
    private readonly resolution: SlackSignalResolutionService,
    @Optional() private readonly offerFulfillment?: SlackOfferFulfillmentService,
  ) {}

  async record(
    supabase: SupabaseClient,
    input: {
      orgId: string
      signalKind: string
      subjectPersonId: string | null
      clientLabel: string | null
      channelId: string
      sourceMessageTs: string
      summary: string
      shadowActionId: string
      now: Date
    },
  ): Promise<void> {
    const kind = this.kindFor(input.signalKind, input.summary)
    if (!kind) return
    const nowIso = input.now.toISOString()
    await this.items.upsert(supabase, {
      org_id: input.orgId,
      kind,
      subject_person_id: input.subjectPersonId,
      client_label: input.clientLabel,
      channel_id: input.channelId,
      source_message_ts: input.sourceMessageTs,
      summary: input.summary,
      first_seen_at: nowIso,
      last_activity_at: nowIso,
      metadata: { shadow_action_id: input.shadowActionId },
    })
  }

  async reconcile(supabase: SupabaseClient, orgId: string, now: Date): Promise<void> {
    await this.offerFulfillment?.checkMissed(supabase, now)
    const checkedBefore = new Date(now.getTime() - 15 * 60_000).toISOString()
    for (const item of await this.items.listDueForResolution(supabase, orgId, checkedBefore)) {
      const actionId =
        typeof item.metadata.shadow_action_id === 'string' ? item.metadata.shadow_action_id : ''
      if (!actionId) continue
      try {
        const result = await this.resolution.refresh(supabase, orgId, actionId)
        await this.items.saveResolution(supabase, item, {
          resolved: result.resolution.resolved,
          note: result.resolution.reason,
          checkedAt: result.resolution.checked_at,
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
  ): 'question' | 'client_ask' | 'commitment' | 'risk' | null {
    if (signalKind === 'unanswered_question') return 'question'
    if (signalKind === 'client_risk') return 'risk'
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
