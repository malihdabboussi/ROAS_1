import * as crypto from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { resolveAuthRegisterError } from '../../auth/config/auth-errors.config'
import Stripe from 'stripe'
import { WaitlistRepository } from '../repositories/waitlist.repository'

const WAITLIST_COUNT_OFFSET = 2320

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name)
  private stripe: Stripe | null = null
  private isTestMode = false

  constructor(
    private readonly configService: ConfigService,
    private readonly waitlistRepository: WaitlistRepository,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY')
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey)
      this.isTestMode = stripeKey.startsWith('sk_test_')
    }
  }

  private inviteSecret(): string {
    return this.configService.getOrThrow<string>('INVITE_CODE_SECRET')
  }

  private hashInviteCode(code: string): string {
    return crypto.createHmac('sha256', this.inviteSecret()).update(code.trim()).digest('hex')
  }

  async joinWaitlist(input: {
    email: string
    name?: string
    source?: string
    notes?: string
    heard_from?: string
    use_case?: string
  }) {
    const email = input.email.trim().toLowerCase()
    const existing = await this.waitlistRepository.findWaitlistEntryByEmail(email)

    if (existing) {
      return { success: true as const, alreadyJoined: true, message: "You're already on the list." }
    }

    try {
      await this.waitlistRepository.insertWaitlistEntry({
        email,
        name: input.name?.trim() || null,
        source: input.source?.trim() || null,
        notes: input.notes?.trim() || null,
        heard_from: input.heard_from?.trim() || null,
        use_case: input.use_case?.trim() || null,
        status: 'pending',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'waitlist join failed'
      this.logger.warn(`waitlist join failed: ${message}`)
      throw error
    }

    return { success: true as const, alreadyJoined: false }
  }

  async validateDirectInviteCode(code: string): Promise<{ valid: boolean }> {
    if (!code?.trim()) return { valid: false }

    const data = await this.waitlistRepository.findActiveDirectInviteCode(code.trim())
    if (!data) return { valid: false }
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) return { valid: false }

    return { valid: true }
  }

  async registerWithInvite(email: string, password: string, code: string) {
    const emailNorm = email.trim().toLowerCase()
    const codeHash = this.hashInviteCode(code)

    const invite = await this.waitlistRepository.findPendingInvite(codeHash, emailNorm)
    if (!invite) {
      return { error: 'Invalid or expired invite code.', status: 400 as const }
    }

    const { data: userData, error: createErr } = await this.waitlistRepository.createConfirmedUser(
      emailNorm,
      password,
    )

    if (createErr) {
      this.logger.warn(`register-with-invite createUser failed: ${createErr.message}`)
      return resolveAuthRegisterError(createErr.message)
    }

    const userId = userData.user?.id
    if (!userId) {
      return { error: 'Account creation failed.', status: 400 as const }
    }

    const { error: redeemErr } = await this.waitlistRepository.redeemInviteCode(
      codeHash,
      emailNorm,
      userId,
    )

    if (redeemErr) {
      await this.waitlistRepository.deleteUser(userId)
      this.logger.warn(`redeem_invite_code failed: ${redeemErr.message}`)
      return { error: 'Invalid or expired invite code.', status: 400 as const }
    }

    const { data: session, error: signInError } = await this.waitlistRepository.signInWithPassword(
      emailNorm,
      password,
    )

    if (signInError) {
      this.logger.warn(`sign-in after invite register failed: ${signInError.message}`)
      return { error: 'Account created but sign-in failed. Try logging in.', status: 400 as const }
    }

    return {
      session: {
        access_token: session.session?.access_token,
        refresh_token: session.session?.refresh_token,
      },
      user: { id: userData.user?.id, email: userData.user?.email },
    }
  }

  // ============================================================
  // WAITLIST COUNT
  // ============================================================

  async getWaitlistCount(): Promise<{ count: number }> {
    const { count, error } = await this.waitlistRepository.countWaitlistEntries()

    if (error) {
      this.logger.warn(`waitlist count failed: ${error.message}`)
      return { count: WAITLIST_COUNT_OFFSET }
    }

    return { count: (count ?? 0) + WAITLIST_COUNT_OFFSET }
  }

  // ============================================================
  // FAST-TRACK CHECKOUT
  // ============================================================

  private getPriceId(row: {
    stripe_price_id?: string | null
    stripe_test_price_id?: string | null
  }): string | null {
    if (this.isTestMode) return row.stripe_test_price_id ?? row.stripe_price_id ?? null
    return row.stripe_price_id ?? null
  }

  async createFastTrackCheckout(
    email: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Stripe is not configured')

    const emailNorm = email.trim().toLowerCase()

    const entry = await this.waitlistRepository.findWaitlistEntryByEmail(emailNorm)

    if (!entry) throw new Error('Email not found on the waitlist. Join the waitlist first.')
    if (entry.status === 'registered') throw new Error('This email is already registered.')

    const plan = await this.waitlistRepository.findActiveUltraMonthlyPlan()
    if (!plan) throw new Error('Ultra monthly plan not found')

    const priceId = this.getPriceId(plan)
    if (!priceId) throw new Error('Ultra plan has no Stripe price configured')

    const customers = await this.stripe.customers.list({ email: emailNorm, limit: 1 })
    let customerId: string
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    } else {
      const customer = await this.stripe.customers.create({
        email: emailNorm,
        metadata: { source: 'fast_track' },
      })
      customerId = customer.id
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'fast_track',
        email: emailNorm,
        plan_id: plan.id,
        plan_slug: plan.slug,
      },
    })

    await this.waitlistRepository.insertFastTrackPurchase(emailNorm, session.id)

    this.logger.log(`[fast-track] Checkout created for ${emailNorm}: session=${session.id}`)

    return { url: session.url ?? '' }
  }

  // ============================================================
  // FAST-TRACK STATUS (polled after payment)
  // ============================================================

  async getFastTrackStatus(
    sessionId: string,
  ): Promise<{ status: string; inviteCode: string | null }> {
    const data = await this.waitlistRepository.findFastTrackStatusBySessionId(sessionId)
    if (!data) return { status: 'not_found', inviteCode: null }

    return { status: data.status, inviteCode: data.invite_code }
  }

  // ============================================================
  // FAST-TRACK LINK (called after account creation)
  // ============================================================

  async linkFastTrackSubscription(
    userId: string,
    userEmail: string,
    sessionId?: string,
  ): Promise<{ linked: boolean }> {
    let purchase: {
      id: string
      stripe_customer_id: string | null
      stripe_subscription_id: string | null
      status: string
    } | null = null

    if (sessionId) {
      purchase = await this.waitlistRepository.findPaidFastTrackPurchaseBySessionId(sessionId)
    }

    if (!purchase) {
      const emailNorm = userEmail.trim().toLowerCase()
      purchase = await this.waitlistRepository.findPaidFastTrackPurchaseByEmail(emailNorm)
    }

    if (!purchase || !purchase.stripe_subscription_id) {
      return { linked: false }
    }

    const existingSub = await this.waitlistRepository.findActiveUserSubscription(userId)

    if (existingSub) {
      this.logger.log(`[fast-track-link] User ${userId} already has active subscription, skipping`)
      await this.waitlistRepository.markFastTrackRedeemed(purchase.id, userId)
      return { linked: true }
    }

    const plan = await this.waitlistRepository.findActiveUltraMonthlyPlanId()

    if (!plan) {
      this.logger.error('[fast-track-link] Ultra monthly plan not found')
      return { linked: false }
    }

    if (this.stripe && purchase.stripe_subscription_id) {
      try {
        const sub = await this.stripe.subscriptions.retrieve(purchase.stripe_subscription_id)
        const ps = (sub as any).current_period_start
        const pe = (sub as any).current_period_end
        const periodStart = typeof ps === 'number' ? new Date(ps * 1000).toISOString() : null
        const periodEnd = typeof pe === 'number' ? new Date(pe * 1000).toISOString() : null

        await this.waitlistRepository.upsertUserSubscription({
          userId,
          planId: plan.id,
          stripeSubscriptionId: purchase.stripe_subscription_id,
          stripeCustomerId: purchase.stripe_customer_id,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        })

        await this.stripe.subscriptions.update(purchase.stripe_subscription_id, {
          metadata: { user_id: userId },
        })
        if (purchase.stripe_customer_id) {
          await this.stripe.customers.update(purchase.stripe_customer_id, {
            metadata: { user_id: userId },
          })
        }
      } catch (err) {
        this.logger.error(`[fast-track-link] Stripe sync failed: ${err}`)
        return { linked: false }
      }
    }

    await this.waitlistRepository.markFastTrackRedeemed(purchase.id, userId)

    this.logger.log(`[fast-track-link] Linked subscription for user ${userId}`)
    return { linked: true }
  }
}
