import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaIntegration } from '../../integrations/meta.integration'
import { MetaPublishRepository } from '../../repositories/meta-publish.repository'
import type { MetaAdSetInput, MetaPublishAdInput } from '../../types/meta.types'
import { MetaOAuthService } from '../meta-oauth.service'
import { MetaPublishMediaService } from './meta-publish-media.service'
import { MetaPublishSharedService } from './meta-publish-shared.service'

@Injectable()
export class MetaPublishSingleService {
  private readonly logger = new Logger(MetaPublishSingleService.name)

  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
    private readonly shared: MetaPublishSharedService,
    private readonly media: MetaPublishMediaService,
    private readonly repository: MetaPublishRepository,
  ) {}

  async publishAd(
    supabase: SupabaseClient,
    userId: string,
    input: MetaPublishAdInput,
  ): Promise<{
    meta_campaign_id: string
    meta_ad_set_id: string
    meta_creative_id: string
    meta_ad_id: string
  }> {
    const { data: adRow, error: adError } = await this.repository.findAdForPublish(
      supabase,
      userId,
      input.ad_id,
    )

    if (adError || !adRow) throw new BadRequestException('Ad not found')
    const ad = adRow as Record<string, any>
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    const adAccountId = input.ad_account_id
    const pageId = String(input.page_id ?? '').trim()
    if (!pageId) {
      throw new BadRequestException('Facebook page is missing. Pass page_id.')
    }
    const instagramUserId = await this.shared.resolveInstagramUserId(
      accessToken,
      adAccountId,
      pageId,
      input.instagram_user_id,
    )

    const adFormat = (ad.ad_format as string | null) || 'SINGLE_IMAGE'
    const {
      imageHash,
      placementHashes,
      videoId,
      carouselImageHashes,
      useAssetFeed,
    } = await this.media.resolveAdMedia(supabase, userId, accessToken, adAccountId, ad, adFormat)

    const campaignName = input.campaign_name || `Vibey - ${ad.headline || 'Campaign'}`
    const isCbo = input.budget_type === 'CBO'
    const isOneTime = input.schedule_type === 'one_time'

    const campaignObjective = this.shared.normalizeObjective(input.campaign_objective)
    const campaignInput: Parameters<typeof this.meta.createCampaign>[2] = {
      name: campaignName,
      objective: campaignObjective,
      status: 'PAUSED',
      special_ad_categories: [],
      is_cbo: isCbo,
    }

    if (isCbo) {
      campaignInput.bid_strategy = input.bid_strategy || 'LOWEST_COST_WITHOUT_CAP'
      if (isOneTime && input.lifetime_budget) {
        campaignInput.lifetime_budget = input.lifetime_budget
      } else {
        campaignInput.daily_budget = input.daily_budget
      }
    }

    type LinkedAdSetRow = {
      id: string
      ad_campaign_id: string | null
      meta_adset_id: string | null
      metadata: Record<string, unknown> | null
    }
    type LinkedCampaignRow = {
      id: string
      meta_campaign_id: string | null
      metadata: Record<string, unknown> | null
    }
    let linkedAdSet: LinkedAdSetRow | null = null
    if (ad.ad_set_id) {
      const { data: linkedAdSetRow } = await this.repository.findLinkedAdSet(
        supabase,
        userId,
        String(ad.ad_set_id),
      )
      linkedAdSet = (linkedAdSetRow as LinkedAdSetRow | null) ?? null
    }
    let linkedCampaign: LinkedCampaignRow | null = null
    if (linkedAdSet?.ad_campaign_id) {
      const { data: linkedCampaignRow } = await this.repository.findLinkedCampaign(
        supabase,
        userId,
        linkedAdSet.ad_campaign_id,
      )
      linkedCampaign = (linkedCampaignRow as LinkedCampaignRow | null) ?? null
    }
    const linkedCampaignMetadata =
      (linkedCampaign?.metadata as Record<string, unknown> | null) ?? {}
    const existingMetaCampaignId =
      (linkedCampaign?.meta_campaign_id as string | null) ??
      (linkedCampaignMetadata.meta_campaign_id as string | undefined) ??
      null
    const reusableMetaCampaignId = await this.shared.resolveReusableMetaObjectId(
      accessToken,
      existingMetaCampaignId,
      'campaign',
      String(linkedCampaign?.id ?? input.ad_id),
    )
    const campaign =
      reusableMetaCampaignId !== null
        ? { id: reusableMetaCampaignId }
        : await this.meta.createCampaign(accessToken, adAccountId, campaignInput)
    if (!reusableMetaCampaignId) {
      this.logger.log(`Created Meta campaign: ${campaign.id}`)
    }
    if (linkedAdSet?.ad_campaign_id) {
      const { error: campaignUpdateError } = await this.repository.updateCampaign(
        supabase,
        userId,
        linkedAdSet.ad_campaign_id,
        {
          meta_campaign_id: campaign.id,
          meta_ad_account_id: adAccountId,
          meta_page_id: pageId,
          metadata: {
            ...linkedCampaignMetadata,
            meta_campaign_id: campaign.id,
            meta_ad_account_id: adAccountId,
            meta_page_id: pageId,
          },
        },
      )
      if (campaignUpdateError) {
        throw new BadRequestException(
          `Failed to persist campaign Meta ID: ${campaignUpdateError.message}`,
        )
      }
    }

    const adSetName = input.adset_name || `${campaignName} - Ad Set`
    const dsaName = campaignName.replace(/^Vibey - /, '') || 'Advertiser'

    const optimizationGoal = this.shared.resolveOptimizationGoal(campaignObjective, undefined)
    const resolvedPixelId = String(input.pixel_id ?? '').trim()
    await this.shared.ensurePixelPreflight(
      accessToken,
      adAccountId,
      optimizationGoal,
      resolvedPixelId,
    )
    const adSetInput: MetaAdSetInput = {
      campaign_id: campaign.id,
      name: adSetName,
      billing_event: 'IMPRESSIONS',
      optimization_goal: optimizationGoal as any,
      targeting: input.targeting,
      dsa_beneficiary: dsaName,
      dsa_payor: dsaName,
      status: 'PAUSED',
    }

    if (resolvedPixelId) {
      adSetInput.promoted_object = {
        page_id: pageId,
        pixel_id: resolvedPixelId,
        custom_event_type: input.custom_event_type || 'PURCHASE',
      }
    }

    if (!isCbo) {
      if (isOneTime && input.lifetime_budget) {
        adSetInput.lifetime_budget = input.lifetime_budget
      } else {
        adSetInput.daily_budget = input.daily_budget
      }
    }

    if (isOneTime) {
      if (input.start_time) adSetInput.start_time = input.start_time
      if (input.end_time) adSetInput.end_time = input.end_time
    }

    const linkedAdSetMetadata = (linkedAdSet?.metadata as Record<string, unknown> | null) ?? {}
    const existingMetaAdSetId =
      (linkedAdSet?.meta_adset_id as string | null) ??
      (linkedAdSetMetadata.meta_ad_set_id as string | undefined) ??
      (linkedAdSetMetadata.meta_adset_id as string | undefined) ??
      null
    const reusableMetaAdSetId = await this.shared.resolveReusableMetaObjectId(
      accessToken,
      existingMetaAdSetId,
      'ad_set',
      String(linkedAdSet?.id ?? ad.ad_set_id ?? input.ad_id),
    )
    const adSet =
      reusableMetaAdSetId !== null
        ? { id: reusableMetaAdSetId }
        : await this.meta.createAdSet(accessToken, adAccountId, adSetInput)
    if (!reusableMetaAdSetId) {
      this.logger.log(`Created Meta ad set: ${adSet.id}`)
    }
    if (ad.ad_set_id) {
      const { error: adSetUpdateError } = await this.repository.updateAdSet(
        supabase,
        userId,
        String(ad.ad_set_id),
        {
          meta_adset_id: adSet.id,
          metadata: {
            ...linkedAdSetMetadata,
            meta_campaign_id: campaign.id,
            meta_ad_set_id: adSet.id,
            meta_adset_id: adSet.id,
            meta_ad_account_id: adAccountId,
            meta_page_id: pageId,
          },
        },
      )
      if (adSetUpdateError) {
        throw new BadRequestException(
          `Failed to persist ad set Meta ID: ${adSetUpdateError.message}`,
        )
      }
    }

    let creative: { id: string }

    if (adFormat === 'SINGLE_VIDEO' && videoId) {
      creative = await this.meta.createVideoCreative(accessToken, adAccountId, {
        name: `${campaignName} - Creative`,
        page_id: pageId,
        ...(instagramUserId ? { instagram_user_id: instagramUserId } : {}),
        video_id: videoId,
        message: ad.primary_text,
        headline: ad.headline,
        description: ad.description ?? undefined,
        link: ad.destination_url,
        image_hash: imageHash,
        call_to_action_type: ad.cta_type ?? undefined,
      })
      this.logger.log(`Created Meta video creative: ${creative.id}`)
    } else if (adFormat === 'CAROUSEL' && carouselImageHashes.length >= 2) {
      creative = await this.meta.createCarouselCreative(accessToken, adAccountId, {
        name: `${campaignName} - Creative`,
        page_id: pageId,
        ...(instagramUserId ? { instagram_user_id: instagramUserId } : {}),
        message: ad.primary_text,
        link: ad.destination_url,
        call_to_action_type: ad.cta_type ?? undefined,
        child_attachments: carouselImageHashes.map((h) => ({
          image_hash: h.hash,
          link: h.link,
          name: h.name,
          description: h.description,
        })),
      })
      this.logger.log(`Created Meta carousel creative: ${creative.id}`)
    } else if (useAssetFeed && placementHashes.length >= 2) {
      const rules = this.media.buildPlacementRules(placementHashes)
      creative = await this.meta.createAdCreativeWithAssetFeed(accessToken, adAccountId, {
        name: `${campaignName} - Creative`,
        page_id: pageId,
        ...(instagramUserId ? { instagram_user_id: instagramUserId } : {}),
        images: placementHashes.map((ph) => ({ hash: ph.hash, label: ph.label })),
        message: ad.primary_text,
        headline: ad.headline,
        description: ad.description ?? undefined,
        link: ad.destination_url,
        call_to_action_type: ad.cta_type ?? undefined,
        customization_rules: rules,
      })
      this.logger.log(`Created Meta asset-feed creative: ${creative.id}`)
    } else {
      creative = await this.meta.createAdCreative(accessToken, adAccountId, {
        name: `${campaignName} - Creative`,
        page_id: pageId,
        ...(instagramUserId ? { instagram_user_id: instagramUserId } : {}),
        image_hash: imageHash!,
        message: ad.primary_text,
        headline: ad.headline,
        description: ad.description ?? undefined,
        link: ad.destination_url,
        call_to_action_type: ad.cta_type ?? undefined,
      })
      this.logger.log(`Created Meta creative: ${creative.id}`)
    }

    const adMetadata = (ad.metadata as Record<string, unknown> | null) ?? {}
    const metaAdName = (adMetadata.meta_ad_name as string | undefined) || ad.headline || 'Vibey Ad'
    const existingMetaAdId =
      (ad.meta_ad_id as string | null) ?? (adMetadata.meta_ad_id as string | undefined) ?? null
    const reusableMetaAdId = await this.shared.resolveReusableMetaObjectId(
      accessToken,
      existingMetaAdId,
      'ad',
      input.ad_id,
    )
    let metaAd: { id: string }
    if (reusableMetaAdId !== null) {
      metaAd = { id: reusableMetaAdId }
      await this.meta.updateAdCreative(accessToken, reusableMetaAdId, creative.id)
      this.logger.log(`Updated existing Meta ad ${metaAd.id} with new creative: ${creative.id}`)
      await this.meta.updateObjectStatus(accessToken, reusableMetaAdId, 'PAUSED')
    } else {
      metaAd = await this.meta.createAd(accessToken, adAccountId, {
        name: metaAdName,
        adset_id: adSet.id,
        creative_id: creative.id,
        status: 'PAUSED',
      })
      this.logger.log(`Created Meta ad: ${metaAd.id}`)
    }

    const publishedAt = new Date().toISOString()
    const stagedUpdates: Array<{
      table: 'ads' | 'ad_sets' | 'ad_campaigns'
      id: string
      payload: Record<string, unknown>
    }> = [
      {
        table: 'ads',
        id: input.ad_id,
        payload: {
          meta_ad_id: metaAd.id,
          meta_effective_status: 'PAUSED',
          metadata: {
            ...adMetadata,
            meta_campaign_id: campaign.id,
            meta_ad_set_id: adSet.id,
            meta_adset_id: adSet.id,
            meta_creative_id: creative.id,
            meta_ad_id: metaAd.id,
            meta_ad_account_id: adAccountId,
            meta_page_id: pageId,
            meta_instagram_user_id: instagramUserId,
            meta_status: 'PAUSED',
            meta_published_at: publishedAt,
          },
        },
      },
    ]
    if (ad.ad_set_id) {
      stagedUpdates.push({
        table: 'ad_sets',
        id: String(ad.ad_set_id),
        payload: {
          meta_adset_id: adSet.id,
          meta_effective_status: 'PAUSED',
          metadata: {
            ...linkedAdSetMetadata,
            meta_campaign_id: campaign.id,
            meta_ad_set_id: adSet.id,
            meta_adset_id: adSet.id,
            meta_ad_account_id: adAccountId,
            meta_page_id: pageId,
            meta_instagram_user_id: instagramUserId,
            meta_status: 'PAUSED',
            meta_published_at: publishedAt,
          },
        },
      })
      if (linkedAdSet?.ad_campaign_id) {
        stagedUpdates.push({
          table: 'ad_campaigns',
          id: String(linkedAdSet.ad_campaign_id),
          payload: {
            meta_campaign_id: campaign.id,
            meta_effective_status: 'PAUSED',
            meta_ad_account_id: adAccountId,
            meta_page_id: pageId,
            metadata: {
              ...linkedCampaignMetadata,
              meta_campaign_id: campaign.id,
              meta_ad_account_id: adAccountId,
              meta_page_id: pageId,
              meta_instagram_user_id: instagramUserId,
              meta_status: 'PAUSED',
              meta_published_at: publishedAt,
            },
          },
        })
      }
    } else {
      this.logger.warn(
        `Ad ${input.ad_id} is ungrouped (no ad_set_id). Skipping ad_set/ad_campaign Meta ID sync.`,
      )
    }

    let adRuleId: string | null = null
    try {
      const adRule = await this.meta.createAdRule(accessToken, adAccountId, {
        name: `Vibey Status Sync - ${metaAd.id}`,
        meta_ad_id: metaAd.id,
      })
      adRuleId = adRule.id
    } catch (adRuleError) {
      const message = adRuleError instanceof Error ? adRuleError.message : String(adRuleError)
      this.logger.warn(`Ad published but failed to create Meta ad rule: ${message}`)
    }
    if (adRuleId) {
      const adUpdate = stagedUpdates[0]!
      adUpdate.payload = {
        ...adUpdate.payload,
        metadata: {
          ...((adUpdate.payload.metadata as Record<string, unknown>) ?? {}),
          meta_ad_rule_id: adRuleId,
        },
      }
    }
    for (const update of stagedUpdates) {
      const { error: updateError } = await this.repository.updatePublishTable(
        supabase,
        userId,
        update.table,
        update.id,
        update.payload,
      )
      if (updateError) {
        throw new BadRequestException(
          `Failed to sync ${update.table} Meta IDs for ${update.id}: ${updateError.message}`,
        )
      }
    }

    return {
      meta_campaign_id: campaign.id,
      meta_ad_set_id: adSet.id,
      meta_creative_id: creative.id,
      meta_ad_id: metaAd.id,
    }
  }
}
