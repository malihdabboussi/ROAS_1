import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaPublishRepository } from '../repositories/meta-publish.repository'
import type { MetaCampaignObjective, MetaPublishAdInput, MetaTargeting } from '../types/meta.types'
import { MetaApiService } from './meta-api.service'

@Injectable()
export class MetaPublishRequestService {
  constructor(
    private readonly api: MetaApiService,
    private readonly repository: MetaPublishRepository,
  ) {}

  async publishAd(supabase: SupabaseClient, userId: string, body: unknown) {
    const input = body as Record<string, unknown>
    if (!input.ad_id || !input.ad_account_id || !input.page_id) {
      throw new HttpException(
        {
          success: false,
          error: 'ad_id, ad_account_id, and page_id are required',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const adId = input.ad_id as string

    let campaignName = input.campaign_name as string | undefined
    let campaignObjective = input.campaign_objective as string | undefined
    let budgetType: 'ABO' | 'CBO' = 'ABO'
    let scheduleType: 'continuous' | 'one_time' = 'continuous'
    let adsetName = input.adset_name as string | undefined
    let dailyBudget = input.daily_budget as number | undefined
    let lifetimeBudget = input.lifetime_budget as number | undefined
    let bidStrategy = input.bid_strategy as string | undefined
    let targeting = input.targeting as Record<string, unknown> | undefined
    let pixelId = input.pixel_id as string | undefined
    let customEventType = input.custom_event_type as string | undefined
    let startTime = input.start_time as string | undefined
    let endTime = input.end_time as string | undefined

    const { data: ad } = await this.repository.findPublishRequestAd(supabase, userId, adId)

    const linkedAd = ad as { ad_set_id?: string | null } | null
    if (linkedAd?.ad_set_id) {
      const { data: adSet } = await this.repository.findPublishRequestAdSet(
        supabase,
        userId,
        linkedAd.ad_set_id,
      )

      if (adSet) {
        const linkedAdSet = adSet as {
          name?: string | null
          daily_budget?: number | null
          lifetime_budget?: number | null
          targeting?: Record<string, unknown> | null
          start_time?: string | null
          end_time?: string | null
          ad_campaign_id?: string | null
        }

        if (!targeting) targeting = linkedAdSet.targeting || undefined
        if (!adsetName) adsetName = linkedAdSet.name || undefined

        if (linkedAdSet.ad_campaign_id) {
          const { data: adCampaign } = await this.repository.findPublishRequestCampaign(
            supabase,
            userId,
            linkedAdSet.ad_campaign_id,
          )

          if (adCampaign) {
            const linkedCampaign = adCampaign as {
              name?: string | null
              objective?: string | null
              budget_type?: string | null
              daily_budget?: number | null
              lifetime_budget?: number | null
              bid_strategy?: string | null
              schedule_type?: string | null
              start_time?: string | null
              end_time?: string | null
              metadata?: Record<string, unknown> | null
            }

            if (!campaignName) campaignName = linkedCampaign.name || undefined
            if (!campaignObjective) campaignObjective = linkedCampaign.objective || undefined
            if (linkedCampaign.budget_type) budgetType = linkedCampaign.budget_type as 'ABO' | 'CBO'
            if (linkedCampaign.schedule_type)
              scheduleType = linkedCampaign.schedule_type as 'continuous' | 'one_time'
            if (linkedCampaign.bid_strategy) bidStrategy = linkedCampaign.bid_strategy

            if (!dailyBudget && linkedCampaign.daily_budget)
              dailyBudget = linkedCampaign.daily_budget
            if (!lifetimeBudget && linkedCampaign.lifetime_budget)
              lifetimeBudget = linkedCampaign.lifetime_budget
            if (!startTime && linkedCampaign.start_time) startTime = linkedCampaign.start_time
            if (!endTime && linkedCampaign.end_time) endTime = linkedCampaign.end_time

            const adCampaignMetadata = linkedCampaign.metadata ?? {}
            if (!pixelId && typeof adCampaignMetadata.meta_pixel_id === 'string') {
              pixelId = adCampaignMetadata.meta_pixel_id
            }
            if (!customEventType && typeof adCampaignMetadata.meta_custom_event_type === 'string') {
              customEventType = adCampaignMetadata.meta_custom_event_type
            }
          }
        }

        if (!dailyBudget && linkedAdSet.daily_budget) dailyBudget = linkedAdSet.daily_budget
        if (!lifetimeBudget && linkedAdSet.lifetime_budget)
          lifetimeBudget = linkedAdSet.lifetime_budget
        if (!startTime && linkedAdSet.start_time) startTime = linkedAdSet.start_time
        if (!endTime && linkedAdSet.end_time) endTime = linkedAdSet.end_time
      }
    }

    if (!targeting || typeof targeting !== 'object' || !Object.keys(targeting).length) {
      throw new HttpException(
        {
          success: false,
          error: 'targeting is required and must be a non-empty object',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (budgetType === 'CBO' && !dailyBudget && !lifetimeBudget) {
      throw new HttpException(
        {
          success: false,
          error: 'CBO campaign requires daily_budget or lifetime_budget',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (budgetType === 'ABO' && !dailyBudget && !lifetimeBudget) {
      throw new HttpException(
        {
          success: false,
          error: 'ABO ad set requires daily_budget or lifetime_budget',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (scheduleType === 'one_time' && !endTime) {
      throw new HttpException(
        {
          success: false,
          error: 'one_time schedule requires end_time',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const result = await this.api.publishAd(supabase, userId, {
      ad_id: adId,
      ad_account_id: input.ad_account_id as string,
      page_id: input.page_id as string,
      instagram_user_id: input.instagram_user_id as string | undefined,
      campaign_name: campaignName,
      campaign_objective: campaignObjective as MetaCampaignObjective | undefined,
      budget_type: budgetType,
      schedule_type: scheduleType,
      adset_name: adsetName,
      daily_budget: dailyBudget,
      lifetime_budget: lifetimeBudget,
      bid_strategy: bidStrategy,
      targeting: targeting as MetaTargeting,
      pixel_id: pixelId,
      custom_event_type: customEventType,
      start_time: startTime,
      end_time: endTime,
    } satisfies MetaPublishAdInput)

    return { success: true, ...result }
  }
}
