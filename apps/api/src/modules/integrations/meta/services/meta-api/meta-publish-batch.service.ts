import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleDriveApiService } from '../../../google-drive/services/google-drive-api.service'
import { MetaIntegration } from '../../integrations/meta.integration'
import { MetaPublishRepository } from '../../repositories/meta-publish.repository'
import type {
  MetaBatchPublishResult,
  MetaPublishCampaignInput,
  MetaTargeting,
} from '../../types/meta.types'
import { MetaOAuthService } from '../meta-oauth.service'
import { createMetaBatchAdCreative } from './meta-publish-batch-creative'
import { MetaPublishBatchPersistenceService } from './meta-publish-batch-persistence.service'
import { validateMetaPublishBatch } from './meta-publish-batch-validation'
import { MetaPublishSharedService } from './meta-publish-shared.service'

@Injectable()
export class MetaPublishBatchService {
  private readonly logger = new Logger(MetaPublishBatchService.name)

  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
    private readonly shared: MetaPublishSharedService,
    private readonly driveApi: GoogleDriveApiService,
    private readonly persistence: MetaPublishBatchPersistenceService,
    private readonly repository: MetaPublishRepository,
  ) {}

  async publishCampaignBatch(
    supabase: SupabaseClient,
    userId: string,
    input: MetaPublishCampaignInput,
  ): Promise<MetaBatchPublishResult> {
    const { data: adCampaign, error: adCampaignError } = await this.repository.findCampaignForBatch(
      supabase,
      userId,
      input.campaign_id,
    )

    if (adCampaignError || !adCampaign) {
      throw new BadRequestException('Ad campaign not found')
    }

    const adSets = ((adCampaign.ad_sets as Array<Record<string, unknown>> | null) ?? []).sort(
      (a, b) => String(a.id).localeCompare(String(b.id)),
    )
    const adCampaignMetadata = (adCampaign.metadata as Record<string, unknown> | null) ?? {}
    const adAccountId = String(
      input.ad_account_id ??
        adCampaign.meta_ad_account_id ??
        adCampaignMetadata.meta_ad_account_id ??
        '',
    ).trim()
    const pageId = String(
      input.page_id ?? adCampaign.meta_page_id ?? adCampaignMetadata.meta_page_id ?? '',
    ).trim()
    let instagramUserId = String(
      input.instagram_user_id ?? adCampaignMetadata.meta_instagram_user_id ?? '',
    ).trim()
    const pixelId = String(input.pixel_id ?? adCampaignMetadata.meta_pixel_id ?? '').trim()
    const customEventType = String(
      input.custom_event_type ?? adCampaignMetadata.meta_custom_event_type ?? '',
    ).trim()

    if (!adAccountId) {
      throw new BadRequestException(
        'Meta ad account is missing. Set it in campaign Settings > Ads or pass ad_account_id.',
      )
    }
    if (!pageId) {
      throw new BadRequestException(
        'Facebook page is missing. Set it in campaign Settings > Ads or pass page_id.',
      )
    }
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    instagramUserId = await this.shared.resolveInstagramUserId(
      accessToken,
      adAccountId,
      pageId,
      instagramUserId,
    )

    const budgetType =
      (input.budget_type as 'ABO' | 'CBO' | undefined) ??
      (adCampaign.budget_type as 'ABO' | 'CBO' | undefined) ??
      'ABO'
    const scheduleType =
      (input.schedule_type as 'continuous' | 'one_time' | undefined) ??
      (adCampaign.schedule_type as 'continuous' | 'one_time' | undefined) ??
      'continuous'
    const campaignDailyBudget =
      typeof input.daily_budget === 'number'
        ? input.daily_budget
        : ((adCampaign.daily_budget as number | null) ?? null)
    const campaignLifetimeBudget =
      typeof input.lifetime_budget === 'number'
        ? input.lifetime_budget
        : ((adCampaign.lifetime_budget as number | null) ?? null)
    const campaignObjective = this.shared.normalizeObjective(
      (input.campaign_objective as string | undefined) ??
        (adCampaign.objective as string | undefined),
    )

    const validationErrors = await validateMetaPublishBatch({
      shared: this.shared,
      accessToken,
      adAccountId,
      campaignId: input.campaign_id,
      campaignEndTime: adCampaign.end_time,
      adSets,
      input,
      budgetType,
      scheduleType,
      campaignDailyBudget,
      campaignLifetimeBudget,
      campaignObjective,
      pixelId,
    })

    if (validationErrors.length > 0) {
      return { success: false, campaign_id: input.campaign_id, validation_errors: validationErrors }
    }

    const campaignName = input.campaign_name || String(adCampaign.name ?? 'Vibey Campaign')
    const bidStrategy =
      (input.bid_strategy as string | undefined) ??
      (adCampaign.bid_strategy as string | undefined) ??
      'LOWEST_COST_WITHOUT_CAP'
    const existingMetaCampaignId =
      (adCampaign.meta_campaign_id as string | null) ??
      (adCampaignMetadata.meta_campaign_id as string | undefined) ??
      null
    const reusableMetaCampaignId = await this.shared.resolveReusableMetaObjectId(
      accessToken,
      existingMetaCampaignId,
      'campaign',
      input.campaign_id,
    )
    let campaign: { id: string }
    if (reusableMetaCampaignId !== null) {
      campaign = { id: reusableMetaCampaignId }
      const campaignUpdatePayload: Record<string, unknown> = {}
      if (campaignName) campaignUpdatePayload.name = campaignName
      if (budgetType === 'CBO') {
        if (scheduleType === 'continuous' && campaignDailyBudget)
          campaignUpdatePayload.daily_budget = campaignDailyBudget
        if (scheduleType === 'one_time' && campaignLifetimeBudget)
          campaignUpdatePayload.lifetime_budget = campaignLifetimeBudget
        campaignUpdatePayload.bid_strategy = bidStrategy
      }
      if (Object.keys(campaignUpdatePayload).length > 0) {
        await this.meta.updateCampaign(
          accessToken,
          reusableMetaCampaignId,
          campaignUpdatePayload as any,
        )
        this.logger.log(`Updated existing Meta campaign: ${reusableMetaCampaignId}`)
      }
    } else {
      campaign = await this.meta.createCampaign(accessToken, adAccountId, {
        name: campaignName,
        objective: campaignObjective as any,
        status: 'PAUSED',
        special_ad_categories: [],
        is_cbo: budgetType === 'CBO',
        daily_budget:
          scheduleType === 'continuous' ? (campaignDailyBudget ?? undefined) : undefined,
        lifetime_budget:
          scheduleType === 'one_time' ? (campaignLifetimeBudget ?? undefined) : undefined,
        bid_strategy: bidStrategy,
      })
      this.logger.log(`Created Meta campaign: ${campaign.id}`)
    }
    await this.persistence.persistCampaignMetaLink(
      supabase,
      userId,
      input.campaign_id,
      {
        metaCampaignId: campaign.id,
        adAccountId,
        pageId,
        instagramUserId,
        pixelId,
        customEventType,
        metadata: adCampaignMetadata,
      },
    )

    const publishedAt = new Date().toISOString()
    const publishedAdSets: Array<{ ad_set_id: string; meta_ad_set_id: string }> = []
    const publishedAds: Array<{
      ad_id: string
      ad_set_id: string
      meta_ad_id: string
      meta_ad_set_id: string
      meta_creative_id: string
    }> = []
    const stagedAdSetUpdates = new Map<string, Record<string, unknown>>()
    const stagedAdUpdates = new Map<string, Record<string, unknown>>()

    for (const adSet of adSets) {
      const adSetId = String(adSet.id)
      const ads = ((adSet.ads as Array<Record<string, unknown>> | null) ?? []).sort((a, b) =>
        String(a.id).localeCompare(String(b.id)),
      )
      const dsaName = campaignName.replace(/^Vibey - /, '') || 'Advertiser'
      const resolvedOptimizationGoal = this.shared.resolveOptimizationGoal(
        campaignObjective,
        adSet.optimization_goal as string | undefined,
      )
      const adSetInput: Parameters<typeof this.meta.createAdSet>[2] = {
        campaign_id: campaign.id,
        name: String(adSet.name ?? `${campaignName} - Ad Set`),
        billing_event: ((adSet.billing_event as string | undefined) ?? 'IMPRESSIONS') as any,
        optimization_goal: resolvedOptimizationGoal as any,
        targeting: ((input.targeting as MetaTargeting | undefined) ??
          (adSet.targeting as MetaTargeting | null) ??
          {}) as MetaTargeting,
        dsa_beneficiary: dsaName,
        dsa_payor: dsaName,
        status: 'PAUSED',
      }
      if (budgetType === 'ABO') {
        const adSetDailyBudget =
          typeof input.daily_budget === 'number'
            ? input.daily_budget
            : ((adSet.daily_budget as number | null) ?? null)
        const adSetLifetimeBudget =
          typeof input.lifetime_budget === 'number'
            ? input.lifetime_budget
            : ((adSet.lifetime_budget as number | null) ?? null)
        if (scheduleType === 'one_time' && adSetLifetimeBudget) {
          adSetInput.lifetime_budget = adSetLifetimeBudget
        } else if (adSetDailyBudget) {
          adSetInput.daily_budget = adSetDailyBudget
        }
      }
      if (scheduleType === 'one_time') {
        const startTime =
          input.start_time ??
          (adSet.start_time as string | null) ??
          (adCampaign.start_time as string | null) ??
          undefined
        const endTime =
          input.end_time ??
          (adSet.end_time as string | null) ??
          (adCampaign.end_time as string | null) ??
          undefined
        if (startTime) adSetInput.start_time = startTime
        if (endTime) adSetInput.end_time = endTime
      }
      if (pixelId) {
        adSetInput.promoted_object = {
          page_id: pageId,
          pixel_id: pixelId,
          custom_event_type: customEventType || 'PURCHASE',
        }
      }
      const adSetMetadata = (adSet.metadata as Record<string, unknown> | null) ?? {}
      const existingMetaAdSetId =
        (adSet.meta_adset_id as string | null) ??
        (adSetMetadata.meta_ad_set_id as string | undefined) ??
        (adSetMetadata.meta_adset_id as string | undefined) ??
        null
      const reusableMetaAdSetId = await this.shared.resolveReusableMetaObjectId(
        accessToken,
        existingMetaAdSetId,
        'ad_set',
        adSetId,
      )
      let createdMetaAdSet: { id: string }
      if (reusableMetaAdSetId !== null) {
        createdMetaAdSet = { id: reusableMetaAdSetId }
        const adSetUpdatePayload: Record<string, unknown> = {}
        if (adSetInput.name) adSetUpdatePayload.name = adSetInput.name
        if (adSetInput.targeting) adSetUpdatePayload.targeting = adSetInput.targeting
        if (adSetInput.optimization_goal)
          adSetUpdatePayload.optimization_goal = adSetInput.optimization_goal
        if (adSetInput.billing_event) adSetUpdatePayload.billing_event = adSetInput.billing_event
        if (adSetInput.daily_budget) adSetUpdatePayload.daily_budget = adSetInput.daily_budget
        if (adSetInput.lifetime_budget)
          adSetUpdatePayload.lifetime_budget = adSetInput.lifetime_budget
        if (adSetInput.start_time) adSetUpdatePayload.start_time = adSetInput.start_time
        if (adSetInput.end_time) adSetUpdatePayload.end_time = adSetInput.end_time
        if (adSetInput.promoted_object)
          adSetUpdatePayload.promoted_object = adSetInput.promoted_object
        if (Object.keys(adSetUpdatePayload).length > 0) {
          await this.meta.updateAdSet(accessToken, reusableMetaAdSetId, adSetUpdatePayload as any)
          this.logger.log(`Updated existing Meta ad set: ${reusableMetaAdSetId}`)
        }
      } else {
        createdMetaAdSet = await this.meta.createAdSet(accessToken, adAccountId, adSetInput)
        this.logger.log(`Created Meta ad set: ${createdMetaAdSet.id}`)
      }
      publishedAdSets.push({ ad_set_id: adSetId, meta_ad_set_id: createdMetaAdSet.id })
      const adSetPayload = this.persistence.buildAdSetPayload({
        metaCampaignId: campaign.id,
        metaAdSetId: createdMetaAdSet.id,
        adAccountId,
        pageId,
        instagramUserId,
        publishedAt,
        metadata: adSetMetadata,
      })
      stagedAdSetUpdates.set(adSetId, adSetPayload)
      await this.persistence.persistAdSetMetaLink(supabase, userId, adSetId, adSetPayload)

      for (const ad of ads) {
        const adId = String(ad.id)
        const batchAdMetadata = (ad.metadata as Record<string, unknown> | null) ?? {}
        const existingMetaAdId =
          (ad.meta_ad_id as string | null) ??
          (batchAdMetadata.meta_ad_id as string | undefined) ??
          null
        const reusableMetaAdId = await this.shared.resolveReusableMetaObjectId(
          accessToken,
          existingMetaAdId,
          'ad',
          adId,
        )
        let metaCreativeId =
          (batchAdMetadata.meta_creative_id as string | undefined) ??
          (batchAdMetadata.meta_creativeid as string | undefined) ??
          ''
        let createdMetaAd: { id: string }
        try {
          if (reusableMetaAdId !== null) {
            createdMetaAd = { id: reusableMetaAdId }
          } else {
            const created = await createMetaBatchAdCreative({
              supabase,
              userId,
              meta: this.meta,
              driveApi: this.driveApi,
              logger: this.logger,
              accessToken,
              adAccountId,
              pageId,
              instagramUserId,
              campaignName,
              metaAdSetId: createdMetaAdSet.id,
              ad,
              batchAdMetadata,
            })
            createdMetaAd = created.createdMetaAd
            metaCreativeId = created.metaCreativeId
          }
        } catch (adError) {
          const errMsg = adError instanceof Error ? adError.message : String(adError)
          await this.persistence.persistAdUpdatesAfterPartialFailure(
            supabase,
            userId,
            stagedAdUpdates,
            this.logger,
          )
          throw new BadRequestException(
            `Partially published: campaign and ad sets were saved. Retry will reuse them. Ad failed (${adId}): ${errMsg}`,
          )
        }
        if (reusableMetaAdId !== null) {
          await this.meta.updateObjectStatus(accessToken, reusableMetaAdId, 'PAUSED')
        }

        publishedAds.push({
          ad_id: adId,
          ad_set_id: adSetId,
          meta_ad_id: createdMetaAd.id,
          meta_ad_set_id: createdMetaAdSet.id,
          meta_creative_id: metaCreativeId,
        })

        let adRuleId = (batchAdMetadata.meta_ad_rule_id as string | undefined) ?? ''
        try {
          if (!adRuleId) {
            const adRule = await this.meta.createAdRule(accessToken, adAccountId, {
              name: `Vibey Status Sync - ${createdMetaAd.id}`,
              meta_ad_id: createdMetaAd.id,
            })
            adRuleId = adRule.id
          }
        } catch (adRuleError) {
          const message = adRuleError instanceof Error ? adRuleError.message : String(adRuleError)
          this.logger.warn(`Ad ${adId} published but failed to create Meta ad rule: ${message}`)
        }
        stagedAdUpdates.set(
          adId,
          this.persistence.buildAdPayload({
            metaCampaignId: campaign.id,
            metaAdSetId: createdMetaAdSet.id,
            metaCreativeId,
            metaAdId: createdMetaAd.id,
            adRuleId,
            adAccountId,
            pageId,
            instagramUserId,
            publishedAt,
            metadata: batchAdMetadata,
          }),
        )
      }
    }
    await this.persistence.syncPublishedBatch({
      supabase,
      userId,
      campaignId: input.campaign_id,
      metaCampaignId: campaign.id,
      adAccountId,
      pageId,
      instagramUserId,
      pixelId,
      customEventType,
      publishedAt,
      campaignMetadata: adCampaignMetadata,
      stagedAdSetUpdates,
      stagedAdUpdates,
    })

    return {
      success: true,
      campaign_id: input.campaign_id,
      meta_campaign_id: campaign.id,
      total_ad_sets: adSets.length,
      total_ads: publishedAds.length,
      published_ad_sets: publishedAdSets,
      published_ads: publishedAds,
    }
  }
}
