import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { PayPalOAuthTokenResponse, PayPalUserInfo } from '../types/paypal.types'

const DEFAULT_SCOPES = [
  'openid',
  'profile',
  'email',
  'address',
  'https://uri.paypal.com/services/paypalattributes',
  'https://uri.paypal.com/services/reporting/search/read',
].join(' ')

@Injectable()
export class PaypalIntegration {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly sandbox: boolean

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('PAYPAL_CLIENT_ID') || ''
    this.clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET') || ''
    this.redirectUri = this.config.get<string>('PAYPAL_REDIRECT_URI') || ''
    this.sandbox =
      String(this.config.get<string>('PAYPAL_SANDBOX') ?? 'true').toLowerCase() === 'true'
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri)
  }

  getApiBase(): string {
    return this.sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
  }

  getConnectBase(): string {
    return this.sandbox ? 'https://www.sandbox.paypal.com' : 'https://www.paypal.com'
  }

  buildAuthorizationUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing PayPal OAuth configuration')
    }
    const params = new URLSearchParams()
    params.set('flowEntry', 'static')
    params.set('client_id', this.clientId)
    params.set('response_type', 'code')
    params.set('scope', DEFAULT_SCOPES)
    params.set('redirect_uri', this.redirectUri)
    params.set('state', state)
    return `${this.getConnectBase()}/connect?${params.toString()}`
  }

  private basicAuthHeader(): string {
    const raw = `${this.clientId}:${this.clientSecret}`
    return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`
  }

  async exchangeCodeForTokens(code: string): Promise<PayPalOAuthTokenResponse> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing PayPal OAuth configuration')
    }
    const body = new URLSearchParams()
    body.set('grant_type', 'authorization_code')
    body.set('code', code)
    const response = await fetch(`${this.getApiBase()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: this.basicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`PayPal token exchange failed (${response.status}): ${raw}`)
    }
    return JSON.parse(raw) as PayPalOAuthTokenResponse
  }

  async refreshAccessToken(refreshToken: string): Promise<PayPalOAuthTokenResponse> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing PayPal OAuth configuration')
    }
    const body = new URLSearchParams()
    body.set('grant_type', 'refresh_token')
    body.set('refresh_token', refreshToken)
    const response = await fetch(`${this.getApiBase()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: this.basicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`PayPal token refresh failed (${response.status}): ${raw}`)
    }
    return JSON.parse(raw) as PayPalOAuthTokenResponse
  }

  async getUserInfo(accessToken: string): Promise<PayPalUserInfo> {
    const url = `${this.getApiBase()}/v1/identity/oauth2/userinfo?schema=openid`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`PayPal userinfo failed (${response.status}): ${raw}`)
    }
    return JSON.parse(raw) as PayPalUserInfo
  }

  async searchTransactions(
    accessToken: string,
    query: Record<string, string | undefined>,
  ): Promise<unknown> {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') qs.set(k, v)
    }
    const path = `/v1/reporting/transactions?${qs.toString()}`
    return this.requestJson('GET', path, accessToken)
  }

  async getBalances(
    accessToken: string,
    asOfTime?: string,
    currencyCode?: string,
  ): Promise<unknown> {
    const qs = new URLSearchParams()
    if (asOfTime) qs.set('as_of_time', asOfTime)
    if (currencyCode) qs.set('currency_code', currencyCode)
    const q = qs.toString()
    const path = q ? `/v1/reporting/balances?${q}` : '/v1/reporting/balances'
    return this.requestJson('GET', path, accessToken)
  }

  private async requestJson(method: 'GET', path: string, accessToken: string): Promise<unknown> {
    const response = await fetch(`${this.getApiBase()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`PayPal API failed (${response.status}): ${raw}`)
    }
    return JSON.parse(raw) as unknown
  }
}
