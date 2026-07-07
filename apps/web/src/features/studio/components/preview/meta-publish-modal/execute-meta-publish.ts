import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  publishAdToMeta,
  publishCampaignToMeta,
  updateAdCampaign,
} from '../../../services/artifact-preview.service'
import type { MetaPublishConfig } from './meta-publish-modal.types'

export async function executeMetaPublish(options: {
  isCampaignMode: boolean
  adId?: string
  adCampaignId?: string
  selectedAccountId: string
  selectedPageId: string
  selectedInstagramUserId: string
  selectedPixelId: string
  customEventType: string
  linkedCampaignId: string | null
  linkedCampaignMetadata: Record<string, unknown>
  publishConfig: MetaPublishConfig
}): Promise<void> {
  const {
    isCampaignMode,
    adId,
    adCampaignId,
    selectedAccountId,
    selectedPageId,
    selectedInstagramUserId,
    selectedPixelId,
    customEventType,
    linkedCampaignId,
    linkedCampaignMetadata,
    publishConfig,
  } = options

  const campaignIdToPersist = isCampaignMode ? (adCampaignId ?? null) : linkedCampaignId
  if (campaignIdToPersist) {
    const metadataPatch: Record<string, unknown> = {
      ...linkedCampaignMetadata,
      meta_instagram_user_id: selectedInstagramUserId,
      meta_custom_event_type: selectedPixelId ? customEventType : null,
      meta_pixel_id: selectedPixelId || null,
    }
    await updateAdCampaign(campaignIdToPersist, {
      meta_ad_account_id: selectedAccountId,
      meta_page_id: selectedPageId,
      metadata: metadataPatch,
    })
  }

  if (isCampaignMode) {
    const response = await publishCampaignToMeta({
      campaignId: adCampaignId as string,
      adAccountId: selectedAccountId,
      pageId: selectedPageId,
      instagramUserId: selectedInstagramUserId,
      campaignName: publishConfig.campaignName,
      campaignObjective: publishConfig.objective,
      budgetType: publishConfig.budgetType,
      scheduleType: publishConfig.scheduleType,
      dailyBudget: publishConfig.dailyBudget,
      lifetimeBudget: publishConfig.lifetimeBudget,
      bidStrategy: publishConfig.bidStrategy,
      startTime: publishConfig.startTime,
      endTime: publishConfig.endTime,
      pixelId: selectedPixelId || undefined,
      customEventType: selectedPixelId ? customEventType : undefined,
    })
    if ((response?.success as boolean | undefined) === false) {
      const issues = (response.validation_errors as Array<{ message?: string }> | undefined) ?? []
      const firstIssue =
        issues[0]?.message ?? STUDIO_INLINE_ERRORS.META_PUBLISH_PREVALIDATION_FAILED
      throw new Error(firstIssue)
    }
  } else {
    await publishAdToMeta(
      adId as string,
      selectedAccountId,
      selectedPageId,
      selectedInstagramUserId,
      selectedPixelId || undefined,
      selectedPixelId ? customEventType : undefined,
    )
  }
}
