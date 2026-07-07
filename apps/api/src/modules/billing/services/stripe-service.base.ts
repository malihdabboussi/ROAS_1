import { Logger, type OnModuleInit } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import type { ErrorReporter } from '@vibey/api-shared'
import { BillingStripeAgentBrainRepository } from '../repositories/billing-stripe-agent-brain.repository'
import { BillingStripeCustomerRepository } from '../repositories/billing-stripe-customer.repository'
import { BillingStripePaymentRepository } from '../repositories/billing-stripe-payment.repository'
import type { CreditsService } from './credits.service'
import type { CreditPack } from './stripe-service.types'

export abstract class StripeServiceBase implements OnModuleInit {
  protected readonly logger = new Logger('StripeService')
  protected stripe?: Stripe
  protected isTestMode = false

  constructor(
    protected readonly configService: ConfigService,
    protected readonly creditsService: CreditsService,
    protected readonly errorReporter: ErrorReporter,
    protected readonly stripeCustomerRepository: BillingStripeCustomerRepository,
    protected readonly stripePaymentRepository: BillingStripePaymentRepository,
    protected readonly stripeAgentBrainRepository: BillingStripeAgentBrainRepository,
  ) {}

  onModuleInit(): void {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured -- billing Stripe disabled')
      return
    }

    this.stripe = new Stripe(secretKey)
    this.isTestMode = secretKey.startsWith('sk_test_')

    this.logger.log(`Stripe client initialized (${this.isTestMode ? 'TEST' : 'LIVE'} mode)`)
  }

  /** Pick the correct stripe_price_id based on test/live mode */
  protected getPriceId(row: {
    stripe_price_id?: string | null
    stripe_test_price_id?: string | null
  }): string | null {
    if (this.isTestMode) {
      return row.stripe_test_price_id ?? row.stripe_price_id ?? null
    }
    return row.stripe_price_id ?? null
  }

  protected isDuplicatePurchaseError(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false
    return error.code === '23505' || error.message?.toLowerCase().includes('duplicate') === true
  }

  protected getSubscriptionPeriod(subscription: Stripe.Subscription): {
    start: number | null
    end: number | null
  } {
    const item = subscription.items?.data?.[0] as any
    const rawStart = item?.current_period_start ?? (subscription as any).current_period_start
    const rawEnd = item?.current_period_end ?? (subscription as any).current_period_end
    return {
      start: typeof rawStart === 'number' && Number.isFinite(rawStart) ? rawStart : null,
      end: typeof rawEnd === 'number' && Number.isFinite(rawEnd) ? rawEnd : null,
    }
  }

  protected mapSubscriptionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'canceled',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      paused: 'paused',
    }

    return statusMap[status] ?? status
  }

  /**
   * Find a credit pack by id or slug.
   */
  protected async findCreditPack(packIdOrSlug: string): Promise<CreditPack | null> {
    // Try by UUID id first
    const { data: byId } = await this.stripeCustomerRepository.findCreditPackById(packIdOrSlug)

    if (byId) return byId

    // Fall back to slug
    const { data: bySlug } = await this.stripeCustomerRepository.findCreditPackBySlug(packIdOrSlug)

    return bySlug ?? null
  }

  /**
   * Find existing Stripe customer for user, or CREATE one.
   * Always returns a valid customer ID — required for saving payment methods.
   */
  protected async findOrCreateCustomerId(userId: string, email: string): Promise<string> {
    // 1. Check user_subscriptions table
    const { data: sub } = await this.stripeCustomerRepository.findSubscriptionCustomerId(userId)

    if (sub?.stripe_customer_id) {
      return sub.stripe_customer_id
    }

    // 2. Check Stripe for existing customer by email
    const customers = await this.stripe.customers.list({ email, limit: 1 })
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id
      await this.persistCustomerId(userId, customerId)
      return customerId
    }

    // 3. Create a new Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      metadata: { user_id: userId },
    })
    this.logger.log(`Created Stripe customer ${customer.id} for user ${userId}`)
    await this.persistCustomerId(userId, customer.id)
    return customer.id
  }

  /**
   * Persist stripe_customer_id in user_subscriptions (upsert).
   */
  protected async persistCustomerId(userId: string, customerId: string): Promise<void> {
    const { data: existing } = await this.stripeCustomerRepository.findAnyUserSubscription(userId)

    if (existing) {
      await this.stripeCustomerRepository.updateCustomerId(userId, customerId)
    } else {
      const { data: freePlan } = await this.stripeCustomerRepository.findFreePlanId()

      await this.stripeCustomerRepository.insertCustomerSubscription(
        userId,
        freePlan?.id ?? null,
        customerId,
      )
    }
  }

  /**
   * Get the Stripe customer ID for a user (for portal access).
   */
  async getCustomerIdForUser(userId: string): Promise<string | null> {
    // 1. Check user_subscriptions
    const { data: sub } = await this.stripeCustomerRepository.findSubscriptionCustomerId(userId)

    if (sub?.stripe_customer_id) return sub.stripe_customer_id

    // 2. Check user profile (email) → search Stripe customers
    const { data: profile } = await this.stripeCustomerRepository.findUserEmail(userId)

    if (profile?.email) {
      const customers = await this.stripe.customers.list({ email: profile.email, limit: 1 })
      if (customers.data.length > 0) {
        return customers.data[0].id
      }
    }

    // 3. Fallback: check auth.users
    const { data: authUser } = await this.stripeCustomerRepository.findAuthUser(userId)
    if (authUser?.user?.email) {
      const customers = await this.stripe.customers.list({
        email: authUser.user.email,
        limit: 1,
      })
      if (customers.data.length > 0) {
        return customers.data[0].id
      }
    }

    return null
  }

  /**
   * Public entry point for the scheduled purge. Safe to call from cron.
   * Delegates to the same idempotent worker used by Stripe webhooks.
   */
  async runAgentBrainPurge(): Promise<void> {
    await this.purgeExpiredAgentBrains()
  }

  protected async purgeExpiredAgentBrains(): Promise<void> {
    const nowIso = new Date().toISOString()
    const { data: expired, error } = await this.stripeAgentBrainRepository.listExpiredBrains(nowIso)
    if (error) throw new Error(`Failed to load expired brains: ${error.message}`)
    for (const brain of expired ?? []) {
      await this.stripeAgentBrainRepository.deleteBrainData(brain.id)
      await this.stripeAgentBrainRepository.markBrainDeleted(brain.id)
      await this.stripeAgentBrainRepository.cancelUserAddonsByBrainId(brain.id)
    }
  }
}
