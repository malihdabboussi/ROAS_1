import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>

@Injectable()
export class MetaInsightsRepository {
  async listCampaignRows(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<Row[]> {
    const { data, error } = await client
      .from('ad_campaigns')
      .select(
        'id,name,meta_campaign_id,meta_ad_account_id,meta_effective_status,daily_budget,lifetime_budget,metadata',
      )
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (error) throw new BadRequestException(`Failed to load ad campaigns: ${error.message}`)
    return (data ?? []) as Row[]
  }

  async listAdSetRows(
    client: SupabaseClient,
    userId: string,
    adCampaignId: string,
  ): Promise<Row[]> {
    const { data, error } = await client
      .from('ad_sets')
      .select(
        'id,name,ad_campaign_id,meta_adset_id,meta_effective_status,daily_budget,lifetime_budget,metadata',
      )
      .eq('user_id', userId)
      .eq('ad_campaign_id', adCampaignId)
      .order('created_at', { ascending: false })
    if (error) throw new BadRequestException(`Failed to load ad sets: ${error.message}`)
    return (data ?? []) as Row[]
  }

  async listAdRows(client: SupabaseClient, userId: string, adSetId: string): Promise<Row[]> {
    const { data, error } = await client
      .from('ads')
      .select('id,headline,ad_set_id,meta_ad_id,meta_effective_status,metadata')
      .eq('user_id', userId)
      .eq('ad_set_id', adSetId)
      .order('created_at', { ascending: false })
    if (error) throw new BadRequestException(`Failed to load ads: ${error.message}`)
    return (data ?? []) as Row[]
  }

  async countLeadsBy(
    client: SupabaseClient,
    key: 'ad_campaign_id' | 'ad_set_id' | 'ad_id',
    ids: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map()
    let query = client.from('leads').select(`${key},created_at`).in(key, ids)
    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`)
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`)
    const { data, error } = await query
    if (error) throw new BadRequestException(`Failed to load leads breakdown: ${error.message}`)

    const counts = new Map<string, number>()
    for (const row of data ?? []) {
      const id = String((row as Row)[key] ?? '')
      if (!id) continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }
}
