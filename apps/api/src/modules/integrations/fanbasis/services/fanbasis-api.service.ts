import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { VaultService } from '../../../vault/services/vault.service'
import { FanbasisIntegration } from '../integrations/fanbasis.integration'

const PROVIDER = 'fanbasis'
const LABEL_API_KEY = 'api_key'

@Injectable()
export class FanbasisApiService {
  private readonly logger = new Logger(FanbasisApiService.name)

  constructor(
    private readonly fb: FanbasisIntegration,
    private readonly vault: VaultService,
    private readonly connections: IntegrationConnectionsRepository,
  ) {}

  private async getApiKey(userId: string): Promise<string> {
    const key = await this.vault.getSecret(userId, PROVIDER, LABEL_API_KEY)
    if (!key) throw new BadRequestException('FanBasis is not connected')
    return key
  }

  async connect(userId: string, apiKey: string) {
    const products = (await this.fb.listProducts(apiKey)) as { status?: string }
    if (products.status === 'error') {
      throw new BadRequestException('Invalid FanBasis API key')
    }

    await this.vault.storeSecret(userId, PROVIDER, LABEL_API_KEY, apiKey, 'api_key', {})

    await this.connections.ensureAvailable({
        id: PROVIDER,
        provider: PROVIDER,
        name: 'FanBasis',
        description:
          'Connect FanBasis to manage products, checkout sessions, subscriptions, customers, discount codes, and transactions.',
        auth_type: 'api_key',
        is_available: true,
        metadata: {
          category: 'payments',
          website: 'https://www.fanbasis.com',
        },
      })

    const now = new Date().toISOString()
    const fanbasisRow = {
      user_id: userId,
      integration_id: PROVIDER,
      provider: PROVIDER,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: {},
      updated_at: now,
    }

    await this.connections.upsertConnection(PROVIDER, userId, fanbasisRow)

    return { connected: true }
  }

  async disconnect(userId: string) {
    await this.vault.deleteSecret(userId, PROVIDER, LABEL_API_KEY)

    await this.connections.markPersonalDisconnected(PROVIDER, userId)
  }

  async getStatus(userId: string) {
    const hasKey = await this.vault.hasSecret(userId, PROVIDER, LABEL_API_KEY)
    if (!hasKey) return { connected: false, status: null }

    const data = await this.connections.getSimpleStatus(PROVIDER, userId)

    return {
      connected: data?.status === 'connected',
      status: (data?.status as string) ?? null,
      connectedAt: (data?.connected_at as string) ?? null,
    }
  }

  // ── Products ──
  listProducts(userId: string, query?: Record<string, string>) {
    return this.getApiKey(userId).then((k) => this.fb.listProducts(k, query))
  }

  // ── Checkout Sessions ──
  createCheckoutSession(userId: string, body: Record<string, unknown>) {
    return this.getApiKey(userId).then((k) => this.fb.createCheckoutSession(k, body))
  }
  getCheckoutSession(userId: string, id: string) {
    return this.getApiKey(userId).then((k) => this.fb.getCheckoutSession(k, id))
  }
  deleteCheckoutSession(userId: string, id: string) {
    return this.getApiKey(userId).then((k) => this.fb.deleteCheckoutSession(k, id))
  }
  createEmbeddedCheckoutSession(userId: string, body: Record<string, unknown>) {
    return this.getApiKey(userId).then((k) => this.fb.createEmbeddedCheckoutSession(k, body))
  }

  // ── Transactions ──
  getTransactions(userId: string, query?: Record<string, string>) {
    return this.getApiKey(userId).then((k) => this.fb.getTransactions(k, query))
  }
  getCheckoutSessionTransactions(userId: string, id: string, query?: Record<string, string>) {
    return this.getApiKey(userId).then((k) => this.fb.getCheckoutSessionTransactions(k, id, query))
  }
  refundTransaction(userId: string, transactionId: string, body?: Record<string, unknown>) {
    return this.getApiKey(userId).then((k) => this.fb.refundTransaction(k, transactionId, body))
  }
  getTransaction(userId: string, transactionId: string) {
    return this.getApiKey(userId).then((k) => this.fb.getTransaction(k, transactionId))
  }

  // ── Subscriptions ──
  getProductSubscriptions(userId: string, productId: string, query?: Record<string, string>) {
    return this.getApiKey(userId).then((k) => this.fb.getProductSubscriptions(k, productId, query))
  }
  getCheckoutSessionSubscriptions(userId: string, id: string, query?: Record<string, string>) {
    return this.getApiKey(userId).then((k) => this.fb.getCheckoutSessionSubscriptions(k, id, query))
  }
  cancelSubscription(userId: string, sessionId: string, subscriptionId: string) {
    return this.getApiKey(userId).then((k) =>
      this.fb.cancelSubscription(k, sessionId, subscriptionId),
    )
  }
  extendSubscription(userId: string, sessionId: string, body: Record<string, unknown>) {
    return this.getApiKey(userId).then((k) => this.fb.extendSubscription(k, sessionId, body))
  }

  // ── Webhook Subscriptions ──
  createWebhookSubscription(userId: string, body: Record<string, unknown>) {
    return this.getApiKey(userId).then((k) => this.fb.createWebhookSubscription(k, body))
  }
  getWebhookSubscriptions(userId: string) {
    return this.getApiKey(userId).then((k) => this.fb.getWebhookSubscriptions(k))
  }
  deleteWebhookSubscription(userId: string, id: string) {
    return this.getApiKey(userId).then((k) => this.fb.deleteWebhookSubscription(k, id))
  }
  testWebhookSubscription(userId: string, id: string) {
    return this.getApiKey(userId).then((k) => this.fb.testWebhookSubscription(k, id))
  }

  // ── Customers ──
  getCustomers(userId: string, query?: Record<string, string>) {
    return this.getApiKey(userId).then((k) => this.fb.getCustomers(k, query))
  }
  chargeCustomer(userId: string, customerId: string, body: Record<string, unknown>) {
    return this.getApiKey(userId).then((k) => this.fb.chargeCustomer(k, customerId, body))
  }
  getCustomerPaymentMethods(userId: string, customerId: string) {
    return this.getApiKey(userId).then((k) => this.fb.getCustomerPaymentMethods(k, customerId))
  }

  // ── Subscribers ──
  getSubscribers(userId: string, query?: Record<string, string>) {
    return this.getApiKey(userId).then((k) => this.fb.getSubscribers(k, query))
  }

  // ── Discount Codes ──
  listDiscountCodes(userId: string, query?: Record<string, string>) {
    return this.getApiKey(userId).then((k) => this.fb.listDiscountCodes(k, query))
  }
  createDiscountCode(userId: string, body: Record<string, unknown>) {
    return this.getApiKey(userId).then((k) => this.fb.createDiscountCode(k, body))
  }
  getDiscountCode(userId: string, id: string) {
    return this.getApiKey(userId).then((k) => this.fb.getDiscountCode(k, id))
  }
  updateDiscountCode(userId: string, id: string, body: Record<string, unknown>) {
    return this.getApiKey(userId).then((k) => this.fb.updateDiscountCode(k, id, body))
  }
  deleteDiscountCode(userId: string, id: string) {
    return this.getApiKey(userId).then((k) => this.fb.deleteDiscountCode(k, id))
  }
}
