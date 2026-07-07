import type { CreditBalance } from './credits.types'
import { CreditsBalanceBase } from './credits-service-balance.base'

export abstract class CreditsAutoRechargeBase extends CreditsBalanceBase {
  protected async runAutoRechargeIfNeeded(
    userId: string,
    balance: CreditBalance,
  ): Promise<CreditBalance> {
    if (!this.stripe) return balance

    const { data: config } =
      await this.creditsAutoRechargeRepository.findEnabledUserAutoRecharge(userId)

    if (!config || !config.is_enabled) return balance
    if (balance.totalAvailable > config.trigger_credits) return balance
    if (config.topup_credits < 2000 || config.topup_credits % 200 !== 0) return balance

    const lastRechargeAtMs = config.last_recharged_at
      ? new Date(config.last_recharged_at).getTime()
      : 0
    if (lastRechargeAtMs > 0 && Date.now() - lastRechargeAtMs < 60_000) {
      return balance
    }

    const { data: sub } = await this.creditsAutoRechargeRepository.findUserStripeCustomerId(userId)

    const customerId = sub?.stripe_customer_id
    if (!customerId) return balance

    const customer = await this.stripe.customers.retrieve(customerId)
    if (customer.deleted) return balance

    const paymentMethodId =
      typeof customer.invoice_settings?.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : (customer.invoice_settings?.default_payment_method?.id ?? null)

    if (!paymentMethodId) return balance

    const amountCents = config.topup_credits / 2
    if (amountCents < 1000) return balance

    if (config.monthly_cap_cents !== null) {
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

      const { data: monthAutoRecharges } =
        await this.creditsAutoRechargeRepository.listUserAutoRechargePurchases(
          userId,
          monthStart.toISOString(),
          nextMonthStart.toISOString(),
        )

      const monthSpentCents =
        (monthAutoRecharges?.reduce(
          (sum: number, row: { amount_paid: number }) => sum + row.amount_paid,
          0,
        ) ?? 0) * 100

      if (monthSpentCents + amountCents > config.monthly_cap_cents) {
        this.logger.warn(
          `Auto recharge skipped for ${userId}: monthly cap reached (${monthSpentCents}/${config.monthly_cap_cents} cents)`,
        )
        return balance
      }
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          user_id: userId,
          credits: String(config.topup_credits),
          type: 'auto_recharge',
        },
      })

      if (paymentIntent.status !== 'succeeded') return balance

      const { data: existingPurchase } =
        await this.creditsAutoRechargeRepository.findCreditPurchaseByPaymentIntent(paymentIntent.id)
      if (existingPurchase) return this.getBalance(userId)

      const { error: purchaseError } =
        await this.creditsAutoRechargeRepository.insertCreditPurchase({
          user_id: userId,
          credits_purchased: config.topup_credits,
          amount_paid: amountCents / 100,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_checkout_session_id: `auto_recharge:${paymentIntent.id}`,
          status: 'completed',
        })
      if (purchaseError) {
        this.logger.error(
          `Auto recharge purchase insert failed for ${userId}: ${purchaseError.message}`,
        )
        return balance
      }

      const usageId = await this.resolvePersonalMonthlyUsageLedgerRowId(userId)
      const { data: usage } = usageId
        ? await this.creditsAutoRechargeRepository.findPersonalUsagePurchasedTotalById(usageId)
        : { data: null }

      if (usage?.id) {
        await this.creditsAutoRechargeRepository.updatePersonalUsageTotalPurchased(
          usage.id,
          (usage.total_credits_purchased ?? 0) + config.topup_credits,
        )
      }

      await this.creditsAutoRechargeRepository.updateUserAutoRechargeLastRecharged(
        userId,
        new Date().toISOString(),
      )

      this.logger.log(
        `Auto recharge completed for ${userId}: +${config.topup_credits} credits ($${(amountCents / 100).toFixed(2)})`,
      )

      return this.getBalance(userId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Auto recharge failed for ${userId}: ${msg}`)
      this.errorReporter.report({
        app: process.env.APP_NAME ?? 'api',
        category: 'billing',
        feature: 'billing/credits_auto_recharge',
        error_code: 'auto_recharge_failed',
        message: msg,
        stack: err instanceof Error ? err.stack : undefined,
        user_id: userId,
        context: {},
      })
      return balance
    }
  }

  protected async runOrgAutoRechargeIfNeeded(
    orgId: string,
    balance: CreditBalance,
  ): Promise<CreditBalance> {
    if (!this.stripe) return balance

    const { data: config } =
      await this.creditsAutoRechargeRepository.findEnabledOrgAutoRecharge(orgId)

    if (!config || !config.is_enabled) return balance
    if (balance.totalAvailable > config.threshold_credits) return balance
    if (config.recharge_amount < 2000 || config.recharge_amount % 200 !== 0) return balance
    if (config.max_monthly_recharges <= 0) return balance

    const amountCents = config.recharge_amount / 2
    if (amountCents < 1000) return balance

    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

    const { data: monthAutoRecharges } =
      await this.creditsAutoRechargeRepository.listOrgAutoRechargePurchases(
        orgId,
        monthStart.toISOString(),
        nextMonthStart.toISOString(),
      )

    if ((monthAutoRecharges?.length ?? 0) >= config.max_monthly_recharges) {
      this.logger.warn(
        `Org auto recharge skipped for ${orgId}: monthly recharge count reached (${monthAutoRecharges?.length ?? 0}/${config.max_monthly_recharges})`,
      )
      return balance
    }

    const { data: sub } = await this.creditsAutoRechargeRepository.findOrgStripeSubscription(orgId)

    const customerId = sub?.stripe_customer_id
    if (!customerId) return balance

    const { data: org } = await this.creditsAutoRechargeRepository.findOrgOwner(orgId)
    if (!org?.owner_id) return balance

    const customer = await this.stripe.customers.retrieve(customerId)
    if (customer.deleted) return balance

    let paymentMethodId =
      typeof customer.invoice_settings?.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : (customer.invoice_settings?.default_payment_method?.id ?? null)

    if (!paymentMethodId && sub?.stripe_subscription_id) {
      const subscription = await this.stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      paymentMethodId =
        typeof subscription.default_payment_method === 'string'
          ? subscription.default_payment_method
          : (subscription.default_payment_method?.id ?? null)
    }

    if (!paymentMethodId) return balance

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          org_id: orgId,
          credits: String(config.recharge_amount),
          type: 'org_auto_recharge',
        },
      })

      if (paymentIntent.status !== 'succeeded') return balance

      const { data: existingPurchase } =
        await this.creditsAutoRechargeRepository.findOrgCreditPurchaseByPaymentIntent(
          paymentIntent.id,
        )
      if (existingPurchase) return this.getOrgBalance(orgId)

      const { error: purchaseError } =
        await this.creditsAutoRechargeRepository.insertOrgCreditPurchase({
          org_id: orgId,
          credits_purchased: config.recharge_amount,
          amount_paid: amountCents / 100,
          purchased_by: org.owner_id,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_checkout_session_id: `auto_recharge:${paymentIntent.id}`,
          status: 'completed',
        })
      if (purchaseError) {
        this.logger.error(
          `Org auto recharge purchase insert failed for ${orgId}: ${purchaseError.message}`,
        )
        return balance
      }

      const { data: latestUsage } = await this.creditsRepository.findLatestOrgUsage(orgId)

      if (latestUsage?.id) {
        await this.creditsAutoRechargeRepository.updateOrgUsageTotalPurchased(
          latestUsage.id,
          (latestUsage.total_credits_purchased ?? 0) + config.recharge_amount,
        )
      }

      this.logger.log(
        `Org auto recharge completed for ${orgId}: +${config.recharge_amount} credits ($${(amountCents / 100).toFixed(2)})`,
      )

      return this.getOrgBalance(orgId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Org auto recharge failed for ${orgId}: ${msg}`)
      this.errorReporter.report({
        app: process.env.APP_NAME ?? 'api',
        category: 'billing',
        feature: 'billing/org_credits_auto_recharge',
        error_code: 'org_auto_recharge_failed',
        message: msg,
        stack: err instanceof Error ? err.stack : undefined,
        context: { org_id: orgId },
      })
      return balance
    }
  }
}
