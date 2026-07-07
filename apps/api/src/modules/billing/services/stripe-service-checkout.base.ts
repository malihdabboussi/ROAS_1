import type Stripe from 'stripe'
import { StripeServiceBase } from './stripe-service.base'

export abstract class StripeCheckoutBase extends StripeServiceBase {
  // ============================================================
  // CHECKOUT SESSIONS
  // ============================================================

  /**
   * Create a subscription — 1-click if saved payment method, else Stripe Checkout.
   * Ported from legacy SubscriptionManagementService.upgradeToPro.
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    planSlug: string,
    billingPeriod: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string; charged?: boolean }> {
    // Look up the plan — guard against double-suffix (e.g. starter-monthly + monthly)
    const slug = planSlug.endsWith(`-${billingPeriod}`) ? planSlug : `${planSlug}-${billingPeriod}`
    const { data: plan, error: planError } =
      await this.stripeCustomerRepository.findActivePlanBySlug(slug)

    if (planError || !plan) {
      throw new Error(`Plan not found: ${slug}`)
    }

    const priceId = this.getPriceId(plan)
    if (!priceId) {
      throw new Error(`Plan ${slug} has no Stripe price ID configured`)
    }

    // Get existing Stripe customer
    const customerId = await this.findOrCreateCustomerId(userId, email)

    // ── 1-CLICK PATH: Check if customer has saved payment method ──
    if (customerId) {
      try {
        const customer = await this.requireStripe().customers.retrieve(customerId)

        if (
          !customer.deleted &&
          'invoice_settings' in customer &&
          customer.invoice_settings?.default_payment_method
        ) {
          const paymentMethodId =
            typeof customer.invoice_settings.default_payment_method === 'string'
              ? customer.invoice_settings.default_payment_method
              : customer.invoice_settings.default_payment_method.id

          this.logger.log(
            `[1-Click Subscribe] User: ${userId}, Plan: ${slug}, PM: ${paymentMethodId}`,
          )

          // Check for existing active Stripe subscription to UPDATE instead of creating a new one
          const { data: existingSub } =
            await this.stripeCustomerRepository.findActiveUserSubscription(userId)

          let subscription: Stripe.Subscription

          if (existingSub?.stripe_subscription_id) {
            // UPDATE existing subscription (swap plan item) — same pattern as switchSubscriptionInterval
            const stripeSub = await this.requireStripe().subscriptions.retrieve(
              existingSub.stripe_subscription_id,
            )

            if (stripeSub && stripeSub.status !== 'canceled') {
              const subscriptionItemId = stripeSub.items.data[0]?.id
              if (!subscriptionItemId) {
                throw new Error('No subscription item found on existing subscription')
              }

              this.logger.log(
                `[1-Click Subscribe] Updating existing sub=${existingSub.stripe_subscription_id} to plan=${slug}`,
              )

              subscription = await this.requireStripe().subscriptions.update(
                existingSub.stripe_subscription_id,
                {
                  items: [{ id: subscriptionItemId, price: priceId }],
                  default_payment_method: paymentMethodId,
                  proration_behavior: 'always_invoice',
                  metadata: {
                    user_id: userId,
                    plan_slug: slug,
                    plan_id: plan.id,
                    upgrade_type: '1-click',
                  },
                },
              )
            } else {
              // Old sub already canceled in Stripe — create fresh
              subscription = await this.requireStripe().subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                default_payment_method: paymentMethodId,
                metadata: {
                  user_id: userId,
                  plan_slug: slug,
                  plan_id: plan.id,
                  upgrade_type: '1-click',
                },
              })
            }
          } else {
            // No existing subscription — create new
            subscription = await this.requireStripe().subscriptions.create({
              customer: customerId,
              items: [{ price: priceId }],
              default_payment_method: paymentMethodId,
              metadata: {
                user_id: userId,
                plan_slug: slug,
                plan_id: plan.id,
                upgrade_type: '1-click',
              },
            })
          }

          // Upsert subscription record in DB
          const period = this.getSubscriptionPeriod(subscription)
          const periodStart = period.start ? new Date(period.start * 1000).toISOString() : null
          const periodEnd = period.end ? new Date(period.end * 1000).toISOString() : null

          await this.stripeCustomerRepository.upsertUserSubscription({
            user_id: userId,
            plan_id: plan.id,
            status: subscription.status === 'active' ? 'active' : subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
          })

          this.logger.log(
            `[1-Click Subscribe] Success: sub=${subscription.id}, status=${subscription.status}`,
          )

          return {
            sessionId: subscription.id,
            url: successUrl,
            charged: true,
          }
        }
      } catch (err) {
        // If 1-click fails, fall through to checkout
        this.logger.warn(`[1-Click Subscribe] Failed, falling back to checkout: ${err}`)
      }
    }

    // ── CHECKOUT FALLBACK: No saved payment method ──
    this.logger.log(`[Checkout Fallback] User: ${userId}, Plan: ${slug}`)

    // Find existing subscription so we can cancel it after checkout completes
    const { data: oldSub } = await this.stripeCustomerRepository.findActiveUserSubscription(userId)

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        plan_slug: slug,
        plan_id: plan.id,
        old_stripe_subscription_id: oldSub?.stripe_subscription_id ?? '',
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_slug: slug,
          plan_id: plan.id,
        },
      },
      payment_method_collection: 'always',
    }

    if (customerId) {
      sessionParams.customer = customerId
    } else {
      sessionParams.customer_email = email
    }

    const session = await this.requireStripe().checkout.sessions.create(sessionParams)

    return {
      sessionId: session.id,
      url: session.url ?? '',
    }
  }

  /**
   * Create a Stripe Checkout session for a one-time credit pack purchase.
   */
  async createCreditPurchaseSession(
    userId: string,
    email: string,
    packId: string,
    successUrl: string,
    cancelUrl: string,
    quantity = 1,
  ): Promise<{ sessionId: string; url: string }> {
    const qty = Math.max(1, Math.min(20, Math.floor(quantity)))

    const pack = await this.findCreditPack(packId)
    if (!pack) {
      throw new Error(`Credit pack not found: ${packId}`)
    }

    const totalCredits = pack.credits * qty

    // Get or create Stripe customer (always returns a valid ID)
    const customerId = await this.findOrCreateCustomerId(userId, email)

    // Use existing Stripe price ID, or create a price on the fly
    const packPriceId = this.getPriceId(pack)
    let priceData: Stripe.Checkout.SessionCreateParams.LineItem
    if (packPriceId) {
      priceData = { price: packPriceId, quantity: qty }
    } else {
      priceData = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${pack.name} — ${totalCredits.toLocaleString()} Credits`,
          },
          unit_amount: pack.price_amount ?? 0,
        },
        quantity: qty,
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer: customerId,
      line_items: [priceData],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        pack_id: pack.id,
        credits: String(totalCredits),
        quantity: String(qty),
        type: 'credit_purchase',
      },
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: {
          user_id: userId,
          pack_id: pack.id,
          credits: String(totalCredits),
          quantity: String(qty),
          type: 'credit_purchase',
        },
      },
    }

    const session = await this.requireStripe().checkout.sessions.create(sessionParams)

    return {
      sessionId: session.id,
      url: session.url ?? '',
    }
  }

  // ============================================================
  // PORTAL
  // ============================================================

  /**
   * Create a Stripe Customer Portal session for managing subscriptions.
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    const session = await this.requireStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return { url: session.url }
  }
}
