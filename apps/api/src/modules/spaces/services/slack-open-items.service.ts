import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackSignalResolutionService } from '../../slack/services/slack-signal-resolution.service'
import { SlackOpenItemsRepository } from '../repositories/slack-open-items.repository'

@Injectable()
export class SlackOpenItemsService {
  constructor(
    private readonly items: SlackOpenItemsRepository,
    private readonly resolution: SlackSignalResolutionService,
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
