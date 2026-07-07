import { Injectable } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class EmailRuntimeRepository {
  createServiceClient(configService: ConfigService): SupabaseClient {
    const url = configService.get<string>('SUPABASE_URL') || ''
    const key = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || ''
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  }

  async findEmailSettings(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ hide_branding?: boolean } | null> {
    let query = supabase.from('email_settings').select('hide_branding').eq('user_id', userId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data } = await query.maybeSingle()
    return (data as { hide_branding?: boolean } | null) ?? null
  }

  async findActiveSubscription(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('status, subscription_plans(price_amount)')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single()
    return data as { subscription_plans?: { price_amount?: number } } | null
  }

  async listEmailSends(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      status?: string
      startDate?: string
      endDate?: string
      includeArchived?: boolean
      limit: number
      offset: number
    },
  ) {
    let query = supabase
      .from('email_sends')
      .select('*', { count: 'exact' })
      .eq('user_id', input.userId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    query = query
      .order('created_at', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1)
    if (input.status) query = query.eq('status', input.status)
    if (!input.includeArchived) query = query.eq('is_archived', false)
    if (input.startDate) query = query.gte('sent_at', input.startDate)
    if (input.endDate) query = query.lte('sent_at', input.endDate)
    const { data, error, count } = await query
    if (error) throw new Error(`Database error: ${error.message}`)
    return { data: data ?? [], count: count ?? 0 }
  }

  async countSingleEmailSchedules(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; sequenceId?: string; status?: string },
  ): Promise<number> {
    let query = supabase
      .from('email_single_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', input.userId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    if (input.sequenceId) query = query.eq('sequence_id', input.sequenceId)
    if (input.status) query = query.eq('status', input.status)
    const { count, error } = await query
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  async archiveEmailSend(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; logId: string; archive: boolean },
  ): Promise<void> {
    let query = supabase
      .from('email_sends')
      .update({ is_archived: input.archive, updated_at: new Date().toISOString() })
      .eq('id', input.logId)
      .eq('user_id', input.userId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(`Database error: ${error.message}`)
  }

  async findSuppression(
    supabase: SupabaseClient,
    input: { userId: string; email: string; orgId?: string | null },
  ) {
    let query = supabase
      .from('email_suppressions')
      .select('id')
      .eq('user_id', input.userId)
      .eq('email', input.email)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query.limit(1).maybeSingle()
    return data as { id: string } | null
  }

  async createSuppression(
    supabase: SupabaseClient,
    row: {
      user_id: string
      org_id?: string | null
      email: string
      reason: string
      bounce_type?: string | null
      bounce_reason?: string | null
    },
  ): Promise<void> {
    const { error } = await supabase.from('email_suppressions').insert(row)
    if (error) throw new Error(`Database error: ${error.message}`)
  }

  async markSendUnsubscribed(supabase: SupabaseClient, sendId: string): Promise<void> {
    await supabase
      .from('email_sends')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('id', sendId)
  }

  async findSendBySendGridMessageId(supabase: SupabaseClient, sgMessageId: string) {
    const { data } = await supabase
      .from('email_sends')
      .select('id, user_id, org_id')
      .like('sendgrid_message_id', `${sgMessageId}%`)
      .limit(1)
      .maybeSingle()
    return data as { id: string; user_id: string; org_id: string | null } | null
  }

  async updateEmailSendStatus(
    supabase: SupabaseClient,
    sendId: string,
    statusUpdate: Record<string, unknown>,
  ): Promise<void> {
    await supabase.from('email_sends').update(statusUpdate).eq('id', sendId)
  }

  async createEmailEvent(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<void> {
    await supabase.from('email_events').insert(row)
  }
}
