import { Injectable } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export type LeadIngestionFunnel = Record<string, unknown> & {
  id: string
  user_id: string
  campaign_id?: string | null
  tag_ids?: unknown
  org_id?: string | null
  name?: string | null
}

@Injectable()
export class LeadIngestionRepository {
  createServiceClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as SupabaseClient
  }

  createAnonClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
    }
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as SupabaseClient
  }

  async findAd(
    supabase: SupabaseClient,
    adId: string,
  ): Promise<{ id: string; ad_set_id?: string | null } | null> {
    const { data } = await supabase.from('ads').select('id, ad_set_id').eq('id', adId).single()
    return (data as { id: string; ad_set_id?: string | null } | null) ?? null
  }

  async findAdSetCampaignId(
    supabase: SupabaseClient,
    adSetId: string,
  ): Promise<string | null> {
    const { data } = await supabase
      .from('ad_sets')
      .select('ad_campaign_id')
      .eq('id', adSetId)
      .single()
    return (data as { ad_campaign_id?: string | null } | null)?.ad_campaign_id ?? null
  }

  async updateLeadAttribution(
    supabase: SupabaseClient,
    leadId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    await supabase.from('leads').update(updates).eq('id', leadId)
  }

  async findFunnel(supabase: SupabaseClient, funnelId: string): Promise<LeadIngestionFunnel> {
    const { data, error } = await supabase
      .from('funnels')
      .select('id, user_id, campaign_id, tag_ids, org_id, name')
      .eq('id', funnelId)
      .single()
    if (error || !data) {
      throw new Error(`Failed to resolve funnel for contact sync: ${error?.message || 'Not found'}`)
    }
    return data as LeadIngestionFunnel
  }

  async findContactTags(supabase: SupabaseClient, contactId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, tags')
      .eq('id', contactId)
      .maybeSingle()
    if (error) throw new Error(`Failed to read contact for tag merge: ${error.message}`)
    return Array.isArray((data as { tags?: unknown } | null)?.tags)
      ? (((data as { tags: string[] }).tags ?? []) as string[])
      : []
  }

  async updateContact(
    supabase: SupabaseClient,
    contactId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase.from('contacts').update(patch).eq('id', contactId)
    if (error) throw new Error(`Failed to update contact: ${error.message}`)
  }

  async upsertFunnelMembership(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase
      .from('contact_funnel_memberships')
      .upsert(row, { onConflict: 'contact_id,funnel_id' })
    if (error) throw new Error(`Failed to upsert funnel membership: ${error.message}`)
  }

  async upsertCampaignMembership(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase
      .from('contact_campaign_memberships')
      .upsert(row, { onConflict: 'contact_id,campaign_id' })
    if (error) throw new Error(`Failed to upsert campaign membership: ${error.message}`)
  }

  async findContactNameFields(
    supabase: SupabaseClient,
    contactId: string,
  ): Promise<{ first_name: string | null; last_name: string | null } | null> {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('id', contactId)
      .maybeSingle()
    return data as { first_name: string | null; last_name: string | null } | null
  }

  async findWorkflowSequenceIds(
    supabase: SupabaseClient,
    input: { campaignId: string; funnelId: string },
  ): Promise<string[]> {
    const { data: edges, error } = await supabase
      .from('campaign_workflow_edges')
      .select('to_id')
      .eq('campaign_id', input.campaignId)
      .eq('from_type', 'funnel')
      .eq('from_id', input.funnelId)
      .eq('to_type', 'sequence')
      .eq('edge_type', 'funnel_conversion_to_sequence')
      .in('status', ['valid', 'active'])
    if (error) throw new Error(`Failed to resolve funnel->sequence workflow edges: ${error.message}`)
    return Array.from(new Set((edges ?? []).map((edge) => String(edge.to_id || '')).filter(Boolean)))
  }

  async findDefaultSender(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<{ id: string; domain_id: string }> {
    let senderQ = supabase
      .from('email_sender_identities')
      .select('id, domain_id')
      .eq('user_id', input.userId)
      .eq('is_verified', true)
    if (input.orgId !== undefined) {
      senderQ = input.orgId ? senderQ.eq('org_id', input.orgId) : senderQ.is('org_id', null)
    }
    const { data, error } = await senderQ
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve sender identity: ${error.message}`)
    if (!data?.id || !data.domain_id) {
      throw new Error('No verified default sender identity/domain configured for sequence scheduling')
    }
    return { id: data.id as string, domain_id: data.domain_id as string }
  }

  async listSequenceEmails(
    supabase: SupabaseClient,
    sequenceIds: string[],
  ): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await supabase
      .from('sequence_emails')
      .select('id, sequence_id, subject, body, delay_hours, order_index, status')
      .in('sequence_id', sequenceIds)
      .order('sequence_id', { ascending: true })
      .order('order_index', { ascending: true })
    if (error) {
      throw new Error(`Failed to resolve sequence emails for scheduling: ${error.message}`)
    }
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listExistingSequenceSendIds(
    supabase: SupabaseClient,
    input: { userId: string; leadId: string; sequenceEmailIds: string[] },
  ): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('sequence_email_sends')
      .select('sequence_email_id')
      .eq('user_id', input.userId)
      .eq('lead_id', input.leadId)
      .in('sequence_email_id', input.sequenceEmailIds)
    if (error) {
      throw new Error(`Failed to check existing sequence send tracking rows: ${error.message}`)
    }
    return new Set(
      (data ?? [])
        .map((row) => String((row as { sequence_email_id?: unknown }).sequence_email_id ?? ''))
        .filter((id) => id.length > 0),
    )
  }

  async insertSequenceSendRows(
    supabase: SupabaseClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<void> {
    if (rows.length === 0) return
    const { error } = await supabase.from('sequence_email_sends').insert(rows)
    if (error) throw new Error(`Failed to create sequence send tracking rows: ${error.message}`)
  }

  async listExistingScheduleIds(
    supabase: SupabaseClient,
    input: { userId: string; leadId: string; sequenceEmailIds: string[] },
  ): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('email_single_schedules')
      .select('sequence_email_id')
      .eq('user_id', input.userId)
      .eq('lead_id', input.leadId)
      .in('sequence_email_id', input.sequenceEmailIds)
    if (error) {
      throw new Error(`Failed to check existing sequence schedules: ${error.message}`)
    }
    return new Set(
      (data ?? [])
        .map((row) => String((row as { sequence_email_id?: unknown }).sequence_email_id ?? ''))
        .filter((id) => id.length > 0),
    )
  }

  async insertScheduleRows(
    supabase: SupabaseClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<void> {
    if (rows.length === 0) return
    const { error } = await supabase.from('email_single_schedules').insert(rows)
    if (error) throw new Error(`Failed to create sequence email schedules: ${error.message}`)
  }
}
