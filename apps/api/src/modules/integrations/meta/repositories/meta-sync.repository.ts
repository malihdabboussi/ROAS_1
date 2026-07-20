import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
type QueryResult<T> = { data: T | null; error: { message?: string } | null }

@Injectable()
export class MetaSyncRepository {
  async findCampaignByMetaId(
    client: SupabaseClient,
    userId: string,
    metaCampaignId: string,
  ): Promise<Row | null> {
    const { data } = await client
      .from('ad_campaigns')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('meta_campaign_id', metaCampaignId)
      .maybeSingle()
    return (data as Row | null) ?? null
  }

  async findAdSetByMetaId(
    client: SupabaseClient,
    userId: string,
    metaAdSetId: string,
  ): Promise<Row | null> {
    const { data } = await client
      .from('ad_sets')
      .select('id')
      .eq('user_id', userId)
      .eq('meta_adset_id', metaAdSetId)
      .maybeSingle()
    return (data as Row | null) ?? null
  }

  async findAdByMetaId(
    client: SupabaseClient,
    userId: string,
    metaAdId: string,
  ): Promise<Row | null> {
    const { data } = await client
      .from('ads')
      .select('id')
      .eq('user_id', userId)
      .eq('meta_ad_id', metaAdId)
      .maybeSingle()
    return (data as Row | null) ?? null
  }

  updateCampaign(client: SupabaseClient, id: string, payload: Row): Promise<QueryResult<Row>> {
    return client.from('ad_campaigns').update(payload).eq('id', id) as unknown as Promise<
      QueryResult<Row>
    >
  }

  updateAdSet(client: SupabaseClient, id: string, payload: Row): Promise<QueryResult<Row>> {
    return client.from('ad_sets').update(payload).eq('id', id) as unknown as Promise<
      QueryResult<Row>
    >
  }

  updateAd(client: SupabaseClient, id: string, payload: Row): Promise<QueryResult<Row>> {
    return client.from('ads').update(payload).eq('id', id) as unknown as Promise<QueryResult<Row>>
  }

  insertCampaign(client: SupabaseClient, payload: Row): Promise<QueryResult<Row>> {
    return client.from('ad_campaigns').insert(payload).select('id').single() as unknown as Promise<
      QueryResult<Row>
    >
  }

  insertAdSet(client: SupabaseClient, payload: Row): Promise<QueryResult<Row>> {
    return client.from('ad_sets').insert(payload).select('id').single() as unknown as Promise<
      QueryResult<Row>
    >
  }

  insertAd(client: SupabaseClient, payload: Row): Promise<QueryResult<Row>> {
    return client.from('ads').insert(payload).select('id').single() as unknown as Promise<
      QueryResult<Row>
    >
  }

  async getCampaignScope(
    client: SupabaseClient,
    campaignId: string,
  ): Promise<{ org_id: string | null; user_id: string | null } | null> {
    const { data } = await client
      .from('campaigns')
      .select('org_id, user_id')
      .eq('id', campaignId)
      .maybeSingle()
    if (!data) return null
    return {
      org_id: typeof data.org_id === 'string' ? data.org_id : null,
      user_id: typeof data.user_id === 'string' ? data.user_id : null,
    }
  }

  async findGeneralSpaceId(client: SupabaseClient, campaignId: string): Promise<string | null> {
    const { data } = await client
      .from('spaces')
      .select('id, title')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
      .limit(20)
    const rows = (data ?? []) as Array<{ id?: unknown; title?: unknown }>
    const general = rows.find(
      (row) =>
        String(row.title ?? '')
          .trim()
          .toLowerCase() === 'general',
    )
    const chosen = general ?? rows[0]
    return chosen?.id ? String(chosen.id) : null
  }
}
