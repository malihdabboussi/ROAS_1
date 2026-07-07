import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaIntegration } from '../../integrations/meta.integration'
import type {
  MetaFetchedAd,
  MetaFetchedAdSet,
  MetaFetchedCampaign,
  MetaFetchedCreative,
  MetaFetchedHierarchy,
} from '../../types/meta.types'
import { MetaOAuthService } from '../meta-oauth.service'

@Injectable()
export class MetaFetchService {
  private readonly logger = new Logger(MetaFetchService.name)

  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
  ) {}

  async listCampaigns(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
  ): Promise<MetaFetchedCampaign[]> {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.fetchCampaigns(accessToken, adAccountId)
  }

  async listAdSets(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<MetaFetchedAdSet[]> {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.fetchAdSets(accessToken, campaignId)
  }

  async listAds(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
  ): Promise<MetaFetchedAd[]> {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.fetchAds(accessToken, adSetId)
  }

  async getAdCreative(
    supabase: SupabaseClient,
    userId: string,
    creativeId: string,
  ): Promise<MetaFetchedCreative | null> {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.fetchAdCreative(accessToken, creativeId)
  }

  async getFullHierarchy(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
  ): Promise<MetaFetchedHierarchy> {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    this.logger.log(`Fetching full ad hierarchy for ad account ${adAccountId}`)
    return this.meta.fetchFullHierarchy(accessToken, adAccountId)
  }
}
