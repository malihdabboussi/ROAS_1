import { createHmac, timingSafeEqual } from 'crypto'
import { BadRequestException } from '@nestjs/common'
import { META_ERRORS } from '../config/meta-errors.config'
import type {
  MetaFetchedAd,
  MetaFetchedAdSet,
  MetaFetchedCampaign,
  MetaFetchedCreative,
} from '../types/meta.types'
import { MetaIntegrationCampaignsBase } from './meta-integration-campaigns.base'

type LocResult = {
  key: string
  name: string
  type: string
  country_code?: string
  country_name?: string
  region?: string
  region_id?: number
}

export abstract class MetaIntegrationFetchWebhookBase extends MetaIntegrationCampaignsBase {
  private readonly CAMPAIGN_FIELDS =
    'id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,start_time,stop_time,buying_type'

  private readonly AD_SET_FIELDS =
    'id,name,status,effective_status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,start_time,end_time'

  private readonly AD_FIELDS =
    'id,name,status,effective_status,created_time,creative{id,name,title,body,image_url,thumbnail_url,object_story_spec,asset_feed_spec,call_to_action_type}'

  async searchCountries(
    accessToken: string,
    query: string,
  ): Promise<Array<{ key: string; name: string }>> {
    const params = new URLSearchParams()
    params.set('type', 'adgeolocation')
    params.set('location_types', '["country"]')
    params.set('q', query)
    params.set('limit', '1000')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/search?${params.toString()}`
    const response = await fetch(url)
    const raw = await response.text()

    if (!response.ok) {
      throw new BadRequestException(`Country search failed: ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as { data?: Array<{ key: string; name: string }> }
    return parsed.data ?? []
  }

  async searchLocations(accessToken: string, query: string): Promise<LocResult[]> {
    const fetchType = async (locType: string): Promise<LocResult[]> => {
      try {
        const params = new URLSearchParams()
        params.set('type', 'adgeolocation')
        params.set('location_types', `["${locType}"]`)
        params.set('q', query)
        params.set('limit', '10')
        params.set('access_token', accessToken)
        params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
        const url = `${this.API_BASE}/search?${params.toString()}`
        const response = await fetch(url)
        if (!response.ok) return []
        const raw = await response.text()
        const parsed = JSON.parse(raw) as { data?: LocResult[] }
        return parsed.data ?? []
      } catch {
        return []
      }
    }

    const [cities, regions, zips] = await Promise.all([
      fetchType('city'),
      fetchType('region'),
      fetchType('zip'),
    ])

    return [...cities, ...regions, ...zips]
  }

  async searchInterests(
    accessToken: string,
    query: string,
  ): Promise<
    Array<{
      id: string
      name: string
      audience_size_lower_bound?: number
      audience_size_upper_bound?: number
      path?: string[]
      topic?: string
    }>
  > {
    const params = new URLSearchParams()
    params.set('type', 'adinterest')
    params.set('q', query)
    params.set('limit', '30')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/search?${params.toString()}`
    const response = await fetch(url)
    const raw = await response.text()

    if (!response.ok) {
      throw new BadRequestException(`Interest search failed: ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as {
      data?: Array<{
        id: string
        name: string
        audience_size_lower_bound?: number
        audience_size_upper_bound?: number
        path?: string[]
        topic?: string
      }>
    }
    return parsed.data ?? []
  }

  async getDeliveryEstimate(
    accessToken: string,
    adAccountId: string,
    targetingSpec: Record<string, unknown>,
    optimizationGoal: string,
  ): Promise<{
    estimate_mau_lower_bound: number
    estimate_mau_upper_bound: number
    estimate_dau: number
    estimate_ready: boolean
    daily_outcomes_curve: Array<{ spend: number; reach: number; actions: number }>
  }> {
    const params = new URLSearchParams()
    const safeTargeting = { ...targetingSpec }
    delete safeTargeting.interests
    delete safeTargeting.behaviors
    delete safeTargeting.targeting_automation

    const estGeo = safeTargeting.geo_locations as Record<string, unknown> | undefined
    if (estGeo?.countries) {
      const filtered = (estGeo.countries as string[]).filter((c) => c !== 'WW')
      if (filtered.length === 0) {
        estGeo.countries = ['US']
      } else {
        estGeo.countries = filtered
      }
    }

    params.set(
      'fields',
      'daily_outcomes_curve,estimate_dau,estimate_mau_lower_bound,estimate_mau_upper_bound,estimate_ready',
    )
    params.set('targeting_spec', JSON.stringify(safeTargeting))
    params.set('optimization_goal', optimizationGoal)
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adAccountId}/delivery_estimate?${params.toString()}`
    const response = await fetch(url)
    const raw = await response.text()

    if (!response.ok) {
      this.logger.error(`Meta delivery estimate failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(`Delivery estimate failed: ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as { data?: Array<Record<string, unknown>> }
    const first = parsed.data?.[0] ?? {}
    return {
      estimate_mau_lower_bound: (first.estimate_mau_lower_bound as number) ?? 0,
      estimate_mau_upper_bound: (first.estimate_mau_upper_bound as number) ?? 0,
      estimate_dau: (first.estimate_dau as number) ?? 0,
      estimate_ready: (first.estimate_ready as boolean) ?? false,
      daily_outcomes_curve:
        (first.daily_outcomes_curve as Array<{ spend: number; reach: number; actions: number }>) ??
        [],
    }
  }

  async getObjectStatus(
    accessToken: string,
    objectId: string,
  ): Promise<{ id: string; effective_status: string; configured_status?: string }> {
    const params = new URLSearchParams()
    params.set('fields', 'id,effective_status,configured_status')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${objectId}?${params.toString()}`
    const response = await fetch(url)
    const raw = await response.text()

    if (!response.ok) {
      throw new BadRequestException(`Failed to get object status: ${raw.slice(0, 200)}`)
    }

    return JSON.parse(raw)
  }

  async fetchCampaigns(
    accessToken: string,
    adAccountId: string,
    limit = 100,
  ): Promise<MetaFetchedCampaign[]> {
    const params = new URLSearchParams()
    params.set('fields', this.CAMPAIGN_FIELDS)
    params.set('limit', String(limit))
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adAccountId}/campaigns?${params.toString()}`
    return this.fetchAllPages<MetaFetchedCampaign>(url, META_ERRORS.FETCH_META_CAMPAIGNS_FAILED)
  }

  async fetchAdSets(
    accessToken: string,
    campaignId: string,
    limit = 100,
  ): Promise<MetaFetchedAdSet[]> {
    const params = new URLSearchParams()
    params.set('fields', this.AD_SET_FIELDS)
    params.set('limit', String(limit))
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${campaignId}/adsets?${params.toString()}`
    return this.fetchAllPages<MetaFetchedAdSet>(url, META_ERRORS.FETCH_META_AD_SETS_FAILED)
  }

  async fetchAds(accessToken: string, adSetId: string, limit = 100): Promise<MetaFetchedAd[]> {
    const params = new URLSearchParams()
    params.set('fields', this.AD_FIELDS)
    params.set('limit', String(limit))
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adSetId}/ads?${params.toString()}`
    return this.fetchAllPages<MetaFetchedAd>(url, META_ERRORS.FETCH_META_ADS_FAILED)
  }

  async fetchAdCreative(
    accessToken: string,
    creativeId: string,
  ): Promise<MetaFetchedCreative | null> {
    const params = new URLSearchParams()
    params.set(
      'fields',
      'id,name,title,body,image_url,thumbnail_url,object_story_spec,asset_feed_spec,call_to_action_type',
    )
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${creativeId}?${params.toString()}`
    const response = await this.fetchWithRetry(
      url,
      undefined,
      META_ERRORS.FETCH_META_CREATIVE_FAILED,
    )
    const raw = await response.text()
    if (!response.ok) return null
    return JSON.parse(raw) as MetaFetchedCreative
  }

  async fetchFullHierarchy(
    accessToken: string,
    adAccountId: string,
  ): Promise<{
    campaigns: Array<
      MetaFetchedCampaign & { ad_sets: Array<MetaFetchedAdSet & { ads: MetaFetchedAd[] }> }
    >
    total_campaigns: number
    total_ad_sets: number
    total_ads: number
  }> {
    const campaigns = await this.fetchCampaigns(accessToken, adAccountId)
    let totalAdSets = 0
    let totalAds = 0

    const enriched = await Promise.all(
      campaigns.map(async (campaign) => {
        const adSets = await this.fetchAdSets(accessToken, campaign.id)
        totalAdSets += adSets.length

        const adSetsWithAds = await Promise.all(
          adSets.map(async (adSet) => {
            const ads = await this.fetchAds(accessToken, adSet.id)
            totalAds += ads.length
            return { ...adSet, ads }
          }),
        )

        return { ...campaign, ad_sets: adSetsWithAds }
      }),
    )

    return {
      campaigns: enriched,
      total_campaigns: campaigns.length,
      total_ad_sets: totalAdSets,
      total_ads: totalAds,
    }
  }

  parseSignedRequest(signedRequest: string): Record<string, unknown> | null {
    const [encodedSig, payload] = signedRequest.split('.')
    if (!encodedSig || !payload) return null

    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    const data = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    )
    const expectedSig = createHmac('sha256', this.appSecret).update(payload).digest()

    if (!timingSafeEqual(sig, expectedSig)) return null
    return data
  }

  getWebhookVerifyToken(): string {
    return this.config.get<string>('META_WEBHOOK_VERIFY_TOKEN') || ''
  }

  verifyWebhookSignature(rawBody: Buffer | string, signatureHeader: string): boolean {
    if (!signatureHeader || !this.appSecret) return false

    const expectedPrefix = 'sha256='
    if (!signatureHeader.startsWith(expectedPrefix)) return false

    const givenDigest = signatureHeader.slice(expectedPrefix.length)
    const expectedDigest = createHmac('sha256', this.appSecret).update(rawBody).digest('hex')

    const given = Buffer.from(givenDigest, 'utf8')
    const expected = Buffer.from(expectedDigest, 'utf8')

    if (given.length !== expected.length) return false
    return timingSafeEqual(given, expected)
  }
}
