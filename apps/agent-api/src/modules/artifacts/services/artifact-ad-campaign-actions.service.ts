import { Injectable } from '@nestjs/common'
import { ArtifactOffersAdsRepository } from '../repositories/artifact-offers-ads.repository'
import { tryPersistMissionDeliverable } from '../utils/artifact-domain-handler-shared.util'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactAdCampaignActionsService {
  constructor(
    private readonly repository: ArtifactOffersAdsRepository = new ArtifactOffersAdsRepository(),
  ) {}

  async createAdCampaign(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }
    const name = (input.name as string) || 'Untitled Campaign'
    const VALID_OBJECTIVES = [
      'OUTCOME_AWARENESS',
      'OUTCOME_ENGAGEMENT',
      'OUTCOME_LEADS',
      'OUTCOME_SALES',
      'OUTCOME_TRAFFIC',
      'OUTCOME_APP_PROMOTION',
    ] as const
    const rawObjective = (input.objective as string) || ''
    const objective = VALID_OBJECTIVES.includes(rawObjective as any)
      ? rawObjective
      : 'OUTCOME_TRAFFIC'
    const budgetType = (input.budget_type as string) || 'ABO'
    const spaceId = getActiveSpaceId(input)

    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const { data, error } = await this.repository.createAdCampaign(supabase, {
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      name,
      objective,
      budget_type: budgetType,
      ...(spaceId ? { space_id: spaceId } : {}),
    })

    if (error) {
      target.logger.error(`[create_ad_campaign] Insert failed: ${error.message}`)
      throw error
    }
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId,
      viewType: 'ad_campaigns',
      logger: target.logger,
    })
    await tryPersistMissionDeliverable(target, sessionKey, {
      type: 'ad_campaign',
      entityId: data.id,
      entityTable: 'ad_campaigns',
      title: data.name ?? 'Untitled Ad Campaign',
      sourceAction: 'create_ad_campaign',
    })
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-ad-campaign-${data.id}`,
          artifactType: 'ad-campaign',
          artifactId: data.id,
          name: data.name ?? 'Untitled Ad Campaign',
          spaceId: spaceId ?? undefined,
        },
      ],
      ...data,
    }
  }

  async createAdSet(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const adCampaignId = input.ad_campaign_id as string
    if (!adCampaignId) {
      return { success: false, error: 'ad_campaign_id is required. Create an ad campaign first.' }
    }
    const name = (input.name as string) || 'Untitled Ad Set'

    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const spaceId = getActiveSpaceId(input)
    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      org_id: orgId ?? null,
      ad_campaign_id: adCampaignId,
      ...(spaceId ? { space_id: spaceId } : {}),
      name,
    }
    if (input.daily_budget) insertPayload.daily_budget = input.daily_budget
    if (input.lifetime_budget) insertPayload.lifetime_budget = input.lifetime_budget
    if (input.optimization_goal) insertPayload.optimization_goal = input.optimization_goal
    if (input.billing_event) insertPayload.billing_event = input.billing_event
    if (input.targeting) insertPayload.targeting = input.targeting

    const { data, error } = await this.repository.createAdSet(supabase, insertPayload)

    if (error) {
      target.logger.error(`[create_ad_set] Insert failed: ${error.message}`)
      throw error
    }
    const { data: campaign } = await this.repository.findAdCampaignForAdSet(
      supabase,
      adCampaignId,
    )
    const resolvedSpaceId =
      spaceId ??
      (typeof campaign?.space_id === 'string' && campaign.space_id.trim()
        ? campaign.space_id
        : null)
    await ensureSpaceView({
      supabase,
      spaceId: resolvedSpaceId,
      campaignId: campaign?.campaign_id as string | null | undefined,
      viewType: 'ad_campaigns',
      logger: target.logger,
    })
    return data
  }

  generateAdCopy(input: Record<string, unknown>) {
    const variations = input.variations as
      | Array<{ headline: string; primaryText: string; description: string }>
      | undefined
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      return {
        success: false,
        error: 'variations array is required. Each must have headline, primaryText, description.',
      }
    }
    return {
      success: true,
      variations,
      ui_blocks: [{ type: 'ad_copy_variations', variations }],
    }
  }

  async bulkCreateAds(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)

    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }

    const adSetId = input.ad_set_id as string
    if (!adSetId) {
      return { success: false, error: 'ad_set_id is required.' }
    }

    const creatives = input.creatives as
      | Array<{
          image_url?: string
          image_asset_id?: string
          headline?: string
          primary_text?: string
        }>
      | undefined
    if (!creatives || !Array.isArray(creatives) || creatives.length === 0) {
      return { success: false, error: 'creatives array is required and must not be empty.' }
    }

    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const spaceId = getActiveSpaceId(input)
    const platform = (input.platform as string) || 'facebook'
    const templateHeadline = (input.headline as string) || ''
    const templatePrimaryText = (input.primary_text as string) || ''
    const templateDestinationUrl = (input.destination_url as string) || ''
    const templateCtaType = (input.cta_type as string) || 'LEARN_MORE'

    const rows = creatives.map((c) => ({
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      ...(spaceId ? { space_id: spaceId } : {}),
      ad_set_id: adSetId,
      platform,
      placement: 'feed',
      headline: c.headline || templateHeadline,
      primary_text: c.primary_text || templatePrimaryText,
      destination_url: templateDestinationUrl,
      cta_type: templateCtaType,
      image_url: c.image_url || null,
      image_asset_id: c.image_asset_id || null,
    }))

    const { data, error } = await this.repository.bulkCreateAds(supabase, rows)
    if (error) {
      target.logger.error(`[bulk_create_ads] Insert failed: ${error.message}`)
      throw error
    }
    await ensureSpaceView({ supabase, spaceId, campaignId, viewType: 'ads', logger: target.logger })
    return { success: true, ads: data, count: (data ?? []).length }
  }
}
