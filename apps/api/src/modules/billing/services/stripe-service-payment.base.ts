import type Stripe from 'stripe'
import { StripeAccountBase } from './stripe-service-account.base'

export abstract class StripePaymentBase extends StripeAccountBase {
  /**
   * Handle payment_intent.succeeded — records 1-click credit purchases
   * and org credit purchases whose PI metadata was set at checkout creation.
   * Checkout-based purchases are already handled by handleCheckoutCompleted,
   * so we skip if the PI was already recorded by that handler.
   */
  protected async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const type = paymentIntent.metadata?.type

    if (type === 'org_credit_purchase') {
      await this.handleOrgPaymentIntentSucceeded(paymentIntent)
      return
    }

    if (type !== 'credit_purchase') return

    const userId = paymentIntent.metadata?.user_id
    const packId = paymentIntent.metadata?.pack_id
    const credits = parseInt(paymentIntent.metadata?.credits ?? '0', 10)

    if (!userId || !packId || credits <= 0) {
      this.logger.error('PaymentIntent credit_purchase missing required metadata')
      return
    }

    const { data: existing } =
      await this.stripePaymentRepository.findCreditPurchaseByPaymentIntent(paymentIntent.id)

    if ((existing ?? []).length > 0) {
      this.logger.debug(`PaymentIntent ${paymentIntent.id} already recorded, skipping`)
      return
    }

    const { error: purchaseError } = await this.stripePaymentRepository.insertCreditPurchase({
      user_id: userId,
      credits_purchased: credits,
      amount_paid: (paymentIntent.amount ?? 0) / 100,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'completed',
    })

    if (purchaseError && !this.isDuplicatePurchaseError(purchaseError)) {
      this.logger.error(`Failed to record PI credit purchase: ${purchaseError.message}`)
      return
    }

    const { data: piAllPurchases } =
      await this.stripePaymentRepository.listCompletedCreditPurchases(userId)

    const totalPurchased =
      piAllPurchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    const piLedgerRowId = await this.creditsService.resolvePersonalMonthlyUsageLedgerRowId(userId)

    if (piLedgerRowId) {
      await this.stripePaymentRepository.updatePersonalUsageTotalPurchased(
        piLedgerRowId,
        totalPurchased,
      )
    }

    this.logger.log(
      `1-click credit purchase recorded for user ${userId}: ${credits} credits (PI=${paymentIntent.id})`,
    )
  }

  protected async handleOrgPaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const orgId = paymentIntent.metadata?.org_id
    const packId = paymentIntent.metadata?.pack_id
    const credits = parseInt(paymentIntent.metadata?.credits ?? '0', 10)
    const purchasedBy = paymentIntent.metadata?.purchased_by

    if (!orgId || !packId || credits <= 0) {
      this.logger.error('Org PaymentIntent credit_purchase missing required metadata')
      return
    }

    const { data: existing } =
      await this.stripePaymentRepository.findOrgCreditPurchaseByPaymentIntent(paymentIntent.id)

    if ((existing ?? []).length > 0) {
      this.logger.debug(`Org PaymentIntent ${paymentIntent.id} already recorded, skipping`)
      return
    }

    const insertData: Record<string, unknown> = {
      org_id: orgId,
      credits_purchased: credits,
      amount_paid: (paymentIntent.amount ?? 0) / 100,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'completed',
    }
    if (purchasedBy) {
      insertData.purchased_by = purchasedBy
    }

    const { error: purchaseError } =
      await this.stripePaymentRepository.insertOrgCreditPurchase(insertData)

    if (purchaseError && !this.isDuplicatePurchaseError(purchaseError)) {
      this.logger.error(`Failed to record org PI credit purchase: ${purchaseError.message}`)
      return
    }

    const { data: orgPiAllPurchases } =
      await this.stripePaymentRepository.listCompletedOrgCreditPurchases(orgId)

    const totalPurchased =
      orgPiAllPurchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    const { data: orgPiLatestUsage } =
      await this.stripePaymentRepository.findLatestOrgUsage(orgId)

    if (orgPiLatestUsage?.id) {
      await this.stripePaymentRepository.updateOrgUsageTotalPurchased(
        orgPiLatestUsage.id,
        totalPurchased,
      )
    }

    this.logger.log(
      `Org credit purchase recorded via PI for org ${orgId}: ${credits} credits (PI=${paymentIntent.id})`,
    )
  }

  // ============================================================
  // 1-CLICK PURCHASE
  // ============================================================

  /**
   * Purchase credits using saved payment method (1-click).
   * Returns null if no saved payment method — caller should fall back to checkout.
   */
  async purchaseCreditsOneClick(
    userId: string,
    packId: string,
    quantity = 1,
  ): Promise<{ charged: true; credits: number; amount: number; paymentId: string } | null> {
    const qty = Math.max(1, Math.min(20, Math.floor(quantity)))

    // 1. Get Stripe customer ID
    const customerId = await this.getCustomerIdForUser(userId)
    if (!customerId) return null

    // 2. Check for saved payment method
    const customer = await this.stripe.customers.retrieve(customerId)
    if (customer.deleted) return null

    const defaultPaymentMethod =
      typeof customer.invoice_settings?.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : (customer.invoice_settings?.default_payment_method?.id ?? null)

    if (!defaultPaymentMethod) return null

    // 3. Look up credit pack
    const pack = await this.findCreditPack(packId)
    if (!pack) {
      throw new Error(`Credit pack not found: ${packId}`)
    }

    const unitAmountCents = pack.price_amount ?? 0
    if (unitAmountCents <= 0) {
      throw new Error(`Invalid price for pack: ${packId}`)
    }

    const totalAmountCents = unitAmountCents * qty
    const totalCredits = pack.credits * qty

    // 4. Create PaymentIntent with off_session + confirm (charges immediately)
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: defaultPaymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        user_id: userId,
        pack_id: pack.id,
        credits: String(totalCredits),
        quantity: String(qty),
        type: 'credit_purchase',
      },
    })

    if (paymentIntent.status !== 'succeeded') {
      this.logger.warn(`1-click payment not immediately successful: status=${paymentIntent.status}`)
      return null
    }

    // 5. Record in database
    const { error: purchaseError } = await this.stripePaymentRepository.insertCreditPurchase({
      user_id: userId,
      credits_purchased: totalCredits,
      amount_paid: totalAmountCents / 100,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'completed',
    })

    if (purchaseError && !this.isDuplicatePurchaseError(purchaseError)) {
      this.logger.error(`Failed to record 1-click purchase: ${purchaseError.message}`)
    }

    // 6. Update latest usage row with new purchased total
    const { data: ocAllPurchases } =
      await this.stripePaymentRepository.listCompletedCreditPurchases(userId)

    const totalPurchased =
      ocAllPurchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    const ocLedgerRowId = await this.creditsService.resolvePersonalMonthlyUsageLedgerRowId(userId)

    if (ocLedgerRowId) {
      await this.stripePaymentRepository.updatePersonalUsageTotalPurchased(
        ocLedgerRowId,
        totalPurchased,
      )
    }

    // 7. Create Stripe invoice for receipt/accounting (non-blocking)
    await this.createCreditPurchaseInvoice(customerId, totalCredits, totalAmountCents, {
      user_id: userId,
      purchase_type: 'credit_pack',
      credits_purchased: String(totalCredits),
      payment_intent_id: paymentIntent.id,
    })

    return {
      charged: true,
      credits: totalCredits,
      amount: totalAmountCents / 100,
      paymentId: paymentIntent.id,
    }
  }

  /**
   * Save the payment method from a checkout session as the customer's default.
   */
  protected async saveDefaultPaymentMethod(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const customerId = session.customer as string | null
      const paymentIntentId = session.payment_intent as string | null

      if (!customerId || !paymentIntentId) return

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
      const paymentMethodId =
        typeof paymentIntent.payment_method === 'string'
          ? paymentIntent.payment_method
          : (paymentIntent.payment_method?.id ?? null)

      if (!paymentMethodId) return

      await this.stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })

      this.logger.log(`Saved default payment method for customer ${customerId}`)

      // Deduplicate: detach older PMs with the same card fingerprint
      await this.deduplicatePaymentMethods(customerId, paymentMethodId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      this.logger.warn(`Failed to save default payment method: ${msg}`)
    }
  }

  /**
   * Detach duplicate payment methods from a customer, keeping only the newest
   * PM per unique card fingerprint.
   */
  protected async deduplicatePaymentMethods(
    customerId: string,
    keepPaymentMethodId: string,
  ): Promise<void> {
    try {
      const methods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 20,
      })

      if (methods.data.length <= 1) return

      const keepPm = methods.data.find((m) => m.id === keepPaymentMethodId)
      const keepFingerprint = keepPm?.card?.fingerprint
      if (!keepFingerprint) return

      const duplicates = methods.data.filter(
        (m) => m.id !== keepPaymentMethodId && m.card?.fingerprint === keepFingerprint,
      )

      for (const dup of duplicates) {
        await this.stripe.paymentMethods.detach(dup.id)
        this.logger.log(
          `Detached duplicate payment method ${dup.id} (fingerprint=${keepFingerprint})`,
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      this.logger.warn(`Payment method dedup failed (non-critical): ${msg}`)
    }
  }
}
