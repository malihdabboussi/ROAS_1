import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
type QueryResult<T> = { data: T | null; error: { message?: string } | null }
type PublishTable = 'ads' | 'ad_sets' | 'ad_campaigns'

@Injectable()
export class MetaPublishRepository {
  findCampaignForBatch(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .select('*, ad_sets(*, ads(*))')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findAdForPublish(
    client: SupabaseClient,
    userId: string,
    adId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ads')
      .select('*')
      .eq('id', adId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findPublishRequestAd(
    client: SupabaseClient,
    userId: string,
    adId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ads')
      .select('ad_set_id')
      .eq('id', adId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findPublishRequestAdSet(
    client: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .select(
        'name, daily_budget, lifetime_budget, targeting, start_time, end_time, ad_campaign_id',
      )
      .eq('id', adSetId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findPublishRequestCampaign(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .select(
        'name, objective, budget_type, daily_budget, lifetime_budget, bid_strategy, schedule_type, start_time, end_time, metadata',
      )
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findLinkedAdSet(
    client: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .select('id,ad_campaign_id,meta_adset_id,metadata')
      .eq('id', adSetId)
      .eq('user_id', userId)
      .maybeSingle() as unknown as Promise<QueryResult<Row>>
  }

  findLinkedCampaign(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .select('id,meta_campaign_id,metadata')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .maybeSingle() as unknown as Promise<QueryResult<Row>>
  }

  findCampaignMetaLink(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .select('id,meta_campaign_id,metadata')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findAdSetMetaLink(
    client: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .select('id,meta_adset_id,metadata')
      .eq('id', adSetId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  updateCampaign(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
    payload: Row,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .update(payload)
      .eq('id', campaignId)
      .eq('user_id', userId) as unknown as Promise<QueryResult<Row>>
  }

  updateAdSet(
    client: SupabaseClient,
    userId: string,
    adSetId: string,
    payload: Row,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .update(payload)
      .eq('id', adSetId)
      .eq('user_id', userId) as unknown as Promise<QueryResult<Row>>
  }

  updateAd(
    client: SupabaseClient,
    userId: string,
    adId: string,
    payload: Row,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ads')
      .update(payload)
      .eq('id', adId)
      .eq('user_id', userId) as unknown as Promise<QueryResult<Row>>
  }

  updatePublishTable(
    client: SupabaseClient,
    userId: string,
    table: PublishTable,
    id: string,
    payload: Row,
  ): Promise<QueryResult<Row>> {
    return client
      .from(table)
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId) as unknown as Promise<QueryResult<Row>>
  }
}
