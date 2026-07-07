import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CampaignKnowledgeRepository } from './campaign-knowledge.repository'

@Injectable()
export class CampaignsRepository extends CampaignKnowledgeRepository {
  async findByUserId(supabase: SupabaseClient, _userId: string, orgId?: string | null) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .is('deleted_at', null)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })

    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.is('org_id', null)
    }

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findGeneralByUserId(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .is('deleted_at', null)
      .contains('config', { system_kind: 'general' })
      .neq('status', 'archived')
      .order('created_at', { ascending: true })
      .limit(1)

    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }

    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findById(
    supabase: SupabaseClient,
    id: string,
    opts?: { includeDeleted?: boolean; orgId?: string | null },
  ) {
    let query = supabase.from('campaigns').select('*').eq('id', id)
    if (!opts?.includeDeleted) {
      query = query.is('deleted_at', null)
    }
    if (opts?.orgId !== undefined) {
      query = opts.orgId ? query.eq('org_id', opts.orgId) : query.is('org_id', null)
    }
    const { data, error } = await query.maybeSingle()
    if (error && error.code === 'PGRST116') return null
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async listCampaignAgents(supabase: SupabaseClient, _userId: string, campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_agents')
      .select('campaign_id, agent_key, name, status, created_at, updated_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async listCampaignIdsForAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    let query = supabase.from('campaign_agents').select('campaign_id').eq('agent_key', agentKey)
    if (orgId !== undefined) {
      if (orgId) {
        query = query.eq('org_id', orgId)
      } else {
        query = query.eq('user_id', userId).is('org_id', null)
      }
    } else {
      query = query.eq('user_id', userId)
    }
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []).map((row) => String(row.campaign_id))
  }

  async upsertCampaignAgent(
    supabase: SupabaseClient,
    payload: {
      campaign_id: string
      user_id: string
      agent_key: string
      name: string
      status?: 'idle' | 'working' | 'offline'
      org_id?: string | null
    },
  ) {
    const record: Record<string, unknown> = {
      campaign_id: payload.campaign_id,
      user_id: payload.user_id,
      agent_key: payload.agent_key,
      name: payload.name,
      status: payload.status ?? 'idle',
    }
    if (payload.org_id !== undefined) record.org_id = payload.org_id
    const { data, error } = await supabase
      .from('campaign_agents')
      .upsert(record, { onConflict: 'campaign_id,agent_key' })
      .select('campaign_id, agent_key, name, status, created_at, updated_at')
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async deleteCampaignAgent(
    supabase: SupabaseClient,
    _userId: string,
    campaignId: string,
    agentKey: string,
  ) {
    const { error } = await supabase
      .from('campaign_agents')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('agent_key', agentKey)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async create(
    supabase: SupabaseClient,
    record: {
      user_id: string
      name: string
      campaign_type: string
      config?: Record<string, unknown>
      org_id?: string | null
    },
  ) {
    const { data, error } = await supabase.from('campaigns').insert(record).select().single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async countNonArchivedByUserId(supabase: SupabaseClient, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'archived')
    if (error) throw new Error(`DB error: ${error.message}`)
    return count ?? 0
  }

  async update(supabase: SupabaseClient, id: string, fields: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase
      .from('campaigns')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async restore(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async hardDelete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async getAnalytics(
    supabase: SupabaseClient,
    campaignId: string,
    startDate?: string,
    endDate?: string,
    funnelIds?: string[],
  ) {
    const params: Record<string, unknown> = { p_campaign_id: campaignId }
    if (startDate) params.p_start_date = startDate
    if (endDate) params.p_end_date = endDate
    if (funnelIds !== undefined) params.p_funnel_ids = funnelIds

    const { data, error } = await supabase.rpc('get_campaign_analytics', params)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async getEmailAnalytics(
    supabase: SupabaseClient,
    campaignId: string,
    startDate?: string,
    endDate?: string,
    sequenceIds?: string[],
  ) {
    const params: Record<string, unknown> = { p_campaign_id: campaignId }
    if (startDate) params.p_start_date = startDate
    if (endDate) params.p_end_date = endDate
    if (sequenceIds !== undefined) params.p_sequence_ids = sequenceIds

    const { data, error } = await supabase.rpc('get_campaign_email_analytics', params)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async getAdAnalytics(
    supabase: SupabaseClient,
    campaignId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const params: Record<string, unknown> = { p_campaign_id: campaignId }
    if (startDate) params.p_start_date = startDate
    if (endDate) params.p_end_date = endDate

    const { data, error } = await supabase.rpc('get_campaign_ad_analytics', params)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async getCampaignReportingWidgets(
    supabase: SupabaseClient,
    campaignId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const pStart = startDate ? `${startDate}T00:00:00.000Z` : null
    const pEnd = endDate ? `${endDate}T23:59:59.999Z` : null
    const base = { p_campaign_id: campaignId, p_start_date: pStart, p_end_date: pEnd }

    const [
      contact_stats,
      contacts_timeseries,
      deliverables_by_type,
      sequence_stats,
      top_email,
      top_funnels,
      contact_sources,
      lead_customer,
      funnel_dropoff,
      ads_budget,
    ] = await Promise.all([
      supabase.rpc('get_campaign_contact_stats', base),
      supabase.rpc('get_campaign_contacts_timeseries', base),
      supabase.rpc('get_campaign_deliverables_by_type', base),
      supabase.rpc('get_campaign_sequence_aggregate_stats', base),
      supabase.rpc('get_campaign_top_email_row', base),
      supabase.rpc('get_campaign_top_funnels', { ...base, p_limit: 5 }),
      supabase.rpc('get_campaign_contact_source_breakdown', base),
      supabase.rpc('get_campaign_lead_customer_split', base),
      supabase.rpc('get_campaign_funnel_dropoff', base),
      supabase.rpc('get_campaign_ads_budget_sum', base),
    ])

    const err =
      contact_stats.error ||
      contacts_timeseries.error ||
      deliverables_by_type.error ||
      sequence_stats.error ||
      top_email.error ||
      top_funnels.error ||
      contact_sources.error ||
      lead_customer.error ||
      funnel_dropoff.error ||
      ads_budget.error
    if (err) throw new Error(`DB error: ${err.message}`)

    return {
      contact_stats: contact_stats.data,
      contacts_timeseries: contacts_timeseries.data,
      deliverables_by_type: deliverables_by_type.data,
      sequence_stats: sequence_stats.data,
      top_email: top_email.data,
      top_funnels: top_funnels.data,
      contact_sources: contact_sources.data,
      lead_customer: lead_customer.data,
      funnel_dropoff: funnel_dropoff.data,
      ads_budget: ads_budget.data,
    }
  }

  async getUserCampaignLeaderboard(
    supabase: SupabaseClient,
    startDate?: string,
    endDate?: string,
    limit?: number,
  ) {
    const pStart = startDate ? `${startDate}T00:00:00.000Z` : null
    const pEnd = endDate ? `${endDate}T23:59:59.999Z` : null
    const { data, error } = await supabase.rpc('get_user_campaign_leaderboard', {
      p_start_date: pStart,
      p_end_date: pEnd,
      p_limit: limit ?? 8,
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }
}
