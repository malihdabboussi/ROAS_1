import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import type {
  StripeBalanceTransaction,
  StripeCharge,
  StripeCoupon,
  StripeCustomer,
  StripeInvoice,
  StripeOAuthTokenResponse,
  StripePaymentLink,
  StripePrice,
  StripeProduct,
  StripeSubscription,
} from '../types/stripe.types'

@Injectable()
export class StripeIntegration {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string

  private readonly AUTHORIZE_URL = 'https://connect.stripe.com/oauth/authorize'
  private readonly TOKEN_URL = 'https://connect.stripe.com/oauth/token'
  private readonly API_BASE = 'https://api.stripe.com/v1'

  constructor(
    private readonly config: ConfigService,
    private readonly errorReporter: ErrorReporter,
  ) {
    this.clientId = this.config.get<string>('STRIPE_CONNECT_CLIENT_ID') || ''
    this.clientSecret = this.config.get<string>('STRIPE_CONNECT_SECRET_KEY') || ''
    this.redirectUri = this.config.get<string>('STRIPE_CONNECT_REDIRECT_URI') || ''
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri)
  }

  buildAuthorizationUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing Stripe Connect OAuth configuration')
    }

    const params = new URLSearchParams()
    params.set('response_type', 'code')
    params.set('client_id', this.clientId)
    params.set('scope', 'read_write')
    params.set('redirect_uri', this.redirectUri)
    params.set('state', state)
    return `${this.AUTHORIZE_URL}?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<StripeOAuthTokenResponse> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing Stripe Connect OAuth configuration')
    }

    const body = new URLSearchParams()
    body.set('grant_type', 'authorization_code')
    body.set('code', code)
    body.set('client_secret', this.clientSecret)
    body.set('redirect_uri', this.redirectUri)

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`Stripe token exchange failed (${response.status}): ${raw}`)
    }

    return JSON.parse(raw) as StripeOAuthTokenResponse
  }

  async createProduct(
    accessToken: string,
    input: {
      name: string
      description?: string
      images?: string[]
      url?: string
      shippable?: boolean
      unit_label?: string
      tax_code?: string
      active?: boolean
      statement_descriptor?: string
      default_price_data?: {
        currency: string
        unit_amount: number
        recurring?: { interval: 'day' | 'week' | 'month' | 'year'; interval_count?: number }
      }
      campaign_id?: string
      campaign_name?: string
      metadata?: Record<string, string>
    },
  ) {
    const body = new URLSearchParams()
    body.set('name', input.name)
    if (input.description) body.set('description', input.description)
    if (input.images) {
      input.images.forEach((url, i) => body.set(`images[${i}]`, url))
    }
    if (input.url) body.set('url', input.url)
    if (typeof input.shippable === 'boolean') body.set('shippable', String(input.shippable))
    if (input.unit_label) body.set('unit_label', input.unit_label)
    if (input.tax_code) body.set('tax_code', input.tax_code)
    if (typeof input.active === 'boolean') body.set('active', String(input.active))
    if (input.statement_descriptor) body.set('statement_descriptor', input.statement_descriptor)
    if (input.default_price_data) {
      body.set('default_price_data[currency]', input.default_price_data.currency.toLowerCase())
      body.set('default_price_data[unit_amount]', String(input.default_price_data.unit_amount))
      if (input.default_price_data.recurring) {
        body.set(
          'default_price_data[recurring][interval]',
          input.default_price_data.recurring.interval,
        )
        if (input.default_price_data.recurring.interval_count) {
          body.set(
            'default_price_data[recurring][interval_count]',
            String(input.default_price_data.recurring.interval_count),
          )
        }
      }
    }
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) body.set(`metadata[${k}]`, v)
    }
    return this.request('POST', '/products', accessToken, body)
  }

  async updateProduct(
    accessToken: string,
    productId: string,
    input: {
      name?: string
      description?: string
      active?: boolean
      metadata?: Record<string, string>
    },
  ) {
    const body = new URLSearchParams()
    if (input.name !== undefined) body.set('name', input.name)
    if (input.description !== undefined) body.set('description', input.description)
    if (input.active !== undefined) body.set('active', String(input.active))
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) body.set(`metadata[${k}]`, v)
    }
    return this.request('POST', `/products/${productId}`, accessToken, body)
  }

  async deleteProduct(accessToken: string, productId: string) {
    return this.request('DELETE', `/products/${productId}`, accessToken)
  }

  async listProducts(accessToken: string) {
    return this.request('GET', '/products?limit=100&active=true', accessToken)
  }

  async listProductsByCampaign(
    accessToken: string,
    campaignId: string,
  ): Promise<{ data: StripeProduct[] }> {
    const result = (await this.request('GET', '/products?limit=100&active=true', accessToken)) as {
      data: StripeProduct[]
    }
    return {
      ...result,
      data: (result.data ?? []).filter((p) => p.metadata?.campaign_id === campaignId),
    }
  }

  async createPrice(
    accessToken: string,
    input: {
      product: string
      currency: string
      unit_amount: number
      recurring?: { interval: 'day' | 'week' | 'month' | 'year'; interval_count?: number }
      nickname?: string
      active?: boolean
      billing_scheme?: 'per_unit' | 'tiered'
      tax_behavior?: 'inclusive' | 'exclusive' | 'unspecified'
      lookup_key?: string
      campaign_id?: string
      campaign_name?: string
      metadata?: Record<string, string>
    },
  ) {
    const body = new URLSearchParams()
    body.set('product', input.product)
    body.set('currency', input.currency.toLowerCase())
    body.set('unit_amount', String(input.unit_amount))
    if (input.nickname) body.set('nickname', input.nickname)
    if (typeof input.active === 'boolean') body.set('active', String(input.active))
    if (input.billing_scheme) body.set('billing_scheme', input.billing_scheme)
    if (input.tax_behavior) body.set('tax_behavior', input.tax_behavior)
    if (input.lookup_key) body.set('lookup_key', input.lookup_key)
    if (input.recurring) {
      body.set('recurring[interval]', input.recurring.interval)
      if (input.recurring.interval_count) {
        body.set('recurring[interval_count]', String(input.recurring.interval_count))
      }
    }
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) body.set(`metadata[${k}]`, v)
    }
    return this.request('POST', '/prices', accessToken, body)
  }

  async listPrices(accessToken: string) {
    return this.request('GET', '/prices?limit=100&active=true', accessToken)
  }

  async listPricesByProduct(
    accessToken: string,
    productId: string,
  ): Promise<{ data: StripePrice[] }> {
    const qs = `limit=100&active=true&product=${encodeURIComponent(productId)}`
    return this.request('GET', `/prices?${qs}`, accessToken) as Promise<{ data: StripePrice[] }>
  }

  async createPaymentLink(
    accessToken: string,
    input: {
      price: string
      quantity: number
      trial_period_days?: number
      after_completion_type?: 'redirect' | 'hosted_confirmation'
      after_completion_url?: string
      custom_fields?: Array<{
        key: string
        label: { type: 'custom'; custom: string }
        type: 'text' | 'numeric' | 'dropdown'
        optional?: boolean
      }>
      campaign_id?: string
      campaign_name?: string
      metadata?: Record<string, string>
    },
  ) {
    const body = new URLSearchParams()
    body.set('line_items[0][price]', input.price)
    body.set('line_items[0][quantity]', String(input.quantity))
    if (typeof input.trial_period_days === 'number') {
      body.set('subscription_data[trial_period_days]', String(input.trial_period_days))
    }
    if (input.after_completion_type) {
      body.set('after_completion[type]', input.after_completion_type)
      if (input.after_completion_url) {
        body.set('after_completion[redirect][url]', input.after_completion_url)
      }
    }
    if (input.custom_fields) {
      input.custom_fields.forEach((field, i) => {
        body.set(`custom_fields[${i}][key]`, field.key)
        body.set(`custom_fields[${i}][label][type]`, field.label.type)
        body.set(`custom_fields[${i}][label][custom]`, field.label.custom)
        body.set(`custom_fields[${i}][type]`, field.type)
        if (typeof field.optional === 'boolean') {
          body.set(`custom_fields[${i}][optional]`, String(field.optional))
        }
      })
    }
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) body.set(`metadata[${k}]`, v)
    }
    return this.request('POST', '/payment_links', accessToken, body)
  }

  async listPaymentLinks(accessToken: string) {
    return this.request('GET', '/payment_links?limit=100', accessToken)
  }

  async listPaymentLinksByCampaign(
    accessToken: string,
    campaignId: string,
  ): Promise<{ data: StripePaymentLink[] }> {
    const result = (await this.request('GET', '/payment_links?limit=100', accessToken)) as {
      data: StripePaymentLink[]
    }
    return {
      ...result,
      data: (result.data ?? []).filter((l) => l.metadata?.campaign_id === campaignId),
    }
  }

  async createCoupon(
    accessToken: string,
    input: {
      id?: string
      name?: string
      percent_off?: number
      amount_off?: number
      currency?: string
      duration: 'once' | 'forever' | 'repeating'
      duration_in_months?: number
      max_redemptions?: number
      redeem_by?: number
      metadata?: Record<string, string>
    },
  ): Promise<StripeCoupon> {
    const body = new URLSearchParams()
    body.set('duration', input.duration)
    if (input.id) body.set('id', input.id)
    if (input.name) body.set('name', input.name)
    if (typeof input.percent_off === 'number') body.set('percent_off', String(input.percent_off))
    if (typeof input.amount_off === 'number') body.set('amount_off', String(input.amount_off))
    if (input.currency) body.set('currency', input.currency.toLowerCase())
    if (typeof input.duration_in_months === 'number')
      body.set('duration_in_months', String(input.duration_in_months))
    if (typeof input.max_redemptions === 'number')
      body.set('max_redemptions', String(input.max_redemptions))
    if (typeof input.redeem_by === 'number') body.set('redeem_by', String(input.redeem_by))
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) body.set(`metadata[${k}]`, v)
    }
    return this.request('POST', '/coupons', accessToken, body) as Promise<StripeCoupon>
  }

  async listCouponsByCampaign(
    accessToken: string,
    campaignId: string,
  ): Promise<{ data: StripeCoupon[] }> {
    const result = (await this.request('GET', '/coupons?limit=100', accessToken)) as {
      data: StripeCoupon[]
    }
    return {
      ...result,
      data: (result.data ?? []).filter((c) => c.metadata?.campaign_id === campaignId),
    }
  }

  async createRefund(
    accessToken: string,
    input: {
      charge: string
      amount?: number
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
      campaign_id?: string
      campaign_name?: string
      metadata?: Record<string, string>
    },
  ) {
    const body = new URLSearchParams()
    body.set('charge', input.charge)
    if (typeof input.amount === 'number') body.set('amount', String(input.amount))
    if (input.reason) body.set('reason', input.reason)
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) body.set(`metadata[${k}]`, v)
    }
    return this.request('POST', '/refunds', accessToken, body)
  }

  async listCharges(
    accessToken: string,
    opts?: {
      limit?: number
      starting_after?: string
      created_gte?: number
      created_lte?: number
      customer?: string
    },
  ): Promise<{ data: StripeCharge[]; has_more: boolean }> {
    const qs = new URLSearchParams()
    qs.set('limit', String(opts?.limit ?? 100))
    if (opts?.starting_after) qs.set('starting_after', opts.starting_after)
    if (opts?.created_gte) qs.set('created[gte]', String(opts.created_gte))
    if (opts?.created_lte) qs.set('created[lte]', String(opts.created_lte))
    if (opts?.customer) qs.set('customer', opts.customer)
    return this.request('GET', `/charges?${qs.toString()}`, accessToken) as Promise<{
      data: StripeCharge[]
      has_more: boolean
    }>
  }

  async listCustomers(
    accessToken: string,
    opts?: {
      limit?: number
      starting_after?: string
      email?: string
      created_gte?: number
      created_lte?: number
    },
  ): Promise<{ data: StripeCustomer[]; has_more: boolean }> {
    const qs = new URLSearchParams()
    qs.set('limit', String(opts?.limit ?? 100))
    if (opts?.starting_after) qs.set('starting_after', opts.starting_after)
    if (opts?.email) qs.set('email', opts.email)
    if (opts?.created_gte) qs.set('created[gte]', String(opts.created_gte))
    if (opts?.created_lte) qs.set('created[lte]', String(opts.created_lte))
    return this.request('GET', `/customers?${qs.toString()}`, accessToken) as Promise<{
      data: StripeCustomer[]
      has_more: boolean
    }>
  }

  async listSubscriptions(
    accessToken: string,
    opts?: {
      limit?: number
      starting_after?: string
      status?: string
      customer?: string
      created_gte?: number
      created_lte?: number
    },
  ): Promise<{ data: StripeSubscription[]; has_more: boolean }> {
    const qs = new URLSearchParams()
    qs.set('limit', String(opts?.limit ?? 100))
    if (opts?.starting_after) qs.set('starting_after', opts.starting_after)
    if (opts?.status) qs.set('status', opts.status)
    if (opts?.customer) qs.set('customer', opts.customer)
    if (opts?.created_gte) qs.set('created[gte]', String(opts.created_gte))
    if (opts?.created_lte) qs.set('created[lte]', String(opts.created_lte))
    return this.request('GET', `/subscriptions?${qs.toString()}`, accessToken) as Promise<{
      data: StripeSubscription[]
      has_more: boolean
    }>
  }

  async listInvoices(
    accessToken: string,
    opts?: {
      limit?: number
      starting_after?: string
      status?: string
      customer?: string
      subscription?: string
      created_gte?: number
      created_lte?: number
    },
  ): Promise<{ data: StripeInvoice[]; has_more: boolean }> {
    const qs = new URLSearchParams()
    qs.set('limit', String(opts?.limit ?? 100))
    if (opts?.starting_after) qs.set('starting_after', opts.starting_after)
    if (opts?.status) qs.set('status', opts.status)
    if (opts?.customer) qs.set('customer', opts.customer)
    if (opts?.subscription) qs.set('subscription', opts.subscription)
    if (opts?.created_gte) qs.set('created[gte]', String(opts.created_gte))
    if (opts?.created_lte) qs.set('created[lte]', String(opts.created_lte))
    return this.request('GET', `/invoices?${qs.toString()}`, accessToken) as Promise<{
      data: StripeInvoice[]
      has_more: boolean
    }>
  }

  async listBalanceTransactions(
    accessToken: string,
    gteUnix: number,
    lteUnix: number,
  ): Promise<{ data: StripeBalanceTransaction[] }> {
    return this.request(
      'GET',
      `/balance_transactions?limit=100&created[gte]=${gteUnix}&created[lte]=${lteUnix}&expand[]=data.source`,
      accessToken,
    ) as Promise<{ data: StripeBalanceTransaction[] }>
  }

  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    accessToken: string,
    body?: URLSearchParams,
  ): Promise<unknown> {
    const response = await fetch(`${this.API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: method === 'POST' ? body?.toString() : undefined,
    })
    const raw = await response.text()
    if (!response.ok) {
      const err = new BadRequestException(`Stripe API failed (${response.status}): ${raw}`)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/stripe',
          error_code: `upstream_http_${response.status}`,
          message: `Stripe API failed (${response.status}): ${raw.slice(0, 200)}`,
          context: { path, status: response.status },
        },
        err,
      )
      throw err
    }
    return JSON.parse(raw) as unknown
  }
}
