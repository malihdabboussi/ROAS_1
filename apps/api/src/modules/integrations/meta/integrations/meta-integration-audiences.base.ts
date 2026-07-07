import { BadRequestException } from '@nestjs/common'
import { META_ERRORS } from '../config/meta-errors.config'
import type {
  MetaCreatePixelInput,
  MetaCreatePixelResult,
  MetaCustomAudience,
  MetaCustomAudienceCreateInput,
  MetaCustomConversion,
  MetaCustomConversionCreateInput,
  MetaInstagramAccount,
  MetaLookalikeCreateInput,
  MetaPage,
} from '../types/meta.types'
import { MetaIntegrationCoreBase } from './meta-integration-core.base'

export abstract class MetaIntegrationAudiencesBase extends MetaIntegrationCoreBase {
  async createPixel(
    accessToken: string,
    adAccountId: string,
    input: MetaCreatePixelInput,
  ): Promise<MetaCreatePixelResult> {
    const url = `${this.API_BASE}/${adAccountId}/adspixels`
    const payload: Record<string, unknown> = {
      name: input.name,
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }
    if (input.description) payload.description = input.description
    if (input.data_use_setting) payload.data_use_setting = input.data_use_setting

    this.logger.log(`[createPixel] POST ${url} payload keys: ${Object.keys(payload).join(', ')}`)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const raw = await response.text()
    this.logger.log(`[createPixel] status=${response.status} raw=${raw.slice(0, 500)}`)
    if (!response.ok) {
      this.logger.error(`Meta pixel creation failed: ${response.status} ${raw.slice(0, 300)}`)
      let userMessage: string = META_ERRORS.PIXEL_CREATE_FAILED
      try {
        const parsed = JSON.parse(raw) as { error?: { message?: string; code?: number } }
        const code = parsed.error?.code
        const metaMessage = parsed.error?.message?.replace(/^\(#\d+\)\s*/, '')
        if (metaMessage) userMessage = metaMessage
        if (code === 6200 && !metaMessage) userMessage = META_ERRORS.PIXEL_ALREADY_EXISTS
        else if (code === 6202 && !metaMessage) userMessage = META_ERRORS.PIXEL_MULTIPLE_EXIST
        else if (code === 200) userMessage = META_ERRORS.PIXEL_PERMISSION_DENIED
        else if (code === 100) userMessage = META_ERRORS.PIXEL_INVALID_NAME
      } catch {
        /* use default */
      }
      throw new BadRequestException(userMessage)
    }
    return JSON.parse(raw) as MetaCreatePixelResult
  }

  async getCustomAudiences(
    accessToken: string,
    adAccountId: string,
  ): Promise<MetaCustomAudience[]> {
    const params = new URLSearchParams()
    params.set('fields', 'id,name,subtype,approximate_count')
    params.set('limit', '200')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adAccountId}/customaudiences?${params.toString()}`
    return this.fetchAllPages<MetaCustomAudience>(url, META_ERRORS.FETCH_CUSTOM_AUDIENCES_FAILED)
  }

  async createCustomAudience(
    accessToken: string,
    adAccountId: string,
    input: MetaCustomAudienceCreateInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/customaudiences`
    const payload: Record<string, unknown> = {
      name: input.name,
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }
    if (input.rule) payload.rule = JSON.stringify(input.rule)
    if (typeof input.retention_days === 'number') payload.retention_days = input.retention_days

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(
        `Meta custom audience creation failed: ${response.status} ${raw.slice(0, 300)}`,
      )
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.CUSTOM_AUDIENCE_CREATE_FAILED),
      )
    }
    return JSON.parse(raw) as { id: string }
  }

  async createLookalikeAudience(
    accessToken: string,
    adAccountId: string,
    input: MetaLookalikeCreateInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/customaudiences`
    const payload: Record<string, unknown> = {
      name: input.name,
      subtype: 'LOOKALIKE',
      origin_audience_id: input.origin_audience_id,
      country: input.country,
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }
    if (typeof input.ratio === 'number') payload.ratio = input.ratio

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta lookalike creation failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.LOOKALIKE_CREATE_FAILED),
      )
    }
    return JSON.parse(raw) as { id: string }
  }

  async getCustomConversions(
    accessToken: string,
    adAccountId: string,
  ): Promise<MetaCustomConversion[]> {
    const params = new URLSearchParams()
    params.set('fields', 'id,name,custom_event_type,rule,event_source_id')
    params.set('limit', '200')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adAccountId}/customconversions?${params.toString()}`
    return this.fetchAllPages<MetaCustomConversion>(
      url,
      META_ERRORS.FETCH_CUSTOM_CONVERSIONS_FAILED,
    )
  }

  async createCustomConversion(
    accessToken: string,
    adAccountId: string,
    input: MetaCustomConversionCreateInput,
  ): Promise<{ id: string }> {
    const url = `${this.API_BASE}/${adAccountId}/customconversions`
    const payload: Record<string, unknown> = {
      name: input.name,
      event_source_id: input.event_source_id,
      custom_event_type: input.custom_event_type,
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }
    if (input.rule) payload.rule = input.rule

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(
        `Meta custom conversion creation failed: ${response.status} ${raw.slice(0, 300)}`,
      )
      throw new BadRequestException(
        this.parseMetaErrorMessage(raw, META_ERRORS.CUSTOM_CONVERSION_CREATE_FAILED),
      )
    }
    return JSON.parse(raw) as { id: string }
  }

  async getInstagramAccountsForPage(
    accessToken: string,
    pageId: string,
  ): Promise<MetaInstagramAccount[]> {
    const pageAccessToken = await this.getPageAccessToken(accessToken, pageId)
    const lookupToken = pageAccessToken || accessToken
    const appSecretProof = this.buildAppSecretProof(lookupToken)

    const params = new URLSearchParams()
    params.set('fields', 'id,username,profile_pic,has_profile_picture')
    params.set('limit', '200')
    params.set('access_token', lookupToken)
    params.set('appsecret_proof', appSecretProof)
    const url = `${this.API_BASE}/${pageId}/instagram_accounts?${params.toString()}`

    let accounts: MetaInstagramAccount[] = []
    try {
      accounts = await this.fetchAllPages<MetaInstagramAccount>(
        url,
        META_ERRORS.FETCH_INSTAGRAM_ACCOUNTS_FAILED,
      )
      this.logger.debug(
        `[IG-DEBUG] /${pageId}/instagram_accounts returned ${accounts.length} accounts (token type: ${pageAccessToken ? 'page' : 'user'}): ${JSON.stringify(accounts.map((a) => ({ id: a.id, username: a.username })))}`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(
        `Meta instagram_accounts lookup failed for page ${pageId}, falling back: ${message}`,
      )
    }

    if (accounts.length > 0) return accounts

    const fallbackParams = new URLSearchParams()
    fallbackParams.set(
      'fields',
      'instagram_business_account{id,username,profile_picture_url},connected_instagram_account{id,username,profile_picture_url}',
    )
    fallbackParams.set('access_token', accessToken)
    fallbackParams.set('appsecret_proof', this.buildAppSecretProof(accessToken))

    const fallbackUrl = `${this.API_BASE}/${pageId}?${fallbackParams.toString()}`
    const fallbackResponse = await this.fetchWithRetry(
      fallbackUrl,
      undefined,
      'Failed to fetch Instagram accounts',
    )
    const fallbackRaw = await fallbackResponse.text()
    if (!fallbackResponse.ok) {
      throw new BadRequestException(
        `Failed to fetch Instagram accounts: ${fallbackRaw.slice(0, 200)}`,
      )
    }

    const parsed = JSON.parse(fallbackRaw) as {
      instagram_business_account?: { id?: string; username?: string; profile_picture_url?: string }
      connected_instagram_account?: { id?: string; username?: string; profile_picture_url?: string }
    }

    const fromPageFields = [parsed.instagram_business_account, parsed.connected_instagram_account]
      .filter(
        (row): row is { id: string; username?: string; profile_picture_url?: string } => !!row?.id,
      )
      .map((row) => ({
        id: row.id,
        username: row.username,
        profile_pic: row.profile_picture_url,
        has_profile_picture: !!row.profile_picture_url,
      }))

    this.logger.debug(
      `[IG-DEBUG] /${pageId} fallback fields: ${JSON.stringify({ instagram_business_account: parsed.instagram_business_account, connected_instagram_account: parsed.connected_instagram_account })}`,
    )
    if (fromPageFields.length === 0) return []

    const deduped = new Map<string, MetaInstagramAccount>()
    for (const account of fromPageFields) {
      deduped.set(account.id, account)
    }
    return Array.from(deduped.values())
  }

  async getInstagramAccountsForAdAccount(
    accessToken: string,
    adAccountId: string,
  ): Promise<MetaInstagramAccount[]> {
    const params = new URLSearchParams()
    params.set('fields', 'id,username,profile_picture_url')
    params.set('limit', '200')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adAccountId}/instagram_accounts?${params.toString()}`

    const rows = await this.fetchAllPages<{
      id: string
      username?: string
      profile_picture_url?: string
    }>(url, META_ERRORS.FETCH_INSTAGRAM_ACCOUNTS_FOR_AD_ACCOUNT_FAILED)

    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      profile_pic: row.profile_picture_url,
      has_profile_picture: !!row.profile_picture_url,
    }))
  }

  protected async getPageAccessToken(accessToken: string, pageId: string): Promise<string | null> {
    try {
      const params = new URLSearchParams()
      params.set('fields', 'id,access_token')
      params.set('limit', '200')
      params.set('access_token', accessToken)
      params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
      const url = `${this.API_BASE}/me/accounts?${params.toString()}`
      const pages = await this.fetchAllPages<MetaPage>(url, META_ERRORS.FETCH_PAGES_FAILED)
      const page = pages.find((candidate) => candidate.id === pageId)
      const token = (page?.access_token ?? '').trim()
      return token || null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(
        `Meta page access_token lookup failed for page ${pageId}, falling back to user token: ${message}`,
      )
      return null
    }
  }

  async getObjectInsights(
    accessToken: string,
    objectId: string,
    fields: string[],
    timeRange?: { since: string; until: string },
  ): Promise<Record<string, unknown> | null> {
    const params = new URLSearchParams()
    params.set('fields', fields.join(','))
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    if (timeRange) {
      params.set('time_range', JSON.stringify(timeRange))
    }
    const url = `${this.API_BASE}/${objectId}/insights?${params.toString()}`
    const response = await fetch(url)
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`Failed to fetch insights: ${raw.slice(0, 200)}`)
    }
    const parsed = JSON.parse(raw) as { data?: Array<Record<string, unknown>> }
    return parsed.data?.[0] ?? null
  }

  async updateObjectBudget(
    accessToken: string,
    objectId: string,
    budget: { daily_budget?: number; lifetime_budget?: number },
  ): Promise<{ success: boolean }> {
    const url = `${this.API_BASE}/${objectId}`
    const payload: Record<string, unknown> = {
      access_token: accessToken,
      appsecret_proof: this.buildAppSecretProof(accessToken),
    }
    if (typeof budget.daily_budget === 'number')
      payload.daily_budget = Math.round(budget.daily_budget)
    if (typeof budget.lifetime_budget === 'number')
      payload.lifetime_budget = Math.round(budget.lifetime_budget)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`Meta budget update failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(`Budget update failed: ${raw.slice(0, 200)}`)
    }
    return JSON.parse(raw) as { success: boolean }
  }
}
