import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class CampaignArtifactSequencesRepository {
  async listSequences(
    supabase: SupabaseClient,
    campaignId: string,
    spaceId?: string,
    options?: { summary?: boolean },
  ) {
    const emailsSelect = options?.summary
      ? 'sequence_emails(id, sequence_id, subject, delay_hours, order_index, status, created_at, updated_at)'
      : 'sequence_emails(*)'
    let query = supabase
      .from('sequences')
      .select(`*, ${emailsSelect}`)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (spaceId) query = query.eq('space_id', spaceId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list sequences: ${error.message}`)
    return data ?? []
  }

  async getSequence(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('sequences')
      .select('*, sequence_emails(*)')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return data
  }

  async findSequenceEmail(supabase: SupabaseClient, emailId: string) {
    const { data, error } = await supabase
      .from('sequence_emails')
      .select('id, sequence_id')
      .eq('id', emailId)
      .single()
    if (error || !data) return null
    return data
  }

  async updateSequenceEmailOrder(supabase: SupabaseClient, emailId: string, orderIndex: number) {
    const { error } = await supabase
      .from('sequence_emails')
      .update({ order_index: orderIndex, updated_at: new Date().toISOString() })
      .eq('id', emailId)
    if (error) throw new Error(`Failed to reorder emails: ${error.message}`)
  }

  async listSequenceEmailIds(supabase: SupabaseClient, sequenceId: string) {
    const { data } = await supabase
      .from('sequence_emails')
      .select('id')
      .eq('sequence_id', sequenceId)
      .order('order_index', { ascending: true })
    return data ?? []
  }

  async moveSequenceEmail(
    supabase: SupabaseClient,
    emailId: string,
    targetSequenceId: string,
    orderIndex: number,
  ) {
    const { error } = await supabase
      .from('sequence_emails')
      .update({
        sequence_id: targetSequenceId,
        order_index: orderIndex,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailId)
    if (error) throw new Error(`Failed to move email: ${error.message}`)
  }

  async listSequenceEmailOrderIndexes(supabase: SupabaseClient, sequenceId: string) {
    const { data, error } = await supabase
      .from('sequence_emails')
      .select('order_index')
      .eq('sequence_id', sequenceId)
    if (error) throw new Error(`Failed to read sequence emails: ${error.message}`)
    return data ?? []
  }

  async createSequenceEmail(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('sequence_emails')
      .insert(payload)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create sequence email: ${error.message}`)
    return data
  }

  async updateSequenceEmail(
    supabase: SupabaseClient,
    emailId: string,
    payload: Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('sequence_emails')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', emailId)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update email: ${error.message}`)
    return data
  }

  async updateSequence(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('sequences')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update sequence: ${error.message}`)
    return data
  }

  async cancelUnsentEmailSchedules(supabase: SupabaseClient, emailIds: string[], now: string) {
    const { error } = await supabase
      .from('email_single_schedules')
      .update({
        status: 'cancelled',
        error_message: 'Cancelled by sequence delete',
        updated_at: now,
      })
      .in('sequence_email_id', emailIds)
      .eq('status', 'scheduled')
    if (error) throw new Error(`Failed to cancel unsent sequence schedules: ${error.message}`)
  }

  async markPendingSequenceSendsSkipped(supabase: SupabaseClient, sequenceId: string, now: string) {
    const { error } = await supabase
      .from('sequence_email_sends')
      .update({ status: 'skipped', updated_at: now })
      .eq('sequence_id', sequenceId)
      .eq('status', 'pending')
    if (error) throw new Error(`Failed to mark pending sequence sends as skipped: ${error.message}`)
  }

  async deleteSequence(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('sequences').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete sequence: ${error.message}`)
  }

  async syncScheduledEmailContent(
    supabase: SupabaseClient,
    sequenceEmailId: string,
    subject: string,
    htmlContent: string,
  ) {
    const { data, error } = await supabase
      .from('email_single_schedules')
      .update({
        subject,
        html_content: htmlContent,
        updated_at: new Date().toISOString(),
      })
      .eq('sequence_email_id', sequenceEmailId)
      .eq('status', 'scheduled')
      .select('id')
    if (error)
      throw new Error(`Failed to sync unsent emails for step ${sequenceEmailId}: ${error.message}`)
    return data?.length ?? 0
  }
}
