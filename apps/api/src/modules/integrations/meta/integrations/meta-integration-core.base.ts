import { createHmac } from 'crypto'
import { BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import { META_ERRORS } from '../config/meta-errors.config'
import type {
  MetaAdAccount,
  MetaPage,
  MetaPageInfo,
  MetaPixel,
  MetaTokenResponse,
} from '../types/meta.types'

export abstract class MetaIntegrationCoreBase {
  protected readonly logger = new Logger(this.constructor.name)

  protected readonly appId: string
  protected readonly appSecret: string
  protected readonly redirectUri: string

  protected readonly AUTH_URL = 'https://www.facebook.com/v25.0/dialog/oauth'
  protected readonly TOKEN_URL = 'https://graph.facebook.com/v25.0/oauth/access_token'
  protected readonly API_BASE = 'https://graph.facebook.com/v25.0'

  protected readonly SCOPES = [
    'ads_management',
    'ads_read',
    'pages_manage_ads',
    'pages_read_engagement',
    'pages_show_list',
    'business_management',
    'public_profile',
  ]

  constructor(
    protected readonly config: ConfigService,
    protected readonly errorReporter: ErrorReporter,
  ) {
    this.appId = this.config.get<string>('META_APP_ID') || ''
    this.appSecret = this.config.get<string>('META_APP_SECRET') || ''
    this.redirectUri = this.config.get<string>('META_OAUTH_REDIRECT_URI') || ''
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appSecret && this.redirectUri)
  }

  buildAuthorizationUrl(state: string): string {
    if (!this.appId || !this.redirectUri) {
      throw new BadRequestException(META_ERRORS.MISSING_OAUTH_CONFIG)
    }

    const params = new URLSearchParams()
    params.set('client_id', this.appId)
    params.set('redirect_uri', this.redirectUri)
    params.set('scope', this.SCOPES.join(','))
    params.set('response_type', 'code')
    params.set('state', state)
    return `${this.AUTH_URL}?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<MetaTokenResponse> {
    if (!this.appId || !this.appSecret || !this.redirectUri) {
      throw new BadRequestException(META_ERRORS.MISSING_OAUTH_CONFIG)
    }

    const params = new URLSearchParams()
    params.set('client_id', this.appId)
    params.set('client_secret', this.appSecret)
    params.set('redirect_uri', this.redirectUri)
    params.set('code', code)

    const response = await fetch(`${this.TOKEN_URL}?${params.toString()}`)
    const raw = await response.text()

    if (!response.ok) {
      this.logger.error(`Meta token exchange failed: ${response.status} ${raw.slice(0, 300)}`)
      throw new BadRequestException(
        `Meta token exchange failed (${response.status}): ${raw.slice(0, 200)}`,
      )
    }

    return JSON.parse(raw) as MetaTokenResponse
  }

  async exchangeForLongLivedToken(shortLivedToken: string): Promise<MetaTokenResponse> {
    const params = new URLSearchParams()
    params.set('grant_type', 'fb_exchange_token')
    params.set('client_id', this.appId)
    params.set('client_secret', this.appSecret)
    params.set('fb_exchange_token', shortLivedToken)

    const response = await fetch(`${this.TOKEN_URL}?${params.toString()}`)
    const raw = await response.text()

    if (!response.ok) {
      this.logger.error(
        `Meta long-lived token exchange failed: ${response.status} ${raw.slice(0, 300)}`,
      )
      throw new BadRequestException(
        `Meta long-lived token exchange failed (${response.status}): ${raw.slice(0, 200)}`,
      )
    }

    return JSON.parse(raw) as MetaTokenResponse
  }

  protected buildAppSecretProof(accessToken: string): string {
    if (!this.appSecret) {
      throw new BadRequestException(META_ERRORS.MISSING_APP_SECRET)
    }
    return createHmac('sha256', this.appSecret).update(accessToken).digest('hex')
  }

  protected parseMetaErrorMessage(raw: string, fallback: string): string {
    try {
      const parsed = JSON.parse(raw) as {
        error?: {
          error_user_msg?: string
          error_user_title?: string
          message?: string
          code?: number
          error_subcode?: number
        }
      }
      const e = parsed.error
      if (!e) return fallback

      const subcode = e.error_subcode
      const code = e.code
      const msg = (e.message ?? '').toLowerCase()

      if (msg.includes('type') && msg.includes('integer')) return META_ERRORS.BUDGET_TYPE_INTEGER
      if (code === 100 && subcode === 1885097) return META_ERRORS.INVALID_FIELD_VALUE
      if (code === 100) return e.error_user_msg || META_ERRORS.INVALID_CAMPAIGN_SETTINGS
      if (code === 200) return META_ERRORS.INSUFFICIENT_PERMISSIONS_AD_ACCOUNT
      if (code === 2635) return META_ERRORS.API_VERSION_OUTDATED
      if (code === 80004 || code === 613) return META_ERRORS.API_RATE_LIMIT
      if (code === 190) return META_ERRORS.CONNECTION_EXPIRED

      if (e.error_user_msg) return e.error_user_msg
      if (e.message) return e.message.replace(/^\(#\d+\)\s*/, '')
    } catch {
      /* use fallback */
    }
    return fallback
  }

  protected isRetryableStatus(status: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504
  }

  protected reportUpstreamFailure(
    errorLabel: string,
    status: number,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    reportAppError(this.errorReporter, {
      app: process.env.APP_NAME ?? 'api',
      category: 'integration',
      feature: 'integrations/meta',
      error_code: status > 0 ? `upstream_http_${status}` : 'network_failed',
      message: `${errorLabel}: ${message}`,
      context: { ...context, status: status > 0 ? status : undefined },
    })
  }

  protected async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  protected async fetchWithRetry(
    url: string,
    init: RequestInit | undefined,
    errorLabel: string,
  ) {
    const maxAttempts = 3
    const retryDelaysMs = [250, 600]
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, init)
        if (response.ok || !this.isRetryableStatus(response.status) || attempt === maxAttempts) {
          return response
        }
        const body = (await response.text()).slice(0, 200)
        this.logger.warn(
          `${errorLabel}: retrying request ${attempt}/${maxAttempts} after status ${response.status}${body ? ` (${body})` : ''}`,
        )
      } catch (error) {
        lastError = error
        if (attempt === maxAttempts) break
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(
          `${errorLabel}: retrying request ${attempt}/${maxAttempts} after network error: ${message}`,
        )
      }

      const delay = retryDelaysMs[attempt - 1] ?? retryDelaysMs[retryDelaysMs.length - 1] ?? 300
      await this.sleep(delay)
    }

    if (lastError instanceof Error) {
      this.reportUpstreamFailure(errorLabel, 0, lastError.message)
      throw lastError
    }
    this.reportUpstreamFailure(errorLabel, 0, 'request failed')
    throw new BadRequestException(`${errorLabel}: request failed`)
  }

  protected async fetchAllPages<T>(initialUrl: string, errorLabel: string): Promise<T[]> {
    const results: T[] = []
    let url: string | null = initialUrl

    while (url) {
      const response = await this.fetchWithRetry(url, undefined, errorLabel)
      const raw = await response.text()

      if (!response.ok) {
        const err = new BadRequestException(`${errorLabel}: ${raw.slice(0, 200)}`)
        this.reportUpstreamFailure(errorLabel, response.status, raw.slice(0, 200), { url })
        throw err
      }

      const parsed = JSON.parse(raw) as { data?: T[]; paging?: { next?: string } }
      if (parsed.data) results.push(...parsed.data)
      url = parsed.paging?.next ?? null
    }

    return results
  }

  async getMetaUserId(accessToken: string): Promise<string> {
    const params = new URLSearchParams()
    params.set('fields', 'id')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/me?${params.toString()}`
    const response = await this.fetchWithRetry(url, undefined, 'Failed to fetch Meta user ID')
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`Failed to fetch Meta user ID: ${raw.slice(0, 200)}`)
    }
    const parsed = JSON.parse(raw) as { id?: string }
    if (!parsed.id) throw new BadRequestException('Meta /me returned no user ID')
    return parsed.id
  }

  async getAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
    const params = new URLSearchParams()
    params.set('fields', 'id,account_id,name,currency,account_status')
    params.set('limit', '200')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/me/adaccounts?${params.toString()}`
    return this.fetchAllPages<MetaAdAccount>(url, META_ERRORS.FETCH_AD_ACCOUNTS_FAILED)
  }

  async getPages(accessToken: string): Promise<MetaPage[]> {
    const params = new URLSearchParams()
    params.set(
      'fields',
      'id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}',
    )
    params.set('limit', '200')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/me/accounts?${params.toString()}`
    return this.fetchAllPages<MetaPage>(url, META_ERRORS.FETCH_PAGES_FAILED)
  }

  async getPageInfo(accessToken: string, pageId: string): Promise<MetaPageInfo | null> {
    const params = new URLSearchParams()
    params.set('fields', 'id,name,picture{url}')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${pageId}?${params.toString()}`
    const response = await this.fetchWithRetry(url, undefined, META_ERRORS.FETCH_PAGES_FAILED)
    const raw = await response.text()
    if (!response.ok) return null
    const parsed = JSON.parse(raw) as {
      id?: string
      name?: string
      picture?: { data?: { url?: string } }
    }
    if (!parsed?.id) return null
    return {
      id: parsed.id,
      name: parsed.name ?? '',
      picture_url: parsed.picture?.data?.url ?? null,
    }
  }

  async getPixels(accessToken: string, adAccountId: string): Promise<MetaPixel[]> {
    const params = new URLSearchParams()
    params.set('fields', 'id,name')
    params.set('limit', '200')
    params.set('access_token', accessToken)
    params.set('appsecret_proof', this.buildAppSecretProof(accessToken))
    const url = `${this.API_BASE}/${adAccountId}/adspixels?${params.toString()}`
    return this.fetchAllPages<MetaPixel>(url, META_ERRORS.FETCH_PIXELS_FAILED)
  }
}
