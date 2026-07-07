import { BadRequestException } from '@nestjs/common'
import { META_ERRORS } from '../config/meta-errors.config'
import type {
  MetaAdInput,
  MetaAdSetInput,
  MetaAdSetUpdateInput,
  MetaCampaignInput,
  MetaCampaignUpdateInput,
} from '../types/meta.types'
import { MetaIntegrationCreativesBase } from './meta-integration-creatives.base'

export abstract class MetaIntegrationCampaignsBase extends MetaIntegrationCreativesBase {
  async createCampaign(
    accessToken: string,
    adAccountId: string,
    input: MetaCampaignInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/campaigns`
    const campaignBody: Record<string, unknown> = {
      name: input.name,
      objective: input.objective,
      status: input.status ?? 'PAUSED',
      special_ad_categories: input.special_ad_categories ?? [],
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }

    if (input.is_cbo) {
      campaignBody.bid_strategy = input.bid_strategy || 'LOWEST_COST_WITHOUT_CAP'
      if (input.daily_budget) campaignBody.daily_budget = Math.round(Number(input.daily_budget))
      if (input.lifetime_budget)
        campaignBody.lifetime_budget = Math.round(Number(input.lifetime_budget))
    } else {
      campaignBody.is_adset_budget_sharing_enabled = false
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignBody),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta campaign creation failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.CAMPAIGN_CREATION_FAILED),
      )
    }

    return JSON.parse(raw) as { id: string }
  }

  async createAdSet(
    accessToken: string,
    adAccountId: string,
    input: MetaAdSetInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/adsets`
    const safeTargeting = { ...input.targeting }
    delete (safeTargeting as Record<string, unknown>).interests
    delete (safeTargeting as Record<string, unknown>).behaviors
    delete (safeTargeting as Record<string, unknown>).publisher_platforms
    delete (safeTargeting as Record<string, unknown>).facebook_positions
    delete (safeTargeting as Record<string, unknown>).instagram_positions
    delete (safeTargeting as Record<string, unknown>).manual_placements

    const geoLoc = (safeTargeting as Record<string, unknown>).geo_locations as
      | Record<string, unknown>
      | undefined
    if (geoLoc?.countries) {
      const countries = (geoLoc.countries as string[]).filter((c) => c !== 'WW')
      if (countries.length === 0) {
        delete geoLoc.countries
        if (Object.keys(geoLoc).length === 0)
          delete (safeTargeting as Record<string, unknown>).geo_locations
      } else {
        geoLoc.countries = countries
      }
    }

    if (!(safeTargeting as Record<string, unknown>).targeting_automation) {
      ;(safeTargeting as Record<string, unknown>).targeting_automation = { advantage_audience: 1 }
    }

    const ta = (safeTargeting as Record<string, unknown>).targeting_automation as
      | Record<string, unknown>
      | undefined
    if (ta?.advantage_audience === 1) {
      if (
        (safeTargeting as Record<string, unknown>).age_min &&
        ((safeTargeting as Record<string, unknown>).age_min as number) > 18
      ) {
        ;(safeTargeting as Record<string, unknown>).age_min = 18
      }
      if (
        (safeTargeting as Record<string, unknown>).age_max &&
        ((safeTargeting as Record<string, unknown>).age_max as number) < 65
      ) {
        ;(safeTargeting as Record<string, unknown>).age_max = 65
      }
    }

    const body: Record<string, unknown> = {
      campaign_id: input.campaign_id,
      name: input.name,
      billing_event: input.billing_event,
      optimization_goal: input.optimization_goal,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: safeTargeting,
      status: input.status ?? 'PAUSED',
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }

    if (input.daily_budget) body.daily_budget = Math.round(Number(input.daily_budget))
    if (input.lifetime_budget) body.lifetime_budget = Math.round(Number(input.lifetime_budget))
    if (input.start_time) body.start_time = input.start_time
    if (input.end_time) body.end_time = input.end_time
    if (input.promoted_object) body.promoted_object = input.promoted_object
    if (input.dsa_beneficiary) body.dsa_beneficiary = input.dsa_beneficiary
    if (input.dsa_payor) body.dsa_payor = input.dsa_payor

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta ad set creation failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.AD_SET_CREATION_FAILED),
      )
    }

    return JSON.parse(raw) as { id: string }
  }

  async createAd(
    accessToken: string,
    adAccountId: string,
    input: MetaAdInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/ads`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        adset_id: input.adset_id,
        creative: { creative_id: input.creative_id },
        status: input.status ?? 'PAUSED',
        access_token: accessToken,
        appsecret_proof: this.buildAppSecretProof(accessToken),
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta ad creation failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(this.parseMetaErrorMessage(raw, META_ERRORS.AD_CREATION_FAILED))
    }

    const parsed = JSON.parse(raw) as { id?: string }
    const adId = parsed.id?.trim()
    if (!adId) {
      this.logger.error(`Meta ad creation returned no id: ${raw.slice(0, 300)}`)
      throw new BadRequestException(
        `Ad creation returned no id: ${raw.slice(0, 200) || 'empty response body'}`,
      )
    }

    return { id: adId }
  }

  async createAdRule(
    accessToken: string,
    adAccountId: string,
    input: {
      name: string
      meta_ad_id: string
    },
  ): Promise<{ id: string }> {
    const metaAdId = input.meta_ad_id?.trim()
    if (!metaAdId) {
      throw new BadRequestException(META_ERRORS.MISSING_META_AD_ID)
    }

    const url = `${this.API_BASE}/${adAccountId}/adrules_library`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        evaluation_spec: {
          evaluation_type: 'TRIGGER',
          trigger: {
            type: 'METADATA_UPDATE',
            field: 'updated_time',
          },
          filters: [
            { field: 'entity_type', value: 'AD', operator: 'EQUAL' },
            { field: 'id', value: [metaAdId], operator: 'IN' },
          ],
        },
        execution_spec: {
          execution_type: 'PING_ENDPOINT',
        },
        access_token: accessToken,
        appsecret_proof: this.buildAppSecretProof(accessToken),
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta ad rule creation failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.AD_RULE_CREATION_FAILED),
      )
    }

    return JSON.parse(raw) as { id: string }
  }

  async updateAdCreative(
    accessToken: string,
    metaAdId: string,
    creativeId: string,
  ): Promise<{ success: boolean }> {
    const url = `${this.API_BASE}/${metaAdId}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creative: { creative_id: creativeId },
        access_token: accessToken,
        appsecret_proof: this.buildAppSecretProof(accessToken),
      }),
    })
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta ad creative update failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, 'Failed to update ad creative on Meta'),
      )
    }
    return JSON.parse(raw) as { success: boolean }
  }

  async updateObjectStatus(
    accessToken: string,
    objectId: string,
    status: 'ACTIVE' | 'PAUSED',
  ): Promise<{ success: boolean }> {
    const url = `${this.API_BASE}/${objectId}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        access_token: accessToken,
        appsecret_proof: this.buildAppSecretProof(accessToken),
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta status update failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(`Status update failed: ${raw.slice(0, 200)}`)
    }

    return JSON.parse(raw) as { success: boolean }
  }

  async updateCampaign(
    accessToken: string,
    metaCampaignId: string,
    input: MetaCampaignUpdateInput,
  ): Promise<{ success: boolean }> {
    const url = `${this.API_BASE}/${metaCampaignId}`
    const payload: Record<string, unknown> = {
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }
    if (input.name !== undefined) payload.name = input.name
    if (input.status !== undefined) payload.status = input.status
    if (typeof input.daily_budget === 'number')
      payload.daily_budget = Math.round(input.daily_budget)
    if (typeof input.lifetime_budget === 'number')
      payload.lifetime_budget = Math.round(input.lifetime_budget)
    if (input.bid_strategy !== undefined) payload.bid_strategy = input.bid_strategy
    if (input.special_ad_categories !== undefined)
      payload.special_ad_categories = input.special_ad_categories

    const response = await this.fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Meta campaign update',
    )
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta campaign update failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(this.parseMetaErrorMessage(raw, 'Campaign update failed'))
    }
    return JSON.parse(raw) as { success: boolean }
  }

  async updateAdSet(
    accessToken: string,
    metaAdSetId: string,
    input: MetaAdSetUpdateInput,
  ): Promise<{ success: boolean }> {
    const url = `${this.API_BASE}/${metaAdSetId}`
    const payload: Record<string, unknown> = {
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }
    if (input.name !== undefined) payload.name = input.name
    if (input.status !== undefined) payload.status = input.status
    if (typeof input.daily_budget === 'number')
      payload.daily_budget = Math.round(input.daily_budget)
    if (typeof input.lifetime_budget === 'number')
      payload.lifetime_budget = Math.round(input.lifetime_budget)
    if (input.targeting !== undefined) payload.targeting = input.targeting
    if (input.optimization_goal !== undefined) payload.optimization_goal = input.optimization_goal
    if (input.billing_event !== undefined) payload.billing_event = input.billing_event
    if (input.start_time !== undefined) payload.start_time = input.start_time
    if (input.end_time !== undefined) payload.end_time = input.end_time
    if (input.bid_strategy !== undefined) payload.bid_strategy = input.bid_strategy
    if (input.promoted_object !== undefined) payload.promoted_object = input.promoted_object

    const response = await this.fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Meta ad set update',
    )
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta ad set update failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(this.parseMetaErrorMessage(raw, 'Ad set update failed'))
    }
    return JSON.parse(raw) as { success: boolean }
  }

  async getAdStatus(
    accessToken: string,
    adId: string,
  ): Promise<{ id: string; effective_status: string; configured_status: string }> {
    const params = new URLSearchParams()
    params.set('fields', 'id,effective_status,configured_status')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adId}?${params.toString()}`
    const response = await fetch(url)
    const raw = await response.text()

    if (!response.ok) {
      throw new BadRequestException(`Failed to get ad status: ${raw.slice(0, 200)}`)
    }

    return JSON.parse(raw)
  }
}
