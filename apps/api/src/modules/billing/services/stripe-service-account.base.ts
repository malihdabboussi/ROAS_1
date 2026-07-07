import type Stripe from 'stripe'
import { StripeAgentBrainBase } from './stripe-service-agent-brain.base'
export abstract class StripeAccountBase extends StripeAgentBrainBase {
  // ============================================================
  // SESSION STATUS
  // ============================================================

  /**
   * Check if a Stripe checkout session has been processed by our webhook.
   * Used by the frontend to poll after redirect from Stripe.
   */
  async getSessionStatus(
    sessionId: string,
    userId: string,
  ): Promise<{
    processed: boolean
    type: 'subscription' | 'credit_purchase' | 'unknown'
    planName?: string
    creditsAdded?: number
  }> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId)

      // Verify the session belongs to this user
      const sessionUserId = session.metadata?.user_id ?? session.client_reference_id
      if (sessionUserId !== userId) {
        return { processed: false, type: 'unknown' }
      }

      const sessionType = session.metadata?.type
      const isCompleted = session.status === 'complete'

      if (sessionType === 'credit_purchase') {
        // Check if credit_purchases has a record for this session
        const { data: purchase } =
          await this.stripePaymentRepository.findCompletedCreditPurchaseByCheckoutSession(sessionId)

        return {
          processed: !!purchase,
          type: 'credit_purchase',
          creditsAdded: purchase?.credits_purchased ?? 0,
        }
      }

      if (session.mode === 'subscription') {
        // Check if user_subscriptions has been updated with this subscription
        const stripeSubId = session.subscription as string | null
        if (!stripeSubId) {
          return { processed: isCompleted, type: 'subscription' }
        }

        const { data: sub } =
          await this.stripeCustomerRepository.findUserSubscriptionForStripeSubscription(
            userId,
            stripeSubId,
          )

        let planName: string | undefined
        if (sub?.plan_id) {
          const { data: plan } = await this.stripeCustomerRepository.findPlanNameById(sub.plan_id)
          planName = plan?.name
        }

        return {
          processed: !!sub && sub.status === 'active',
          type: 'subscription',
          planName,
        }
      }

      return { processed: isCompleted, type: 'unknown' }
    } catch (err) {
      this.logger.error(`Failed to check session status: ${err}`)
      return { processed: false, type: 'unknown' }
    }
  }

  // ============================================================
  // INVOICES
  // ============================================================

  /**
   * List invoices for a Stripe customer.
   */
  async listInvoices(
    customerId: string,
    limit = 12,
  ): Promise<
    Array<{
      stripe_invoice_id: string
      amount_paid: number
      amount_due: number
      currency: string
      status: string
      invoice_pdf: string | null
      hosted_invoice_url: string | null
      created: number
    }>
  > {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    })

    return invoices.data.map((inv) => ({
      stripe_invoice_id: inv.id,
      amount_paid: inv.amount_paid ?? 0,
      amount_due: inv.amount_due ?? 0,
      currency: inv.currency ?? 'usd',
      status: inv.status ?? 'unknown',
      invoice_pdf: inv.invoice_pdf ?? null,
      hosted_invoice_url: inv.hosted_invoice_url ?? null,
      created: inv.created,
    }))
  }

  // ============================================================
  // SWITCH INTERVAL (monthly ↔ annual)
  // Ported from legacy SubscriptionManagementService.upgradeToAnnual
  // ============================================================

  /**
   * Switch a subscription between monthly and annual billing.
   * Uses Stripe's subscription update with proration.
   */
  async switchSubscriptionInterval(
    userId: string,
    targetInterval: 'month' | 'year',
  ): Promise<{
    success: boolean
    newPlan: { name: string; slug: string; interval: string; price_amount: number }
  }> {
    // 1. Get user's current subscription
    const { data: currentSub } =
      await this.stripeCustomerRepository.findActiveUserSubscription(userId)

    if (!currentSub?.stripe_subscription_id) {
      throw new Error('No active subscription found')
    }

    // 2. Get current plan to find its tier name
    const { data: currentPlan } = await this.stripeCustomerRepository.findPlanById(
      currentSub.plan_id,
    )

    if (!currentPlan) {
      throw new Error('Current plan not found')
    }

    if (currentPlan.interval === targetInterval) {
      throw new Error(`Already on ${targetInterval === 'year' ? 'annual' : 'monthly'} billing`)
    }

    // 3. Derive the target slug: e.g. "pro-monthly" → "pro-annual" or vice versa
    const currentSuffix = currentPlan.interval === 'year' ? '-annual' : '-monthly'
    const targetSuffix = targetInterval === 'year' ? '-annual' : '-monthly'
    const baseName = currentPlan.slug.replace(currentSuffix, '')
    const targetSlug = `${baseName}${targetSuffix}`

    // 4. Find the target plan
    const { data: targetPlan } =
      await this.stripeCustomerRepository.findActivePlanBySlug(targetSlug)

    if (!targetPlan) {
      throw new Error(`Target plan not found: ${targetSlug}`)
    }

    const targetPriceId = this.getPriceId(targetPlan)
    if (!targetPriceId) {
      throw new Error(`Target plan ${targetSlug} has no Stripe price ID configured`)
    }

    // 5. Retrieve current Stripe subscription to get the item ID
    const stripeSub = await this.stripe.subscriptions.retrieve(currentSub.stripe_subscription_id)

    if (!stripeSub || stripeSub.status === 'canceled') {
      throw new Error('Current subscription is not active in Stripe')
    }

    const subscriptionItemId = stripeSub.items.data[0]?.id
    if (!subscriptionItemId) {
      throw new Error('No subscription item found')
    }

    // 6. Update the subscription with proration (Stripe handles credit/charge)
    this.logger.log(
      `[Switch Interval] User: ${userId}, ${currentPlan.slug} → ${targetSlug}, proration=always_invoice`,
    )

    const updatedSub = await this.stripe.subscriptions.update(currentSub.stripe_subscription_id, {
      items: [{ id: subscriptionItemId, price: targetPriceId }],
      proration_behavior: 'always_invoice',
      metadata: {
        user_id: userId,
        plan_id: targetPlan.id,
        previous_plan_slug: currentPlan.slug,
        switch_type: 'interval_change',
      },
    })

    // 7. Update database with new plan
    const switchPeriod = this.getSubscriptionPeriod(updatedSub)
    const periodStart = switchPeriod.start
      ? new Date(switchPeriod.start * 1000).toISOString()
      : null
    const periodEnd = switchPeriod.end ? new Date(switchPeriod.end * 1000).toISOString() : null

    const { error: dbError } = await this.stripeCustomerRepository.updateUserSubscription(userId, {
        plan_id: targetPlan.id,
        status: updatedSub.status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: updatedSub.cancel_at_period_end,
      })

    if (dbError) {
      this.logger.error(`[Switch Interval] DB update failed: ${dbError.message}`)
      // Don't throw — Stripe was updated successfully
    }

    this.logger.log(
      `[Switch Interval] Done: ${currentPlan.slug} → ${targetSlug}, sub=${updatedSub.id}`,
    )

    return {
      success: true,
      newPlan: {
        name: targetPlan.name,
        slug: targetPlan.slug,
        interval: targetInterval,
        price_amount: targetPlan.price_amount,
      },
    }
  }

  // ============================================================
  // INVOICE CREATION (for credit purchases — ported from legacy)
  // ============================================================

  /**
   * Create a Stripe invoice for a credit purchase (for receipts/accounting).
   * Ported 1:1 from legacy InvoicesService.
   */
  async createCreditPurchaseInvoice(
    customerId: string,
    credits: number,
    amountCents: number,
    metadata: Record<string, string>,
  ): Promise<void> {
    try {
      // 1. Create draft invoice
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        collection_method: 'charge_automatically',
        auto_advance: false,
        metadata,
      })

      // 2. Add line item
      await this.stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        amount: amountCents,
        currency: 'usd',
        description: `${credits.toLocaleString()} AI Credits`,
      })

      // 3. Finalize and mark as paid (out of band — already charged via PaymentIntent)
      await this.stripe.invoices.finalizeInvoice(invoice.id)
      await this.stripe.invoices.pay(invoice.id, { paid_out_of_band: true })

      this.logger.log(`Invoice created for credit purchase: ${invoice.id}`)
    } catch (err) {
      // Non-critical: log but don't fail the purchase
      const msg = err instanceof Error ? err.message : 'Unknown'
      this.logger.warn(`Failed to create invoice for credit purchase: ${msg}`)
    }
  }

  // ============================================================
  // CANCEL / REACTIVATE
  // ============================================================

  /**
   * Cancel subscription at period end.
   */
  async cancelSubscription(subscriptionId: string): Promise<{ periodEnd: string }> {
    const sub = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    const cancelPeriod = this.getSubscriptionPeriod(sub)
    return {
      periodEnd: cancelPeriod.end
        ? new Date(cancelPeriod.end * 1000).toISOString()
        : new Date().toISOString(),
    }
  }

  /**
   * Reactivate a subscription that was set to cancel at period end.
   */
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })
  }
}
