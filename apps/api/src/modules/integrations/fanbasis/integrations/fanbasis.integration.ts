import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const DEFAULT_BASE_URL = 'https://www.fanbasis.com/public-api'

@Injectable()
export class FanbasisIntegration {
  constructor(private readonly config: ConfigService) {}

  private getBaseUrl(): string {
    const raw = this.config.get<string>('FANBASIS_PUBLIC_API_BASE_URL')?.trim()
    const base = (raw && raw.length > 0 ? raw : DEFAULT_BASE_URL).replace(/\/$/, '')
    return base
  }

  private async request<T>(
    apiKey: string,
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const baseUrl = this.getBaseUrl()
    const url = `${baseUrl}${path}`
    const sendsJsonContentType = Boolean(body) || (method !== 'GET' && method !== 'DELETE')
    let baseUrlHost = ''
    try {
      baseUrlHost = new URL(baseUrl).host
    } catch {
      baseUrlHost = 'parse_error'
    }
    const res = await fetch(url, {
      method,
      headers: {
        ...(sendsJsonContentType ? { 'Content-Type': 'application/json' } : {}),
        'x-api-key': apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new BadRequestException(`FanBasis API error (${res.status}): ${text}`)
    }

    return (await res.json()) as T
  }

  async listProducts(apiKey: string, query?: Record<string, string>) {
    const qs = new URLSearchParams(query ?? {}).toString()
    return this.request(apiKey, 'GET', `/products${qs ? `?${qs}` : ''}`)
  }

  async createCheckoutSession(apiKey: string, body: Record<string, unknown>) {
    return this.request(apiKey, 'POST', '/checkout-sessions', body)
  }

  async getCheckoutSession(apiKey: string, id: string) {
    return this.request(apiKey, 'GET', `/checkout-sessions/${encodeURIComponent(id)}`)
  }

  async deleteCheckoutSession(apiKey: string, id: string) {
    return this.request(apiKey, 'DELETE', `/checkout-sessions/${encodeURIComponent(id)}`)
  }

  async getTransactions(apiKey: string, query?: Record<string, string>) {
    const qs = new URLSearchParams(query ?? {}).toString()
    return this.request(apiKey, 'GET', `/checkout-sessions/transactions${qs ? `?${qs}` : ''}`)
  }

  async getProductSubscriptions(apiKey: string, productId: string, query?: Record<string, string>) {
    const qs = new URLSearchParams(query ?? {}).toString()
    return this.request(
      apiKey,
      'GET',
      `/checkout-sessions/${encodeURIComponent(productId)}/subscriptions${qs ? `?${qs}` : ''}`,
    )
  }

  async getCheckoutSessionTransactions(apiKey: string, id: string, query?: Record<string, string>) {
    const qs = new URLSearchParams(query ?? {}).toString()
    return this.request(
      apiKey,
      'GET',
      `/checkout-sessions/${encodeURIComponent(id)}/transactions${qs ? `?${qs}` : ''}`,
    )
  }

  async getCheckoutSessionSubscriptions(
    apiKey: string,
    id: string,
    query?: Record<string, string>,
  ) {
    const qs = new URLSearchParams(query ?? {}).toString()
    return this.request(
      apiKey,
      'GET',
      `/checkout-sessions/${encodeURIComponent(id)}/subscriptions${qs ? `?${qs}` : ''}`,
    )
  }

  async cancelSubscription(apiKey: string, sessionId: string, subscriptionId: string) {
    return this.request(
      apiKey,
      'DELETE',
      `/checkout-sessions/${encodeURIComponent(sessionId)}/subscriptions/${encodeURIComponent(subscriptionId)}`,
    )
  }

  async createEmbeddedCheckoutSession(apiKey: string, body: Record<string, unknown>) {
    return this.request(apiKey, 'POST', '/checkout-sessions/embedded', body)
  }

  async refundTransaction(apiKey: string, transactionId: string, body?: Record<string, unknown>) {
    return this.request(
      apiKey,
      'POST',
      `/checkout-sessions/transactions/${encodeURIComponent(transactionId)}/refund`,
      body,
    )
  }

  async extendSubscription(apiKey: string, sessionId: string, body: Record<string, unknown>) {
    return this.request(
      apiKey,
      'POST',
      `/checkout-sessions/${encodeURIComponent(sessionId)}/extend-subscription`,
      body,
    )
  }

  async createWebhookSubscription(apiKey: string, body: Record<string, unknown>) {
    return this.request(apiKey, 'POST', '/webhook-subscriptions', body)
  }

  async getWebhookSubscriptions(apiKey: string) {
    return this.request(apiKey, 'GET', '/webhook-subscriptions')
  }

  async deleteWebhookSubscription(apiKey: string, id: string) {
    return this.request(apiKey, 'DELETE', `/webhook-subscriptions/${encodeURIComponent(id)}`)
  }

  async testWebhookSubscription(apiKey: string, id: string) {
    return this.request(apiKey, 'POST', `/webhook-subscriptions/${encodeURIComponent(id)}/test`)
  }

  async getCustomers(apiKey: string, query?: Record<string, string>) {
    const qs = new URLSearchParams(query ?? {}).toString()
    return this.request(apiKey, 'GET', `/customers${qs ? `?${qs}` : ''}`)
  }

  async chargeCustomer(apiKey: string, customerId: string, body: Record<string, unknown>) {
    return this.request(apiKey, 'POST', `/customers/${encodeURIComponent(customerId)}/charge`, body)
  }

  async getCustomerPaymentMethods(apiKey: string, customerId: string) {
    return this.request(
      apiKey,
      'GET',
      `/customers/${encodeURIComponent(customerId)}/payment-methods`,
    )
  }

  async getSubscribers(apiKey: string, query?: Record<string, string>) {
    const qs = new URLSearchParams(query ?? {}).toString()
    return this.request(apiKey, 'GET', `/subscribers${qs ? `?${qs}` : ''}`)
  }

  async listDiscountCodes(apiKey: string, query?: Record<string, string>) {
    const qs = new URLSearchParams(query ?? {}).toString()
    return this.request(apiKey, 'GET', `/discount-codes${qs ? `?${qs}` : ''}`)
  }

  async createDiscountCode(apiKey: string, body: Record<string, unknown>) {
    return this.request(apiKey, 'POST', '/discount-codes', body)
  }

  async getDiscountCode(apiKey: string, id: string) {
    return this.request(apiKey, 'GET', `/discount-codes/${encodeURIComponent(id)}`)
  }

  async updateDiscountCode(apiKey: string, id: string, body: Record<string, unknown>) {
    return this.request(apiKey, 'PUT', `/discount-codes/${encodeURIComponent(id)}`, body)
  }

  async deleteDiscountCode(apiKey: string, id: string) {
    return this.request(apiKey, 'DELETE', `/discount-codes/${encodeURIComponent(id)}`)
  }

  async getTransaction(apiKey: string, transactionId: string) {
    return this.request(apiKey, 'GET', `/transactions/${encodeURIComponent(transactionId)}`)
  }
}
