import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class WorkflowEdgeDeleteCleanupRepository {
  async listLeadIdsForFunnel(supabase: SupabaseClient, funnelId: string) {
    const { data, error } = await supabase.from('leads').select('id').eq('funnel_id', funnelId)
    if (error) throw new Error(`Failed to resolve funnel leads: ${error.message}`)
    return (data ?? [])
      .map((row) => String((row as { id?: unknown }).id ?? ''))
      .filter((leadId) => leadId.length > 0)
  }

  async listLeadIdsForSourceSequence(supabase: SupabaseClient, sequenceId: string) {
    const { data, error } = await supabase
      .from('sequence_email_sends')
      .select('lead_id')
      .eq('sequence_id', sequenceId)
      .not('lead_id', 'is', null)
    if (error) throw new Error(`Failed to resolve source-sequence leads: ${error.message}`)

    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => String((row as { lead_id?: unknown }).lead_id ?? ''))
          .filter((leadId) => leadId.length > 0),
      ),
    )
  }

  async cancelUnsentSchedulesForLeadsInSequence(
    supabase: SupabaseClient,
    sequenceId: string,
    leadIds: string[],
    reason: string,
    now: string,
  ) {
    const { error } = await supabase
      .from('email_single_schedules')
      .update({ status: 'cancelled', error_message: reason, updated_at: now })
      .eq('sequence_id', sequenceId)
      .in('lead_id', leadIds)
      .eq('status', 'scheduled')
    if (error) throw new Error(`Failed to cancel unsent schedules: ${error.message}`)
  }

  async markPendingSequenceSendsSkipped(
    supabase: SupabaseClient,
    sequenceId: string,
    leadIds: string[],
    now: string,
  ) {
    const { error } = await supabase
      .from('sequence_email_sends')
      .update({ status: 'skipped', updated_at: now })
      .eq('sequence_id', sequenceId)
      .in('lead_id', leadIds)
      .eq('status', 'pending')
    if (error) {
      throw new Error(`Failed to mark pending sequence sends as skipped: ${error.message}`)
    }
  }
}
