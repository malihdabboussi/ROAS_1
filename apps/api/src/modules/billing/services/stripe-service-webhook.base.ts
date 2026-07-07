import type Stripe from 'stripe'
import { StripeWebhookSubscriptionBase } from './stripe-service-webhook-subscription.base'

export abstract class StripeWebhookBase extends StripeWebhookSubscriptionBase {
  // ============================================================
  // WEBHOOK HANDLING
  // ============================================================

  /**
   * Validate and route a Stripe webhook event.
   */
  async handleWebhookEvent(
    body: Buffer,
    signature: string,
  ): Promise<{ received: boolean; type: string }> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    let event: Stripe.Event
    try {
      event = this.requireStripe().webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Webhook signature verification failed: ${message}`)
      this.errorReporter.report({
        app: 'api',
        feature: 'billing/stripe_webhook',
        error_code: 'stripe_webhook_signature_invalid',
        message: `Webhook signature verification failed: ${message}`,
        category: 'webhook',
      })
      throw new Error(`Webhook signature verification failed: ${message}`)
    }

    this.logger.log(`Webhook received: ${event.type} (${event.id})`)

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
          break

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
          break

        case 'invoice.paid':
          break

        default:
          this.logger.debug(`Unhandled webhook event type: ${event.type}`)
      }

      const purgeOnSubscriptionEvents = [
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_failed',
        'invoice.paid',
      ]
      if (purgeOnSubscriptionEvents.includes(event.type)) {
        await this.purgeExpiredAgentBrains()
      }
    } catch (handlerErr) {
      const msg = handlerErr instanceof Error ? handlerErr.message : String(handlerErr)
      const stack = handlerErr instanceof Error ? handlerErr.stack : undefined
      this.errorReporter.report({
        app: 'api',
        feature: 'billing/stripe_webhook',
        error_code: 'stripe_webhook_handler_failed',
        message: msg,
        stack,
        category: 'webhook',
        context: { event_type: event.type, event_id: event.id },
      })
      throw handlerErr
    }

    return { received: true, type: event.type }
  }
}
