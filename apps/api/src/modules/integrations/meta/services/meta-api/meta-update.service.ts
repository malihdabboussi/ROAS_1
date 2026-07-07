import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaIntegration } from '../../integrations/meta.integration'
import { MetaPublishRepository } from '../../repositories/meta-publish.repository'
import type { MetaAdSetUpdateInput, MetaCampaignUpdateInput } from '../../types/meta.types'
import { MetaOAuthService } from '../meta-oauth.service'

@Injectable()
export class MetaUpdateService {
  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
    private readonly repository: MetaPublishRepository,
  ) {}

  async updateCampaignOnMeta(
    supabase: SupabaseClient,
    userId: string,
    adCampaignId: string,
    input: MetaCampaignUpdateInput,
  ) {
    const { data: adCampaign, error } = await this.repository.findCampaignMetaLink(
      supabase,
      userId,
      adCampaignId,
    )
    if (error || !adCampaign) throw new BadRequestException('Ad campaign not found')

    const metadata = (adCampaign.metadata as Record<string, unknown> | null) ?? {}
    const metaCampaignId =
      (adCampaign.meta_campaign_id as string | null) ??
      (metadata.meta_campaign_id as string | undefined) ??
      null
    if (!metaCampaignId) throw new BadRequestException('Ad campaign is not published to Meta yet')

    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    await this.meta.updateCampaign(accessToken, metaCampaignId, input)

    const dbPayload: Record<string, unknown> = {}
    if (input.name !== undefined) dbPayload.name = input.name
    if (input.status !== undefined) dbPayload.meta_effective_status = input.status
    if (typeof input.daily_budget === 'number') dbPayload.daily_budget = input.daily_budget
    if (typeof input.lifetime_budget === 'number') dbPayload.lifetime_budget = input.lifetime_budget
    if (input.bid_strategy !== undefined) dbPayload.bid_strategy = input.bid_strategy
    if (input.special_ad_categories !== undefined)
      dbPayload.special_ad_categories = input.special_ad_categories

    if (Object.keys(dbPayload).length > 0) {
      const { error: updateError } = await this.repository.updateCampaign(
        supabase,
        userId,
        adCampaignId,
        dbPayload,
      )
      if (updateError)
        throw new BadRequestException(`Failed to sync campaign locally: ${updateError.message}`)
    }

    return {
      success: true,
      ad_campaign_id: adCampaignId,
      meta_campaign_id: metaCampaignId,
      updated_fields: Object.keys(input).filter(
        (k) => (input as Record<string, unknown>)[k] !== undefined,
      ),
    }
  }

  async updateAdSetOnMeta(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
    input: MetaAdSetUpdateInput,
  ) {
    const { data: adSet, error } = await this.repository.findAdSetMetaLink(
      supabase,
      userId,
      adSetId,
    )
    if (error || !adSet) throw new BadRequestException('Ad set not found')

    const metadata = (adSet.metadata as Record<string, unknown> | null) ?? {}
    const metaAdSetId =
      (adSet.meta_adset_id as string | null) ??
      (metadata.meta_ad_set_id as string | undefined) ??
      (metadata.meta_adset_id as string | undefined) ??
      null
    if (!metaAdSetId) throw new BadRequestException('Ad set is not published to Meta yet')

    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    await this.meta.updateAdSet(accessToken, metaAdSetId, input)

    const dbPayload: Record<string, unknown> = {}
    if (input.name !== undefined) dbPayload.name = input.name
    if (input.status !== undefined) dbPayload.meta_effective_status = input.status
    if (typeof input.daily_budget === 'number') dbPayload.daily_budget = input.daily_budget
    if (typeof input.lifetime_budget === 'number') dbPayload.lifetime_budget = input.lifetime_budget
    if (input.targeting !== undefined) dbPayload.targeting = input.targeting
    if (input.optimization_goal !== undefined) dbPayload.optimization_goal = input.optimization_goal
    if (input.billing_event !== undefined) dbPayload.billing_event = input.billing_event
    if (input.start_time !== undefined) dbPayload.start_time = input.start_time
    if (input.end_time !== undefined) dbPayload.end_time = input.end_time

    if (Object.keys(dbPayload).length > 0) {
      const { error: updateError } = await this.repository.updateAdSet(
        supabase,
        userId,
        adSetId,
        dbPayload,
      )
      if (updateError)
        throw new BadRequestException(`Failed to sync ad set locally: ${updateError.message}`)
    }

    return {
      success: true,
      ad_set_id: adSetId,
      meta_adset_id: metaAdSetId,
      updated_fields: Object.keys(input).filter(
        (k) => (input as Record<string, unknown>)[k] !== undefined,
      ),
    }
  }
}
