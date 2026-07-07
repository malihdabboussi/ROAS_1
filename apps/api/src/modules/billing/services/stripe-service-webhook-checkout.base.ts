import * as crypto from 'crypto'
import type Stripe from 'stripe'
import { StripePaymentBase } from './stripe-service-payment.base'

export abstract class StripeWebhookCheckoutBase extends StripePaymentBase {
  // ============================================================
  // WEBHOOK EVENT HANDLERS
  // ============================================================

  protected async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const type = session.metadata?.type

    if (type === 'fast_track') {
      await this.handleFastTrackCheckout(session)
      return
    }

    if (type === 'org_credit_purchase') {
      const orgId = session.metadata?.org_id
      if (!orgId) {
        this.logger.error('Org credit purchase checkout but no org_id in metadata')
        return
      }
      await this.handleOrgCreditPurchase(session, orgId)
      return
    }

    if (type === 'org_subscription') {
      const orgId = session.metadata?.org_id
      if (!orgId) {
        this.logger.error('Org subscription checkout but no org_id in metadata')
        return
      }
      await this.handleOrgSubscriptionCheckout(session, orgId)
      return
    }

    const userId = session.metadata?.user_id ?? session.client_reference_id
    if (!userId) {
      this.logger.error('Checkout completed but no user_id in metadata')
      return
    }

    if (type === 'agent_brain') {
      await this.handleAgentBrainCheckout(session, userId)
    } else if (type === 'credit_purchase') {
      await this.handleCreditPurchase(session, userId)
    } else if (session.mode === 'subscription') {
      await this.handleSubscriptionCheckout(session, userId)
    } else {
      this.logger.warn(`Unknown checkout mode/type: mode=${session.mode}, type=${type}`)
    }
  }

  protected async handleSubscriptionCheckout(
    session: Stripe.Checkout.Session,
    userId: string,
  ): Promise<void> {
    const planId = session.metadata?.plan_id
    const planSlug = session.metadata?.plan_slug
    const stripeSubscriptionId = session.subscription as string
    const stripeCustomerId = session.customer as string
    const oldStripeSubscriptionId = session.metadata?.old_stripe_subscription_id

    if (!planId || !stripeSubscriptionId) {
      this.logger.error('Subscription checkout missing plan_id or subscription_id')
      return
    }

    // Cancel old Stripe subscription if one existed before this checkout
    if (oldStripeSubscriptionId && oldStripeSubscriptionId !== stripeSubscriptionId) {
      try {
        await this.stripe.subscriptions.cancel(oldStripeSubscriptionId, {
          prorate: true,
        })
        this.logger.log(
          `Canceled old subscription ${oldStripeSubscriptionId} after checkout upgrade for user ${userId}`,
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown'
        this.logger.warn(`Failed to cancel old subscription ${oldStripeSubscriptionId}: ${msg}`)
      }
    }

    // Retrieve subscription details for period dates
    const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId)
    const period = this.getSubscriptionPeriod(subscription)
    const currentPeriodStart = period.start ? new Date(period.start * 1000).toISOString() : null
    const currentPeriodEnd = period.end ? new Date(period.end * 1000).toISOString() : null

    const status = this.mapSubscriptionStatus(subscription.status)

    // Upsert user subscription
    const { error } = await this.stripeCustomerRepository.upsertUserSubscription({
        user_id: userId,
        plan_id: planId,
        status,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
      })

    if (error) {
      this.logger.error(`Failed to upsert subscription: ${error.message}`)
      return
    }

    this.logger.log(
      `Subscription activated for user ${userId}: plan=${planSlug}, sub=${stripeSubscriptionId}`,
    )
  }

  protected async handleAgentBrainCheckout(
    session: Stripe.Checkout.Session,
    userId: string,
  ): Promise<void> {
    const agentId = session.metadata?.agent_id
    const stripeSubscriptionId = session.subscription as string

    if (!agentId || !stripeSubscriptionId) {
      this.logger.error('Agent brain checkout missing agent_id or subscription_id')
      return
    }

    const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId)
    const stripeCustomerId = session.customer as string

    // Persist customer ID
    await this.persistCustomerId(userId, stripeCustomerId)

    // Find the subscription item for the brain addon
    const addedItem = subscription.items.data[0]
    if (!addedItem) {
      this.logger.error('Agent brain checkout subscription has no items')
      return
    }

    const { data: brain, error: brainErr } = await this.stripeAgentBrainRepository.createUserBrain(
      userId,
      agentId,
    )

    if (brainErr || !brain) {
      this.logger.error(`Failed to create agent brain from checkout: ${brainErr?.message}`)
      return
    }

    const { error: addonInsertErr } = await this.stripeAgentBrainRepository.insertUserAddon({
      user_id: userId,
      addon_slug: 'agent-brain',
      stripe_subscription_item_id: addedItem.id,
      brain_id: brain.id,
      agent_id: agentId,
      status: 'active',
    })

    if (addonInsertErr) {
      this.logger.error(`Failed to persist brain addon from checkout: ${addonInsertErr.message}`)
      return
    }

    this.logger.log(
      `Agent brain activated via checkout for user ${userId}: agent=${agentId}, brain=${brain.id}`,
    )
  }

  protected async handleFastTrackCheckout(session: Stripe.Checkout.Session): Promise<void> {
    const email = session.metadata?.email
    if (!email) {
      this.logger.error('[fast-track] Checkout completed but no email in metadata')
      return
    }

    const stripeCustomerId = session.customer as string
    const stripeSubscriptionId = session.subscription as string

    const code = crypto.randomBytes(16).toString('hex')

    const { data: inviteCode, error: codeErr } =
      await this.stripePaymentRepository.insertDirectInviteCode(code, email)

    if (codeErr || !inviteCode) {
      this.logger.error(`[fast-track] Failed to create invite code: ${codeErr?.message}`)
      await this.stripePaymentRepository.markFastTrackPurchaseFailed(session.id)
      return
    }

    await this.stripePaymentRepository.markFastTrackPurchasePaid(session.id, {
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        invite_code_id: inviteCode.id,
        invite_code: code,
        status: 'paid',
      })

    await this.stripePaymentRepository.markWaitlistInvited(email, new Date().toISOString())

    this.logger.log(
      `[fast-track] Payment confirmed for ${email}: sub=${stripeSubscriptionId}, code=${code}`,
    )
  }

  protected async handleCreditPurchase(
    session: Stripe.Checkout.Session,
    userId: string,
  ): Promise<void> {
    const packId = session.metadata?.pack_id
    const credits = parseInt(session.metadata?.credits ?? '0', 10)

    if (!packId || credits <= 0) {
      this.logger.error('Credit purchase missing pack_id or credits')
      return
    }

    // Record the purchase — include payment_intent_id for idempotency with PI webhook
    const paymentIntentId = session.payment_intent as string | null

    // Pre-check to avoid duplicate inserts on webhook retries.
    const { data: existingBySession } =
      await this.stripePaymentRepository.findCreditPurchaseByCheckoutSession(session.id)
    if ((existingBySession ?? []).length > 0) {
      this.logger.debug(`Checkout session ${session.id} already recorded, skipping`)
      return
    }

    if (paymentIntentId) {
      const { data: existingByIntent } =
        await this.stripePaymentRepository.findCreditPurchaseByPaymentIntent(paymentIntentId)
      if ((existingByIntent ?? []).length > 0) {
        this.logger.debug(
          `PaymentIntent ${paymentIntentId} already recorded, skipping checkout insert`,
        )
        return
      }
    }

    const { error: purchaseError } = await this.stripePaymentRepository.insertCreditPurchase({
      user_id: userId,
      credits_purchased: credits,
      amount_paid: (session.amount_total ?? 0) / 100,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: 'completed',
    })

    if (purchaseError && !this.isDuplicatePurchaseError(purchaseError)) {
      this.logger.error(`Failed to record credit purchase: ${purchaseError.message}`)
      return
    }

    // Update latest usage row to reflect new purchased credits total
    const { data: allPurchases } =
      await this.stripePaymentRepository.listCompletedCreditPurchases(userId)

    const totalPurchased =
      allPurchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    const ledgerRowId = await this.creditsService.resolvePersonalMonthlyUsageLedgerRowId(userId)

    if (ledgerRowId) {
      await this.stripePaymentRepository.updatePersonalUsageTotalPurchased(
        ledgerRowId,
        totalPurchased,
      )
    }

    // Save payment method as default for future 1-click purchases
    await this.saveDefaultPaymentMethod(session)

    // Create Stripe invoice for receipt/accounting (non-blocking)
    const customerId = session.customer as string | null
    if (customerId) {
      await this.createCreditPurchaseInvoice(customerId, credits, session.amount_total ?? 0, {
        user_id: userId,
        purchase_type: 'credit_pack',
        credits_purchased: String(credits),
        checkout_session_id: session.id,
      })
    }

    this.logger.log(
      `Credit purchase completed for user ${userId}: ${credits} credits (pack=${packId})`,
    )
  }

  protected async handleOrgCreditPurchase(
    session: Stripe.Checkout.Session,
    orgId: string,
  ): Promise<void> {
    const packId = session.metadata?.pack_id
    const credits = parseInt(session.metadata?.credits ?? '0', 10)
    const purchasedBy = session.metadata?.purchased_by

    if (!packId || credits <= 0) {
      this.logger.error('Org credit purchase missing pack_id or credits')
      return
    }

    const paymentIntentId = session.payment_intent as string | null

    const { data: existingBySession } =
      await this.stripePaymentRepository.findOrgCreditPurchaseByCheckoutSession(session.id)
    if ((existingBySession ?? []).length > 0) {
      this.logger.debug(`Org checkout session ${session.id} already recorded, skipping`)
      return
    }

    if (paymentIntentId) {
      const { data: existingByIntent } =
        await this.stripePaymentRepository.findOrgCreditPurchaseByPaymentIntent(paymentIntentId)
      if ((existingByIntent ?? []).length > 0) {
        this.logger.debug(
          `Org PaymentIntent ${paymentIntentId} already recorded, skipping checkout insert`,
        )
        return
      }
    }

    const insertData: Record<string, unknown> = {
      org_id: orgId,
      credits_purchased: credits,
      amount_paid: (session.amount_total ?? 0) / 100,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: 'completed',
    }
    if (purchasedBy) {
      insertData.purchased_by = purchasedBy
    }

    const { error: purchaseError } =
      await this.stripePaymentRepository.insertOrgCreditPurchase(insertData)

    if (purchaseError && !this.isDuplicatePurchaseError(purchaseError)) {
      this.logger.error(`Failed to record org credit purchase: ${purchaseError.message}`)
      return
    }

    const { data: allOrgPurchases } =
      await this.stripePaymentRepository.listCompletedOrgCreditPurchases(orgId)

    const totalPurchased =
      allOrgPurchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    const { data: latestOrgUsage } =
      await this.stripePaymentRepository.findLatestOrgUsage(orgId)

    if (latestOrgUsage?.id) {
      await this.stripePaymentRepository.updateOrgUsageTotalPurchased(
        latestOrgUsage.id,
        totalPurchased,
      )
    }

    this.logger.log(
      `Org credit purchase completed for org ${orgId}: ${credits} credits (pack=${packId})`,
    )
  }

  protected async handleOrgSubscriptionCheckout(
    session: Stripe.Checkout.Session,
    orgId: string,
  ): Promise<void> {
    const planSlug = session.metadata?.plan_slug
    const stripeSubscriptionId = session.subscription as string
    const stripeCustomerId = session.customer as string

    if (!stripeSubscriptionId) {
      this.logger.error('Org subscription checkout missing subscription_id')
      return
    }

    const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId)
    const period = this.getSubscriptionPeriod(subscription)
    const currentPeriodStart = period.start ? new Date(period.start * 1000).toISOString() : null
    const currentPeriodEnd = period.end ? new Date(period.end * 1000).toISOString() : null

    const status = this.mapSubscriptionStatus(subscription.status)

    const { data: plan } =
      planSlug ? await this.stripeCustomerRepository.findActivePlanBySlug(planSlug) : { data: null }

    const { error } = await this.stripePaymentRepository.upsertOrgSubscription({
        org_id: orgId,
        plan_id: plan?.id ?? null,
        status,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
      })

    if (error) {
      this.logger.error(`Failed to upsert org subscription: ${error.message}`)
      return
    }

    this.logger.log(
      `Org subscription activated for org ${orgId}: plan=${planSlug}, sub=${stripeSubscriptionId}`,
    )
  }
}
