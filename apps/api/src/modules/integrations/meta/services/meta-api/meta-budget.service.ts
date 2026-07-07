import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaIntegration } from '../../integrations/meta.integration'
import { MetaPublishRepository } from '../../repositories/meta-publish.repository'
import { MetaOAuthService } from '../meta-oauth.service'

@Injectable()
export class MetaBudgetService {
  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
    private readonly repository: MetaPublishRepository,
  ) {}

  async updateCampaignBudget(
    supabase: SupabaseClient,
    userId: string,
    adCampaignId: string,
    input: { daily_budget?: number; lifetime_budget?: number },
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
    if (!metaCampaignId) throw new BadRequestException('Ad campaign is not linked to Meta')
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    await this.meta.updateObjectBudget(accessToken, metaCampaignId, input)
    const updatePayload: Record<string, unknown> = {}
    if (typeof input.daily_budget === 'number') updatePayload.daily_budget = input.daily_budget
    if (typeof input.lifetime_budget === 'number')
      updatePayload.lifetime_budget = input.lifetime_budget
    const { error: updateError } = await this.repository.updateCampaign(
      supabase,
      userId,
      adCampaignId,
      updatePayload,
    )
    if (updateError)
      throw new BadRequestException(`Failed to sync ad campaign budget: ${updateError.message}`)
    return {
      success: true,
      ad_campaign_id: adCampaignId,
      meta_campaign_id: metaCampaignId,
      ...updatePayload,
    }
  }

  async updateAdSetBudget(
    supabase: SupabaseClient,
    userId: string,
    adSetId: string,
    input: { daily_budget?: number; lifetime_budget?: number },
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
    if (!metaAdSetId) throw new BadRequestException('Ad set is not linked to Meta')
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    await this.meta.updateObjectBudget(accessToken, metaAdSetId, input)
    const updatePayload: Record<string, unknown> = {}
    if (typeof input.daily_budget === 'number') updatePayload.daily_budget = input.daily_budget
    if (typeof input.lifetime_budget === 'number')
      updatePayload.lifetime_budget = input.lifetime_budget
    const { error: updateError } = await this.repository.updateAdSet(
      supabase,
      userId,
      adSetId,
      updatePayload,
    )
    if (updateError)
      throw new BadRequestException(`Failed to sync ad set budget: ${updateError.message}`)
    return { success: true, ad_set_id: adSetId, meta_adset_id: metaAdSetId, ...updatePayload }
  }
}
