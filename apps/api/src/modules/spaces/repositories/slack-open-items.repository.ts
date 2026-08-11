import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SlackOpenItem = {
  id: string
  org_id: string
  kind: 'question' | 'client_ask' | 'commitment' | 'risk'
  subject_person_id: string | null
  client_label: string | null
  channel_id: string
  source_message_ts: string
  summary: string
  status: 'open' | 'answered' | 'resolved' | 'stale'
  first_seen_at: string
  last_activity_at: string
  times_surfaced: number
  last_surfaced_at: string | null
  resolution_note: string | null
  metadata: Record<string, unknown>
}

@Injectable()
export class SlackOpenItemsRepository {
  async upsert(
    supabase: SupabaseClient,
    input: Omit<
      SlackOpenItem,
      'id' | 'status' | 'times_surfaced' | 'last_surfaced_at' | 'resolution_note'
    >,
  ): Promise<void> {
    const { error } = await supabase.from('slack_open_items').upsert(input, {
      onConflict: 'org_id,channel_id,source_message_ts',
      ignoreDuplicates: false,
    })
    if (error) throw new Error(`Failed to upsert Slack open item: ${error.message}`)
  }

  async listDueForResolution(
    supabase: SupabaseClient,
    orgId: string,
    checkedBefore: string,
  ): Promise<SlackOpenItem[]> {
    const { data, error } = await supabase
      .from('slack_open_items')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .or(
        `metadata->>resolution_checked_at.is.null,metadata->>resolution_checked_at.lt.${checkedBefore}`,
      )
      .order('first_seen_at', { ascending: true })
      .limit(100)
    if (error) throw new Error(`Failed to load Slack open items: ${error.message}`)
    return (data as SlackOpenItem[] | null) ?? []
  }

  async saveResolution(
    supabase: SupabaseClient,
    item: SlackOpenItem,
    input: { resolved: boolean; note: string; checkedAt: string },
  ): Promise<void> {
    const { error } = await supabase
      .from('slack_open_items')
      .update({
        status: input.resolved ? (item.kind === 'question' ? 'answered' : 'resolved') : 'open',
        resolution_note: input.resolved ? input.note : null,
        last_activity_at: input.resolved ? input.checkedAt : item.last_activity_at,
        metadata: { ...item.metadata, resolution_checked_at: input.checkedAt },
      })
      .eq('id', item.id)
      .eq('status', 'open')
    if (error) throw new Error(`Failed to resolve Slack open item: ${error.message}`)
  }

  async enforceRetention(
    supabase: SupabaseClient,
    orgId: string,
    archiveBefore: string,
  ): Promise<void> {
    const { error: archiveError } = await supabase
      .from('slack_open_items')
      .delete()
      .eq('org_id', orgId)
      .in('status', ['answered', 'resolved', 'stale'])
      .lt('updated_at', archiveBefore)
    if (archiveError) throw new Error(`Failed to archive Slack open items: ${archiveError.message}`)

    const { data, error } = await supabase
      .from('slack_open_items')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .order('first_seen_at', { ascending: false })
      .range(500, 999)
    if (error) throw new Error(`Failed to cap Slack open items: ${error.message}`)
    const overflow = (data ?? []).map((row) => row.id)
    if (overflow.length) {
      const { error: staleError } = await supabase
        .from('slack_open_items')
        .update({ status: 'stale', resolution_note: 'Evicted by the 500-open-item retention cap.' })
        .in('id', overflow)
      if (staleError) throw new Error(`Failed to stale Slack open items: ${staleError.message}`)
    }
  }
}
