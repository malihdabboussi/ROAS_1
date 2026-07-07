import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

type Row = Record<string, unknown>
type QueryResult<T> = { data: T | null; error: { message?: string } | null }

@Injectable()
export class MetaStatusRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  withServiceClient<T>(callback: (client: SupabaseClient) => Promise<T>): Promise<T> {
    return callback(this.serviceClient.client)
  }

  findAdForStatus(client: SupabaseClient, userId: string, adId: string): Promise<QueryResult<Row>> {
    return client
      .from('ads')
      .select('id, meta_ad_id, metadata')
      .eq('id', adId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findAdSetForStatus(
    client: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .select('id, meta_adset_id, metadata')
      .eq('id', adSetId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findCampaignForStatus(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .select('id, meta_campaign_id, metadata')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findAdSetForRefresh(
    client: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .select('id, ad_campaign_id, meta_adset_id, metadata')
      .eq('id', adSetId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findAdForRefresh(
    client: SupabaseClient,
    userId: string,
    adId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ads')
      .select('id, ad_set_id, meta_ad_id, metadata')
      .eq('id', adId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findAdSetParent(
    client: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .select('id, ad_campaign_id, meta_adset_id')
      .eq('id', adSetId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findCampaignParent(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .select('id, meta_campaign_id, metadata')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  findCampaignIdParent(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .select('id, meta_campaign_id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  async listChildAds(client: SupabaseClient, userId: string, adSetId: string): Promise<Row[]> {
    const { data } = await client
      .from('ads')
      .select('id, meta_ad_id')
      .eq('ad_set_id', adSetId)
      .eq('user_id', userId)
    return (data ?? []) as Row[]
  }

  async listChildAdSets(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<Row[]> {
    const { data } = await client
      .from('ad_sets')
      .select('id, meta_adset_id')
      .eq('ad_campaign_id', campaignId)
      .eq('user_id', userId)
    return (data ?? []) as Row[]
  }

  findWebhookAd(client: SupabaseClient, metaAdId: string): Promise<QueryResult<Row>> {
    return client
      .from('ads')
      .select('id, user_id')
      .eq('meta_ad_id', metaAdId)
      .limit(1)
      .maybeSingle() as unknown as Promise<QueryResult<Row>>
  }

  findWebhookAdSet(client: SupabaseClient, metaAdSetId: string): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .select('id, user_id')
      .eq('meta_adset_id', metaAdSetId)
      .limit(1)
      .maybeSingle() as unknown as Promise<QueryResult<Row>>
  }

  findWebhookCampaign(client: SupabaseClient, metaCampaignId: string): Promise<QueryResult<Row>> {
    return client
      .from('ad_campaigns')
      .select('id, user_id')
      .eq('meta_campaign_id', metaCampaignId)
      .limit(1)
      .maybeSingle() as unknown as Promise<QueryResult<Row>>
  }

  updateAdMetaStatus(
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

  updateAdSetMetaStatus(
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

  updateCampaignMetaStatus(
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
}
