import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaIntegration } from '../../integrations/meta.integration'
import { MetaAccountsRepository } from '../../repositories/meta-accounts.repository'
import { MetaOAuthService } from '../meta-oauth.service'

@Injectable()
export class MetaAccountsService {
  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
    private readonly repository?: MetaAccountsRepository,
  ) {}

  async getAdAccounts(supabase: SupabaseClient, userId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getAdAccounts(accessToken)
  }

  async getPages(supabase: SupabaseClient, userId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getPages(accessToken)
  }

  async getPageInfo(supabase: SupabaseClient, userId: string, pageId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getPageInfo(accessToken, pageId)
  }

  async getPixels(supabase: SupabaseClient, userId: string, adAccountId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getPixels(accessToken, adAccountId)
  }

  async getAdImages(supabase: SupabaseClient, userId: string, adAccountId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getAdImages(accessToken, adAccountId)
  }

  async createPixel(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
    input: { name: string; description?: string; data_use_setting?: string },
  ) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.createPixel(accessToken, adAccountId, input)
  }

  async getCustomAudiences(supabase: SupabaseClient, userId: string, adAccountId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getCustomAudiences(accessToken, adAccountId)
  }

  async createCustomAudience(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
    input: { name: string; rule?: Record<string, unknown>; retention_days?: number },
  ) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.createCustomAudience(accessToken, adAccountId, input)
  }

  async createLookalikeAudience(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
    input: { name: string; origin_audience_id: string; country: string; ratio?: number },
  ) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.createLookalikeAudience(accessToken, adAccountId, input)
  }

  async getCustomConversions(supabase: SupabaseClient, userId: string, adAccountId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getCustomConversions(accessToken, adAccountId)
  }

  async createCustomConversion(
    supabase: SupabaseClient,
    userId: string,
    adAccountId: string,
    input: { name: string; event_source_id: string; custom_event_type: string; rule?: string },
  ) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.createCustomConversion(accessToken, adAccountId, input)
  }

  async getInstagramAccountsForPage(supabase: SupabaseClient, userId: string, pageId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getInstagramAccountsForPage(accessToken, pageId)
  }

  async searchCountries(supabase: SupabaseClient, userId: string, query: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.searchCountries(accessToken, query)
  }

  async searchLocations(supabase: SupabaseClient, userId: string, query: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.searchLocations(accessToken, query)
  }

  async searchInterests(supabase: SupabaseClient, userId: string, query: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.searchInterests(accessToken, query)
  }

  async getDeliveryEstimate(supabase: SupabaseClient, userId: string, adSetId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)

    const { data: adSet, error: adSetError } = await this.getRepository().findDeliveryAdSet(
      supabase,
      userId,
      adSetId,
    )

    if (adSetError || !adSet) throw new BadRequestException('Ad set not found')

    const targeting = (adSet.targeting as Record<string, unknown>) ?? {}
    const geoCountries =
      ((targeting.geo_locations as Record<string, unknown>)?.countries as string[]) ?? []
    const isWorldwide = geoCountries.includes('WW') || geoCountries.length === 0
    if (!targeting.geo_locations && !isWorldwide) {
      throw new BadRequestException(
        'Ad set must have targeting with geo_locations to get delivery estimate',
      )
    }

    if (isWorldwide && !targeting.geo_locations) {
      targeting.geo_locations = { countries: ['US'] }
    }

    let adAccountId: string | null = null
    if (adSet.ad_campaign_id) {
      const adCampaign = await this.getRepository().findCampaignMetadata(
        supabase,
        userId,
        adSet.ad_campaign_id as string,
      )

      const metadata = (adCampaign?.metadata as Record<string, unknown> | null) ?? {}
      adAccountId = (metadata.meta_ad_account_id as string | undefined) ?? null
    }

    if (!adAccountId) {
      const integration = await this.getRepository().findDefaultConnectedMetaIntegration(
        supabase,
        userId,
      )

      const intMetadata = (integration?.metadata as Record<string, unknown> | null) ?? {}
      const adAccounts = (intMetadata.ad_accounts as Array<{ id: string }>) ?? []
      adAccountId = adAccounts[0]?.id ?? null
    }

    if (!adAccountId) {
      throw new BadRequestException('No Meta ad account found. Connect Meta first.')
    }

    const DELIVERY_ESTIMATE_GOALS: Record<string, string> = {
      REACH: 'IMPRESSIONS',
      LANDING_PAGE_VIEWS: 'LINK_CLICKS',
      CONVERSIONS: 'OFFSITE_CONVERSIONS',
    }
    const rawGoal = (adSet.optimization_goal as string) || 'LINK_CLICKS'
    const estimateGoal = DELIVERY_ESTIMATE_GOALS[rawGoal] ?? rawGoal

    return this.meta.getDeliveryEstimate(accessToken, adAccountId, targeting, estimateGoal)
  }

  private getRepository(): MetaAccountsRepository {
    if (!this.repository) {
      throw new BadRequestException('Meta accounts repository is not configured')
    }
    return this.repository
  }
}
