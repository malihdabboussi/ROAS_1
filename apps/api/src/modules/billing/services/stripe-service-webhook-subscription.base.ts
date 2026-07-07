import type Stripe from 'stripe'
import { StripeWebhookCheckoutBase } from './stripe-service-webhook-checkout.base'

export abstract class StripeWebhookSubscriptionBase extends StripeWebhookCheckoutBase {
  protected async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.user_id
    if (!userId) {
      // Try to find by stripe_subscription_id
      const { data: existingSub } =
        await this.stripeCustomerRepository.findUserIdBySubscriptionId(subscription.id)

      if (!existingSub) {
        this.logger.error(`Subscription updated but no user found for sub ${subscription.id}`)
        return
      }

      await this.updateSubscriptionRecord(existingSub.user_id, subscription)
      return
    }

    await this.updateSubscriptionRecord(userId, subscription)
  }

  protected async updateSubscriptionRecord(
    userId: string,
    subscription: Stripe.Subscription,
  ): Promise<void> {
    // Guard: only update if this subscription ID matches the DB record (or no sub exists yet).
    // Prevents stale webhook for an old/canceled subscription from overwriting a newer one.
    const { data: currentRow } =
      await this.stripeCustomerRepository.findUserSubscriptionStripeId(userId)

    if (
      currentRow?.stripe_subscription_id &&
      currentRow.stripe_subscription_id !== subscription.id
    ) {
      this.logger.debug(
        `Ignoring subscription.updated for stale sub ${subscription.id} (DB has ${currentRow.stripe_subscription_id})`,
      )
      return
    }

    const status = this.mapSubscriptionStatus(subscription.status)

    const period = this.getSubscriptionPeriod(subscription)

    const { error } = await this.stripeCustomerRepository.updateUserSubscription(userId, {
        status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        current_period_start: period.start ? new Date(period.start * 1000).toISOString() : null,
        current_period_end: period.end ? new Date(period.end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })

    if (error) {
      this.logger.error(`Failed to update subscription for ${userId}: ${error.message}`)
      return
    }

    this.logger.log(`Subscription updated for user ${userId}: status=${status}`)
  }

  protected async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.user_id

    if (userId) {
      await this.cancelUserSubscription(userId, subscription.id)
      return
    }

    // Fallback: look up by stripe_subscription_id
    const { data: existingSub } =
      await this.stripeCustomerRepository.findUserIdBySubscriptionId(subscription.id)

    if (existingSub) {
      await this.cancelUserSubscription(existingSub.user_id, subscription.id)
    } else {
      this.logger.error(`Subscription deleted but no user found for sub ${subscription.id}`)
    }
  }

  protected async cancelUserSubscription(userId: string, subscriptionId: string): Promise<void> {
    // Guard: only cancel if the DB record still references THIS subscription.
    // Prevents a stale "deleted" webhook for an old sub from wiping a newer active one.
    const { data: currentRow } =
      await this.stripeCustomerRepository.findUserSubscriptionStripeId(userId)

    if (
      currentRow?.stripe_subscription_id &&
      currentRow.stripe_subscription_id !== subscriptionId
    ) {
      this.logger.log(
        `Skipping cancel for old sub ${subscriptionId} — DB already has newer sub ${currentRow.stripe_subscription_id}`,
      )
      return
    }

    // Get free plan to assign
    const { data: freePlan } = await this.stripeCustomerRepository.findFreePlanId()

    const updates: Record<string, unknown> = {
      status: 'canceled',
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    }

    if (freePlan) {
      updates.plan_id = freePlan.id
    }

    const { error } = await this.stripeCustomerRepository.updateUserSubscription(userId, updates)

    if (error) {
      this.logger.error(`Failed to cancel subscription for ${userId}: ${error.message}`)
      return
    }

    this.logger.log(`Subscription canceled for user ${userId} (sub=${subscriptionId})`)
  }

  protected async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (invoice as any).subscription as string | null
    if (!subscriptionId) return

    const { data: existingSub } =
      await this.stripeCustomerRepository.findUserIdBySubscriptionId(subscriptionId)

    if (!existingSub) {
      this.logger.warn(`Payment failed for unknown subscription: ${subscriptionId}`)
      return
    }

    const { error } = await this.stripeCustomerRepository.updateUserSubscription(
      existingSub.user_id,
      { status: 'past_due' },
    )

    if (error) {
      this.logger.error(`Failed to mark subscription past_due: ${error.message}`)
      return
    }

    this.logger.log(
      `Subscription marked past_due for user ${existingSub.user_id} (sub=${subscriptionId})`,
    )
  }
}
