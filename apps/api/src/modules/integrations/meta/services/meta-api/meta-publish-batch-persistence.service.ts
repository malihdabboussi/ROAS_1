import { BadRequestException, Injectable, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaPublishRepository } from '../../repositories/meta-publish.repository'

type PublishMetadata = Record<string, unknown>
type UpdateMap = Map<string, Record<string, unknown>>

@Injectable()
export class MetaPublishBatchPersistenceService {
  constructor(private readonly repository: MetaPublishRepository) {}

  async persistCampaignMetaLink(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    payload: {
      metaCampaignId: string
      adAccountId: string
      pageId: string
      instagramUserId: string
      pixelId: string
      customEventType: string
      metadata: PublishMetadata
    },
  ): Promise<void> {
    const { error } = await this.repository.updateCampaign(supabase, userId, campaignId, {
      meta_campaign_id: payload.metaCampaignId,
      meta_ad_account_id: payload.adAccountId,
      meta_page_id: payload.pageId,
      metadata: {
        ...payload.metadata,
        meta_campaign_id: payload.metaCampaignId,
        meta_ad_account_id: payload.adAccountId,
        meta_page_id: payload.pageId,
        meta_instagram_user_id: payload.instagramUserId,
        ...(payload.pixelId ? { meta_pixel_id: payload.pixelId } : {}),
        ...(payload.customEventType ? { meta_custom_event_type: payload.customEventType } : {}),
      },
    })
    if (error) {
      throw new BadRequestException(`Failed to persist campaign Meta ID: ${error.message}`)
    }
  }

  buildAdSetPayload(input: {
    metaCampaignId: string
    metaAdSetId: string
    adAccountId: string
    pageId: string
    instagramUserId: string
    publishedAt: string
    metadata: PublishMetadata
  }): Record<string, unknown> {
    return {
      meta_adset_id: input.metaAdSetId,
      meta_effective_status: 'PAUSED',
      metadata: {
        ...input.metadata,
        meta_campaign_id: input.metaCampaignId,
        meta_ad_set_id: input.metaAdSetId,
        meta_adset_id: input.metaAdSetId,
        meta_ad_account_id: input.adAccountId,
        meta_page_id: input.pageId,
        meta_instagram_user_id: input.instagramUserId,
        meta_status: 'PAUSED',
        meta_published_at: input.publishedAt,
      },
    }
  }

  async persistAdSetMetaLink(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.repository.updateAdSet(supabase, userId, adSetId, payload)
    if (error) {
      throw new BadRequestException(
        `Failed to persist ad set ${adSetId} Meta ID: ${error.message}`,
      )
    }
  }

  buildAdPayload(input: {
    metaCampaignId: string
    metaAdSetId: string
    metaCreativeId: string
    metaAdId: string
    adRuleId: string
    adAccountId: string
    pageId: string
    instagramUserId: string
    publishedAt: string
    metadata: PublishMetadata
  }): Record<string, unknown> {
    return {
      meta_ad_id: input.metaAdId,
      meta_effective_status: 'PAUSED',
      metadata: {
        ...input.metadata,
        meta_campaign_id: input.metaCampaignId,
        meta_ad_set_id: input.metaAdSetId,
        meta_adset_id: input.metaAdSetId,
        meta_creative_id: input.metaCreativeId || null,
        meta_ad_id: input.metaAdId,
        ...(input.adRuleId ? { meta_ad_rule_id: input.adRuleId } : {}),
        meta_ad_account_id: input.adAccountId,
        meta_page_id: input.pageId,
        meta_instagram_user_id: input.instagramUserId,
        meta_status: 'PAUSED',
        meta_published_at: input.publishedAt,
      },
    }
  }

  async persistAdUpdatesAfterPartialFailure(
    supabase: SupabaseClient,
    userId: string,
    stagedAdUpdates: UpdateMap,
    logger: Pick<Logger, 'warn'>,
  ): Promise<void> {
    for (const [adId, payload] of stagedAdUpdates.entries()) {
      const { error } = await this.repository.updateAd(supabase, userId, adId, payload)
      if (error) {
        logger.warn(`Failed to persist ad ${adId} after partial failure: ${error.message}`)
      }
    }
  }

  async syncPublishedBatch(input: {
    supabase: SupabaseClient
    userId: string
    campaignId: string
    metaCampaignId: string
    adAccountId: string
    pageId: string
    instagramUserId: string
    pixelId: string
    customEventType: string
    publishedAt: string
    campaignMetadata: PublishMetadata
    stagedAdSetUpdates: UpdateMap
    stagedAdUpdates: UpdateMap
  }): Promise<void> {
    const { error: updateCampaignError } = await this.repository.updateCampaign(
      input.supabase,
      input.userId,
      input.campaignId,
      {
        meta_campaign_id: input.metaCampaignId,
        meta_effective_status: 'PAUSED',
        meta_ad_account_id: input.adAccountId,
        meta_page_id: input.pageId,
        metadata: {
          ...input.campaignMetadata,
          meta_campaign_id: input.metaCampaignId,
          meta_ad_account_id: input.adAccountId,
          meta_page_id: input.pageId,
          meta_instagram_user_id: input.instagramUserId,
          ...(input.pixelId ? { meta_pixel_id: input.pixelId } : {}),
          ...(input.customEventType ? { meta_custom_event_type: input.customEventType } : {}),
          meta_status: 'PAUSED',
          meta_published_at: input.publishedAt,
        },
      },
    )
    if (updateCampaignError) {
      throw new BadRequestException(
        `Failed to sync ad campaign ${input.campaignId}: ${updateCampaignError.message}`,
      )
    }

    for (const [adSetId, payload] of input.stagedAdSetUpdates.entries()) {
      const { error } = await this.repository.updateAdSet(
        input.supabase,
        input.userId,
        adSetId,
        payload,
      )
      if (error) {
        throw new BadRequestException(`Failed to sync ad set ${adSetId}: ${error.message}`)
      }
    }
    for (const [adId, payload] of input.stagedAdUpdates.entries()) {
      const { error } = await this.repository.updateAd(input.supabase, input.userId, adId, payload)
      if (error) throw new BadRequestException(`Failed to sync ad ${adId}: ${error.message}`)
    }
  }
}
