import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope } from '@vibey/api-shared'

type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type ArtifactRow = Record<string, unknown> & {
  id: string
  name?: string | null
  headline?: string | null
  processing_status?: string | null
  image_url?: string | null
  tracking_url?: string | null
  ad_set_id?: string | null
  ad_campaign_id?: string | null
  campaign_id?: string | null
  space_id?: string | null
  generated_tsx?: string | null
}

@Injectable()
export class ArtifactOffersAdsRepository {
  private applyScope(query: any, input: { userId: string; orgId?: string | null }) {
    return applyOwnerScope(query, { userId: input.userId, orgId: input.orgId ?? null })
  }

  async listOffers(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; campaignId: string },
  ): Promise<{ data: ArtifactRow[] | null; error: QueryError | null }> {
    return (await this.applyScope(supabase.from('offers').select('*'), input)
      .eq('campaign_id', input.campaignId)
      .order('created_at', { ascending: false })) as {
      data: ArtifactRow[] | null
      error: QueryError | null
    }
  }

  async listCustomFields(
    supabase: SupabaseClient,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('contact_custom_field_definitions')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findOffer(
    supabase: SupabaseClient,
    input: { offerId: string; userId: string; orgId?: string | null; columns?: string },
  ): Promise<QueryResult<ArtifactRow>> {
    return (await this.applyScope(
      supabase.from('offers').select(input.columns ?? '*').eq('id', input.offerId),
      input,
    ).maybeSingle()) as QueryResult<ArtifactRow>
  }

  async createOffer(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: ArtifactRow; error: QueryError | null }> {
    return (await supabase.from('offers').insert(payload).select().single()) as {
      data: ArtifactRow
      error: QueryError | null
    }
  }

  async updateOffer(
    supabase: SupabaseClient,
    input: {
      offerId: string
      userId: string
      orgId?: string | null
      updates: Record<string, unknown>
    },
  ): Promise<QueryResult<ArtifactRow>> {
    return (await this.applyScope(
      supabase.from('offers').update(input.updates).eq('id', input.offerId),
      input,
    )
      .select()
      .maybeSingle()) as QueryResult<ArtifactRow>
  }

  async createAd(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: ArtifactRow; error: QueryError | null }> {
    return (await supabase.from('ads').insert(payload).select().single()) as {
      data: ArtifactRow
      error: QueryError | null
    }
  }

  async updateAd(
    supabase: SupabaseClient,
    input: { adId: string; userId: string; orgId?: string | null; updates: Record<string, unknown> },
  ): Promise<{ data: ArtifactRow; error: QueryError | null }> {
    return (await this.applyScope(supabase.from('ads').update(input.updates).eq('id', input.adId), input)
      .select()
      .single()) as { data: ArtifactRow; error: QueryError | null }
  }

  async updateAdFields(
    supabase: SupabaseClient,
    input: { adId: string; updates: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.from('ads').update(input.updates).eq('id', input.adId)) as {
      error: QueryError | null
    }
  }

  async findAdSetCampaignId(
    supabase: SupabaseClient,
    adSetId: string,
  ): Promise<QueryResult<{ ad_campaign_id: string | null }>> {
    return (await supabase
      .from('ad_sets')
      .select('ad_campaign_id')
      .eq('id', adSetId)
      .single()) as QueryResult<{ ad_campaign_id: string | null }>
  }

  async createAdCampaign(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: ArtifactRow; error: QueryError | null }> {
    return (await supabase.from('ad_campaigns').insert(payload).select().single()) as {
      data: ArtifactRow
      error: QueryError | null
    }
  }

  async createAdSet(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: ArtifactRow; error: QueryError | null }> {
    return (await supabase.from('ad_sets').insert(payload).select().single()) as {
      data: ArtifactRow
      error: QueryError | null
    }
  }

  async findAdCampaignForAdSet(
    supabase: SupabaseClient,
    adCampaignId: string,
  ): Promise<QueryResult<ArtifactRow>> {
    return (await supabase
      .from('ad_campaigns')
      .select('campaign_id, space_id')
      .eq('id', adCampaignId)
      .maybeSingle()) as QueryResult<ArtifactRow>
  }

  async bulkCreateAds(
    supabase: SupabaseClient,
    rows: Array<Record<string, unknown>>,
  ): Promise<{ data: ArtifactRow[] | null; error: QueryError | null }> {
    return (await supabase.from('ads').insert(rows).select()) as {
      data: ArtifactRow[] | null
      error: QueryError | null
    }
  }

  async listAds(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; campaignId?: string | null },
  ): Promise<{ data: ArtifactRow[] | null; error: QueryError | null }> {
    let query = this.applyScope(supabase.from('ads').select('*'), input)
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    return (await query.order('created_at', { ascending: false })) as {
      data: ArtifactRow[] | null
      error: QueryError | null
    }
  }

  async findAd(
    supabase: SupabaseClient,
    input: { adId: string; userId: string; orgId?: string | null; columns?: string },
  ): Promise<QueryResult<ArtifactRow>> {
    return (await this.applyScope(
      supabase.from('ads').select(input.columns ?? '*').eq('id', input.adId),
      input,
    ).maybeSingle()) as QueryResult<ArtifactRow>
  }

  async findAdCampaign(
    supabase: SupabaseClient,
    input: { adCampaignId: string; userId: string; orgId?: string | null },
  ): Promise<QueryResult<ArtifactRow>> {
    return (await this.applyScope(
      supabase.from('ad_campaigns').select('*').eq('id', input.adCampaignId),
      input,
    ).maybeSingle()) as QueryResult<ArtifactRow>
  }

  async findAdSet(
    supabase: SupabaseClient,
    input: { adSetId: string; userId: string; orgId?: string | null },
  ): Promise<QueryResult<ArtifactRow>> {
    return (await this.applyScope(
      supabase.from('ad_sets').select('*').eq('id', input.adSetId),
      input,
    ).maybeSingle()) as QueryResult<ArtifactRow>
  }
}
