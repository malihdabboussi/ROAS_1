import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaIntegration } from '../../integrations/meta.integration'
import { MetaStatusRepository } from '../../repositories/meta-status.repository'
import { MetaOAuthService } from '../meta-oauth.service'

@Injectable()
export class MetaStatusService {
  private readonly logger = new Logger(MetaStatusService.name)

  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
    private readonly repository?: MetaStatusRepository,
  ) {}

  async getAdStatus(supabase: SupabaseClient, userId: string, metaAdId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    return this.meta.getAdStatus(accessToken, metaAdId)
  }

  async setAdMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    adId: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    const { data: ad, error: adError } = await this.getRepository().findAdForStatus(
      supabase,
      userId,
      adId,
    )

    if (adError || !ad) throw new BadRequestException('Ad not found')

    const adMetadata = (ad.metadata as Record<string, unknown> | null) ?? {}
    const metaAdId =
      (ad.meta_ad_id as string | null) ?? (adMetadata.meta_ad_id as string | undefined) ?? null

    if (!metaAdId) {
      throw new BadRequestException('Ad is not published to Meta yet')
    }

    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    await this.meta.updateObjectStatus(accessToken, metaAdId, status)

    return this.refreshAdHierarchyStatus(supabase, userId, adId)
  }

  async setAdSetMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    const { data: adSet, error: adSetError } = await this.getRepository().findAdSetForStatus(
      supabase,
      userId,
      adSetId,
    )

    if (adSetError || !adSet) throw new BadRequestException('Ad set not found')

    const adSetMetadata = (adSet.metadata as Record<string, unknown> | null) ?? {}
    const metaAdSetId =
      (adSet.meta_adset_id as string | null) ??
      (adSetMetadata.meta_ad_set_id as string | undefined) ??
      (adSetMetadata.meta_adset_id as string | undefined) ??
      null

    if (!metaAdSetId) {
      throw new BadRequestException('Ad set is not published to Meta yet')
    }

    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    await this.meta.updateObjectStatus(accessToken, metaAdSetId, status)

    const adSetResult = await this.refreshAdSetStatus(supabase, userId, adSetId)

    const childAds = await this.getRepository().listChildAds(supabase, userId, adSetId)

    for (const ad of childAds ?? []) {
      if (ad.meta_ad_id) {
        try {
          await this.refreshAdHierarchyStatus(supabase, userId, ad.id as string)
        } catch {
          /* skip */
        }
      }
    }

    return adSetResult
  }

  async setAdCampaignMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    adCampaignId: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    const { data: adCampaign, error: adCampaignError } =
      await this.getRepository().findCampaignForStatus(supabase, userId, adCampaignId)

    if (adCampaignError || !adCampaign) throw new BadRequestException('Ad campaign not found')

    const metadata = (adCampaign.metadata as Record<string, unknown> | null) ?? {}
    const metaCampaignId =
      (adCampaign.meta_campaign_id as string | null) ??
      (metadata.meta_campaign_id as string | undefined) ??
      null

    if (!metaCampaignId) {
      throw new BadRequestException('Ad campaign is not published to Meta yet')
    }

    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    await this.meta.updateObjectStatus(accessToken, metaCampaignId, status)

    const campaignResult = await this.refreshAdCampaignStatus(supabase, userId, adCampaignId)

    const childAdSets = await this.getRepository().listChildAdSets(supabase, userId, adCampaignId)

    for (const adSet of childAdSets ?? []) {
      if (adSet.meta_adset_id) {
        try {
          await this.refreshAdSetStatus(supabase, userId, adSet.id as string)
        } catch {
          /* skip if refresh fails */
        }
      }

      const childAds = await this.getRepository().listChildAds(supabase, userId, adSet.id as string)

      for (const ad of childAds ?? []) {
        if (ad.meta_ad_id) {
          try {
            await this.refreshAdHierarchyStatus(supabase, userId, ad.id as string)
          } catch {
            /* skip */
          }
        }
      }
    }

    return campaignResult
  }

  async handleAdRuleWebhook(
    supabaseOrPayload: SupabaseClient | Record<string, unknown>,
    payload?: Record<string, unknown>,
  ): Promise<{ processed: number }> {
    if (!payload) {
      return this.getRepository().withServiceClient((client) =>
        this.handleAdRuleWebhook(client, supabaseOrPayload as Record<string, unknown>),
      )
    }

    const supabase = supabaseOrPayload as SupabaseClient
    const entries = Array.isArray(payload.entry)
      ? (payload.entry as Array<Record<string, unknown>>)
      : []
    let processed = 0

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes)
        ? (entry.changes as Array<Record<string, unknown>>)
        : []
      for (const change of changes) {
        if (change.field !== 'ads_rules_engine') continue
        const value = (change.value as Record<string, unknown> | undefined) ?? {}
        const objectId = (value.object_id as string | undefined)?.trim()
        const objectType = (value.object_type as string | undefined)?.toUpperCase()
        if (!objectId || !objectType) continue

        if (objectType === 'AD') {
          const { data: ad } = await this.getRepository().findWebhookAd(supabase, objectId)

          if (ad?.id && ad?.user_id) {
            await this.refreshAdHierarchyStatus(supabase, ad.user_id as string, ad.id as string)
            processed += 1
          }
          continue
        }

        if (objectType === 'ADSET') {
          const { data: adSet } = await this.getRepository().findWebhookAdSet(supabase, objectId)

          if (adSet?.id && adSet?.user_id) {
            await this.refreshAdSetStatus(supabase, adSet.user_id as string, adSet.id as string)
            processed += 1
          }
          continue
        }

        if (objectType === 'CAMPAIGN') {
          const { data: adCampaign } = await this.getRepository().findWebhookCampaign(
            supabase,
            objectId,
          )

          if (adCampaign?.id && adCampaign?.user_id) {
            await this.refreshAdCampaignStatus(
              supabase,
              adCampaign.user_id as string,
              adCampaign.id as string,
            )
            processed += 1
          }
        }
      }
    }

    return { processed }
  }

  async refreshAdCampaignStatus(supabase: SupabaseClient, userId: string, adCampaignId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)

    const { data: adCampaign, error: adCampaignError } =
      await this.getRepository().findCampaignForStatus(supabase, userId, adCampaignId)

    if (adCampaignError || !adCampaign) {
      throw new BadRequestException('Ad campaign not found')
    }

    const metadata = (adCampaign.metadata as Record<string, unknown> | null) ?? {}
    const metaCampaignId =
      (adCampaign.meta_campaign_id as string | null) ??
      (metadata.meta_campaign_id as string | undefined) ??
      null

    if (!metaCampaignId) {
      throw new BadRequestException('Ad campaign is not linked to Meta (missing meta_campaign_id)')
    }

    const campaignStatus = await this.meta.getObjectStatus(accessToken, metaCampaignId)

    const { error: updateError } = await this.getRepository().updateCampaignMetaStatus(
      supabase,
      userId,
      adCampaignId,
      {
        meta_campaign_id: metaCampaignId,
        meta_effective_status: campaignStatus.effective_status,
      },
    )

    if (updateError) {
      this.logger.error(`Failed to update ad campaign meta status: ${updateError.message}`)
    }

    return {
      ad_campaign_id: adCampaignId,
      meta_campaign_id: metaCampaignId,
      ad_campaign_effective_status: campaignStatus.effective_status,
    }
  }

  async refreshAdSetStatus(supabase: SupabaseClient, userId: string, adSetId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)

    const { data: adSet, error: adSetError } = await this.getRepository().findAdSetForRefresh(
      supabase,
      userId,
      adSetId,
    )

    if (adSetError || !adSet) {
      throw new BadRequestException('Ad set not found')
    }

    const adSetMetadata = (adSet.metadata as Record<string, unknown> | null) ?? {}
    const metaAdSetId =
      (adSet.meta_adset_id as string | null) ??
      (adSetMetadata.meta_ad_set_id as string | undefined) ??
      (adSetMetadata.meta_adset_id as string | undefined) ??
      null

    if (!metaAdSetId) {
      throw new BadRequestException('Ad set is not linked to Meta (missing meta_adset_id)')
    }

    const adSetStatus = await this.meta.getObjectStatus(accessToken, metaAdSetId)

    const { error: updateAdSetError } = await this.getRepository().updateAdSetMetaStatus(
      supabase,
      userId,
      adSetId,
      {
        meta_adset_id: metaAdSetId,
        meta_effective_status: adSetStatus.effective_status,
      },
    )

    if (updateAdSetError) {
      this.logger.error(`Failed to update ad set meta status: ${updateAdSetError.message}`)
    }

    let adCampaignStatus: string | null = null
    let metaCampaignId: string | null = null

    if (adSet.ad_campaign_id) {
      const { data: adCampaign, error: adCampaignError } =
        await this.getRepository().findCampaignParent(
          supabase,
          userId,
          adSet.ad_campaign_id as string,
        )

      if (!adCampaignError && adCampaign) {
        const campaignMetadata = (adCampaign.metadata as Record<string, unknown> | null) ?? {}
        metaCampaignId =
          (adCampaign.meta_campaign_id as string | null) ??
          (campaignMetadata.meta_campaign_id as string | undefined) ??
          null

        if (metaCampaignId) {
          const campaignStatus = await this.meta.getObjectStatus(accessToken, metaCampaignId)
          adCampaignStatus = campaignStatus.effective_status

          const { error: updateAdCampaignError } =
            await this.getRepository().updateCampaignMetaStatus(
              supabase,
              userId,
              adCampaign.id as string,
              {
                meta_campaign_id: metaCampaignId,
                meta_effective_status: campaignStatus.effective_status,
              },
            )

          if (updateAdCampaignError) {
            this.logger.error(
              `Failed to update ad campaign meta status: ${updateAdCampaignError.message}`,
            )
          }
        }
      }
    }

    return {
      ad_set_id: adSetId,
      meta_adset_id: metaAdSetId,
      ad_set_effective_status: adSetStatus.effective_status,
      meta_campaign_id: metaCampaignId,
      ad_campaign_effective_status: adCampaignStatus,
    }
  }

  async refreshAdHierarchyStatus(supabase: SupabaseClient, userId: string, adId: string) {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)

    const { data: ad, error: adError } = await this.getRepository().findAdForRefresh(
      supabase,
      userId,
      adId,
    )

    if (adError || !ad) {
      throw new BadRequestException('Ad not found')
    }

    const adMetadata = (ad.metadata as Record<string, unknown> | null) ?? {}
    const metaAdId =
      (ad.meta_ad_id as string | null) ?? (adMetadata.meta_ad_id as string | undefined) ?? null

    if (!metaAdId) {
      throw new BadRequestException('Ad is not linked to Meta (missing meta_ad_id)')
    }

    const adStatus = await this.meta.getAdStatus(accessToken, metaAdId)

    const { error: updateAdError } = await this.getRepository().updateAdMetaStatus(
      supabase,
      userId,
      adId,
      {
        meta_ad_id: metaAdId,
        meta_effective_status: adStatus.effective_status,
        metadata: {
          ...adMetadata,
          meta_ad_id: metaAdId,
          meta_status: adStatus.effective_status,
          meta_configured_status: adStatus.configured_status,
          meta_status_refreshed_at: new Date().toISOString(),
        },
      },
    )

    if (updateAdError) {
      this.logger.error(`Failed to update ad meta status: ${updateAdError.message}`)
    }

    let adSetStatus: string | null = null
    let adCampaignStatus: string | null = null

    if (ad.ad_set_id) {
      const { data: adSet, error: adSetError } = await this.getRepository().findAdSetParent(
        supabase,
        userId,
        ad.ad_set_id as string,
      )

      if (!adSetError && adSet) {
        const metaAdSetId =
          (adSet.meta_adset_id as string | null) ??
          (adMetadata.meta_ad_set_id as string | undefined) ??
          (adMetadata.meta_adset_id as string | undefined) ??
          null

        if (metaAdSetId) {
          const adSetMetaStatus = await this.meta.getObjectStatus(accessToken, metaAdSetId)
          adSetStatus = adSetMetaStatus.effective_status

          const { error: updateAdSetError } = await this.getRepository().updateAdSetMetaStatus(
            supabase,
            userId,
            adSet.id as string,
            {
              meta_adset_id: metaAdSetId,
              meta_effective_status: adSetMetaStatus.effective_status,
            },
          )

          if (updateAdSetError) {
            this.logger.error(`Failed to update ad set meta status: ${updateAdSetError.message}`)
          }
        }

        if (adSet.ad_campaign_id) {
          const { data: adCampaign, error: adCampaignError } =
            await this.getRepository().findCampaignIdParent(
              supabase,
              userId,
              adSet.ad_campaign_id as string,
            )

          if (!adCampaignError && adCampaign) {
            const metaCampaignId =
              (adCampaign.meta_campaign_id as string | null) ??
              (adMetadata.meta_campaign_id as string | undefined) ??
              null

            if (metaCampaignId) {
              const campaignMetaStatus = await this.meta.getObjectStatus(
                accessToken,
                metaCampaignId,
              )
              adCampaignStatus = campaignMetaStatus.effective_status

              const { error: updateAdCampaignError } =
                await this.getRepository().updateCampaignMetaStatus(
                  supabase,
                  userId,
                  adCampaign.id as string,
                  {
                    meta_campaign_id: metaCampaignId,
                    meta_effective_status: campaignMetaStatus.effective_status,
                  },
                )

              if (updateAdCampaignError) {
                this.logger.error(
                  `Failed to update ad campaign meta status: ${updateAdCampaignError.message}`,
                )
              }
            }
          }
        }
      }
    }

    return {
      ad_id: adId,
      meta_ad_id: metaAdId,
      ad_effective_status: adStatus.effective_status,
      ad_configured_status: adStatus.configured_status,
      ad_set_effective_status: adSetStatus,
      ad_campaign_effective_status: adCampaignStatus,
    }
  }

  private getRepository(): MetaStatusRepository {
    if (!this.repository) {
      throw new BadRequestException('Meta status repository is not configured')
    }
    return this.repository
  }
}
