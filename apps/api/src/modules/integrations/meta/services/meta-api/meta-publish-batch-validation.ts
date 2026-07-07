import type {
  MetaBatchValidationIssue,
  MetaCampaignObjective,
  MetaPublishCampaignInput,
} from '../../types/meta.types'
import type { MetaPublishSharedService } from './meta-publish-shared.service'

type MetaBatchValidationInput = {
  shared: MetaPublishSharedService
  accessToken: string
  adAccountId: string
  campaignId: string
  campaignEndTime: unknown
  adSets: Array<Record<string, unknown>>
  input: MetaPublishCampaignInput
  budgetType: 'ABO' | 'CBO'
  scheduleType: 'continuous' | 'one_time'
  campaignDailyBudget: number | null
  campaignLifetimeBudget: number | null
  campaignObjective: MetaCampaignObjective
  pixelId: string
}

export async function validateMetaPublishBatch({
  shared,
  accessToken,
  adAccountId,
  campaignId,
  campaignEndTime,
  adSets,
  input,
  budgetType,
  scheduleType,
  campaignDailyBudget,
  campaignLifetimeBudget,
  campaignObjective,
  pixelId,
}: MetaBatchValidationInput): Promise<MetaBatchValidationIssue[]> {
  const validationErrors: MetaBatchValidationIssue[] = []
  if (adSets.length === 0) {
    validationErrors.push({
      level: 'campaign',
      entity_id: campaignId,
      message: 'Campaign must include at least one ad set',
    })
  }
  if (budgetType === 'CBO') {
    if (scheduleType === 'continuous' && !campaignDailyBudget) {
      validationErrors.push({
        level: 'campaign',
        entity_id: campaignId,
        message: 'CBO campaign requires daily_budget for Continuous schedule',
      })
    } else if (scheduleType === 'one_time' && !campaignLifetimeBudget) {
      validationErrors.push({
        level: 'campaign',
        entity_id: campaignId,
        message: 'CBO campaign requires lifetime_budget for One-Time schedule',
      })
    }
  }
  if (scheduleType === 'one_time' && !(input.end_time ?? campaignEndTime)) {
    validationErrors.push({
      level: 'campaign',
      entity_id: campaignId,
      message: 'one_time schedule requires end_time',
    })
  }

  for (const adSet of adSets) {
    const adSetId = String(adSet.id ?? '')
    const ads = ((adSet.ads as Array<Record<string, unknown>> | null) ?? []).sort((a, b) =>
      String(a.id).localeCompare(String(b.id)),
    )
    if (ads.length === 0) {
      validationErrors.push({
        level: 'adset',
        entity_id: adSetId,
        message: 'Ad set must include at least one ad',
      })
    }

    const adSetTargeting =
      (input.targeting as Record<string, unknown> | undefined) ??
      (adSet.targeting as Record<string, unknown> | null) ??
      {}
    if (!adSetTargeting || Object.keys(adSetTargeting).length === 0) {
      validationErrors.push({
        level: 'adset',
        entity_id: adSetId,
        message: 'Ad set targeting is required',
      })
    }

    const adSetDailyBudget =
      typeof input.daily_budget === 'number'
        ? input.daily_budget
        : ((adSet.daily_budget as number | null) ?? null)
    const adSetLifetimeBudget =
      typeof input.lifetime_budget === 'number'
        ? input.lifetime_budget
        : ((adSet.lifetime_budget as number | null) ?? null)
    if (budgetType === 'ABO') {
      if (scheduleType === 'continuous') {
        if (!adSetDailyBudget) {
          validationErrors.push({
            level: 'adset',
            entity_id: adSetId,
            message: 'ABO ad set requires daily_budget for Continuous schedule',
          })
        }
      } else if (!adSetDailyBudget && !adSetLifetimeBudget) {
        validationErrors.push({
          level: 'adset',
          entity_id: adSetId,
          message: 'ABO ad set requires daily_budget or lifetime_budget for One-Time schedule',
        })
      }
    }

    const adSetEndTime = input.end_time ?? (adSet.end_time as string | null) ?? campaignEndTime
    if (scheduleType === 'one_time' && !adSetEndTime) {
      validationErrors.push({
        level: 'adset',
        entity_id: adSetId,
        message: 'one_time schedule requires end_time on ad set or campaign',
      })
    }
    const resolvedOptimizationGoal = shared.resolveOptimizationGoal(
      campaignObjective,
      adSet.optimization_goal as string | undefined,
    )
    if (shared.requiresPixelForOptimizationGoal(resolvedOptimizationGoal) && !pixelId) {
      validationErrors.push({
        level: 'adset',
        entity_id: adSetId,
        message:
          'pixel_required: selected optimization goal requires a Meta Pixel. Create/select a pixel in campaign Ads settings.',
      })
    }

    validateMetaBatchAds(validationErrors, ads)
  }

  if (pixelId) {
    const pixelExists = await shared.isPixelOwnedByAdAccount(accessToken, adAccountId, pixelId)
    if (!pixelExists) {
      validationErrors.push({
        level: 'campaign',
        entity_id: campaignId,
        message:
          'invalid_pixel: selected pixel does not belong to this ad account. Choose a pixel from this ad account.',
      })
    }
  }

  return validationErrors
}

function validateMetaBatchAds(
  validationErrors: MetaBatchValidationIssue[],
  ads: Array<Record<string, unknown>>,
) {
  for (const ad of ads) {
    const adId = String(ad.id ?? '')
    if (!ad.headline || !ad.primary_text || !ad.destination_url) {
      validationErrors.push({
        level: 'ad',
        entity_id: adId,
        message: 'Ad headline, primary_text, and destination_url are required',
      })
    }
    const adMetadata = (ad.metadata as Record<string, unknown> | null) ?? {}
    const existingMetaAdId =
      (ad.meta_ad_id as string | null) ?? (adMetadata.meta_ad_id as string | undefined) ?? null
    const batchAdFormat = (ad.ad_format as string | null) || 'SINGLE_IMAGE'
    if (batchAdFormat === 'SINGLE_VIDEO') {
      if (!ad.video_url && !existingMetaAdId) {
        validationErrors.push({
          level: 'ad',
          entity_id: adId,
          message: 'Video ad requires video_url',
        })
      }
    } else if (batchAdFormat === 'CAROUSEL') {
      const cards = (ad.carousel_cards as Array<{ image_url?: string }> | null) ?? []
      if (cards.length < 2 && !existingMetaAdId) {
        validationErrors.push({
          level: 'ad',
          entity_id: adId,
          message: 'Carousel ad requires at least 2 cards',
        })
      }
    } else {
      const adPlacementImages =
        (ad.placement_images as Record<string, { image_url?: string }> | null) ?? {}
      const hasPlacementImage = Object.values(adPlacementImages).some((value) => value?.image_url)
      const hasDriveImage =
        adMetadata.image_source === 'google_drive' &&
        typeof adMetadata.drive_file_id === 'string' &&
        (adMetadata.drive_file_id as string).trim().length > 0
      if (!ad.image_url && !hasPlacementImage && !hasDriveImage && !existingMetaAdId) {
        validationErrors.push({
          level: 'ad',
          entity_id: adId,
          message: 'Ad image_url or Google Drive image is required for Meta publish',
        })
      }
    }
  }
}
