import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaIntegration } from '../../integrations/meta.integration'
import { MetaSyncRepository } from '../../repositories/meta-sync.repository'
import type {
  MetaFetchedAd,
  MetaFetchedAdSet,
  MetaFetchedCampaign,
  MetaFetchedHierarchy,
} from '../../types/meta.types'
import { MetaOAuthService } from '../meta-oauth.service'
import { MetaPublishSharedService } from './meta-publish-shared.service'

export type SyncResult = {
  campaigns_created: number
  campaigns_updated: number
  ad_sets_created: number
  ad_sets_updated: number
  ads_created: number
  ads_updated: number
  total_campaigns: number
  total_ad_sets: number
  total_ads: number
}

@Injectable()
export class MetaSyncService {
  private readonly logger = new Logger(MetaSyncService.name)

  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
    private readonly publishShared: MetaPublishSharedService,
    private readonly repository: MetaSyncRepository,
  ) {}

  /**
   * Sync the full ad hierarchy from a Meta ad account into a Vibey campaign.
   * Reconciles by meta_*_id: updates existing rows, creates new ones with source='meta'.
   */
  async syncAdAccount(
    supabase: SupabaseClient,
    userId: string,
    vibeyStoreCampaignId: string,
    adAccountId: string,
  ): Promise<SyncResult> {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    this.logger.log(
      `Starting sync for ad account ${adAccountId} into campaign ${vibeyStoreCampaignId}`,
    )

    const hierarchy = await this.meta.fetchFullHierarchy(accessToken, adAccountId)

    const result: SyncResult = {
      campaigns_created: 0,
      campaigns_updated: 0,
      ad_sets_created: 0,
      ad_sets_updated: 0,
      ads_created: 0,
      ads_updated: 0,
      total_campaigns: hierarchy.total_campaigns,
      total_ad_sets: hierarchy.total_ad_sets,
      total_ads: hierarchy.total_ads,
    }

    for (const metaCampaign of hierarchy.campaigns) {
      const adCampaignId = await this.reconcileCampaign(
        supabase,
        userId,
        vibeyStoreCampaignId,
        adAccountId,
        metaCampaign,
        result,
      )

      for (const metaAdSet of metaCampaign.ad_sets) {
        const adSetId = await this.reconcileAdSet(
          supabase,
          userId,
          vibeyStoreCampaignId,
          adCampaignId,
          metaAdSet,
          result,
        )

        for (const metaAd of metaAdSet.ads) {
          await this.reconcileAd(supabase, userId, vibeyStoreCampaignId, adSetId, metaAd, result)
        }
      }
    }

    this.logger.log(
      `Sync complete: ${result.campaigns_created} created / ${result.campaigns_updated} updated campaigns, ` +
        `${result.ad_sets_created} created / ${result.ad_sets_updated} updated ad sets, ` +
        `${result.ads_created} created / ${result.ads_updated} updated ads`,
    )

    return result
  }

  private async reconcileCampaign(
    supabase: SupabaseClient,
    userId: string,
    vibeyStoreCampaignId: string,
    adAccountId: string,
    meta: MetaFetchedCampaign,
    result: SyncResult,
  ): Promise<string> {
    const existing = await this.repository.findCampaignByMetaId(supabase, userId, meta.id)

    const dailyBudget = meta.daily_budget ? Number(meta.daily_budget) / 100 : null
    const lifetimeBudget = meta.lifetime_budget ? Number(meta.lifetime_budget) / 100 : null
    const objective = this.publishShared.normalizeObjective(meta.objective)
    const campaignMetadata = this.campaignMetadataWithRawObjective(meta, existing?.metadata)

    if (existing) {
      await this.repository.updateCampaign(supabase, String(existing.id), {
        name: meta.name,
        objective,
        metadata: campaignMetadata,
        meta_effective_status: meta.effective_status ?? null,
        daily_budget: dailyBudget,
        lifetime_budget: lifetimeBudget,
        meta_ad_account_id: adAccountId,
        updated_at: new Date().toISOString(),
      })

      result.campaigns_updated++
      return String(existing.id)
    }

    const { data: created, error } = await this.repository.insertCampaign(supabase, {
      user_id: userId,
      campaign_id: vibeyStoreCampaignId,
      name: meta.name,
      objective,
      meta_campaign_id: meta.id,
      meta_ad_account_id: adAccountId,
      meta_effective_status: meta.effective_status ?? null,
      daily_budget: dailyBudget,
      lifetime_budget: lifetimeBudget,
      source: 'meta',
      metadata: campaignMetadata,
    })

    if (error || !created) {
      this.logger.error(
        `Failed to create ad campaign for meta campaign ${meta.id}: ${error?.message}`,
      )
      throw new BadRequestException(`Failed to sync campaign: ${meta.name}`)
    }

    result.campaigns_created++
    return String(created.id)
  }

  private async reconcileAdSet(
    supabase: SupabaseClient,
    userId: string,
    vibeyStoreCampaignId: string,
    adCampaignId: string,
    meta: MetaFetchedAdSet,
    result: SyncResult,
  ): Promise<string> {
    const existing = await this.repository.findAdSetByMetaId(supabase, userId, meta.id)

    const dailyBudget = meta.daily_budget ? Number(meta.daily_budget) / 100 : null
    const lifetimeBudget = meta.lifetime_budget ? Number(meta.lifetime_budget) / 100 : null

    if (existing) {
      await this.repository.updateAdSet(supabase, String(existing.id), {
        name: meta.name,
        ad_campaign_id: adCampaignId,
        meta_effective_status: meta.effective_status ?? null,
        daily_budget: dailyBudget,
        lifetime_budget: lifetimeBudget,
        targeting: meta.targeting ?? null,
        optimization_goal: meta.optimization_goal ?? null,
        billing_event: meta.billing_event ?? null,
        start_time: meta.start_time ?? null,
        end_time: meta.end_time ?? null,
        updated_at: new Date().toISOString(),
      })

      result.ad_sets_updated++
      return String(existing.id)
    }

    const { data: created, error } = await this.repository.insertAdSet(supabase, {
      user_id: userId,
      campaign_id: vibeyStoreCampaignId,
      ad_campaign_id: adCampaignId,
      name: meta.name,
      meta_adset_id: meta.id,
      meta_effective_status: meta.effective_status ?? null,
      daily_budget: dailyBudget,
      lifetime_budget: lifetimeBudget,
      targeting: meta.targeting ?? null,
      optimization_goal: meta.optimization_goal ?? null,
      billing_event: meta.billing_event ?? null,
      start_time: meta.start_time ?? null,
      end_time: meta.end_time ?? null,
      source: 'meta',
    })

    if (error || !created) {
      this.logger.error(`Failed to create ad set for meta ad set ${meta.id}: ${error?.message}`)
      throw new BadRequestException(`Failed to sync ad set: ${meta.name}`)
    }

    result.ad_sets_created++
    return String(created.id)
  }

  private async reconcileAd(
    supabase: SupabaseClient,
    userId: string,
    vibeyStoreCampaignId: string,
    adSetId: string,
    meta: MetaFetchedAd,
    result: SyncResult,
  ): Promise<string> {
    const existing = await this.repository.findAdByMetaId(supabase, userId, meta.id)

    const creative = meta.creative
    const imageUrl = this.extractImageUrl(creative)
    const primaryText = this.extractPrimaryText(creative) ?? ''
    const headline = creative?.title ?? ''
    const ctaType = creative?.call_to_action_type ?? null

    if (existing) {
      await this.repository.updateAd(supabase, String(existing.id), {
        name: meta.name,
        ad_set_id: adSetId,
        meta_effective_status: meta.effective_status ?? null,
        image_url: imageUrl,
        primary_text: primaryText,
        headline,
        cta_type: ctaType,
        updated_at: new Date().toISOString(),
      })

      result.ads_updated++
      return String(existing.id)
    }

    const { data: created, error } = await this.repository.insertAd(supabase, {
      user_id: userId,
      campaign_id: vibeyStoreCampaignId,
      ad_set_id: adSetId,
      name: meta.name,
      meta_ad_id: meta.id,
      meta_effective_status: meta.effective_status ?? null,
      image_url: imageUrl,
      primary_text: primaryText,
      headline,
      cta_type: ctaType,
      source: 'meta',
      metadata: {
        meta_creative_id: creative?.id ?? null,
        synced_at: new Date().toISOString(),
      },
    })

    if (error || !created) {
      this.logger.error(`Failed to create ad for meta ad ${meta.id}: ${error?.message}`)
      throw new BadRequestException(`Failed to sync ad: ${meta.name}`)
    }

    result.ads_created++
    return String(created.id)
  }

  private campaignMetadataWithRawObjective(
    meta: MetaFetchedCampaign,
    previous: unknown,
  ): Record<string, unknown> {
    const prev =
      previous && typeof previous === 'object' && !Array.isArray(previous)
        ? (previous as Record<string, unknown>)
        : {}
    return { ...prev, meta_objective_raw: meta.objective ?? null }
  }

  private extractImageUrl(creative?: MetaFetchedAd['creative']): string | null {
    if (!creative) return null
    if (creative.image_url) return creative.image_url
    if (creative.thumbnail_url) return creative.thumbnail_url

    const oss = creative.object_story_spec as Record<string, unknown> | undefined
    if (oss) {
      const linkData = oss.link_data as Record<string, unknown> | undefined
      if (linkData?.image_url) return linkData.image_url as string
      if (linkData?.picture) return linkData.picture as string

      const videoData = oss.video_data as Record<string, unknown> | undefined
      if (videoData?.image_url) return videoData.image_url as string
    }

    return null
  }

  private extractPrimaryText(creative?: MetaFetchedAd['creative']): string | null {
    if (!creative) return null
    if (creative.body) return creative.body

    const oss = creative.object_story_spec as Record<string, unknown> | undefined
    if (oss) {
      const linkData = oss.link_data as Record<string, unknown> | undefined
      if (linkData?.message) return linkData.message as string

      const videoData = oss.video_data as Record<string, unknown> | undefined
      if (videoData?.message) return videoData.message as string
    }

    return null
  }
}
