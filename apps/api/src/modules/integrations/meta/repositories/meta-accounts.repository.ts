import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
type QueryResult<T> = { data: T | null; error: { message?: string } | null }

@Injectable()
export class MetaAccountsRepository {
  findDeliveryAdSet(
    client: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<QueryResult<Row>> {
    return client
      .from('ad_sets')
      .select('targeting, optimization_goal, ad_campaign_id')
      .eq('id', adSetId)
      .eq('user_id', userId)
      .single() as unknown as Promise<QueryResult<Row>>
  }

  async findCampaignMetadata(
    client: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<Row | null> {
    const { data } = await client
      .from('ad_campaigns')
      .select('metadata')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single()

    return (data as Row | null) ?? null
  }

  async findDefaultConnectedMetaIntegration(
    client: SupabaseClient,
    userId: string,
  ): Promise<Row | null> {
    const { data } = await client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'meta')
      .eq('status', 'connected')
      .is('org_id', null)
      .maybeSingle()

    return (data as Row | null) ?? null
  }
}
