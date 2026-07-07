/**
 * Stripe Service for VibeyV2
 *
 * Injectable facade for Stripe checkout, portal, and webhook workflows.
 */

import { Injectable, Optional, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter } from '@vibey/api-shared'
import { BillingStripeAgentBrainRepository } from '../repositories/billing-stripe-agent-brain.repository'
import { BillingStripeCustomerRepository } from '../repositories/billing-stripe-customer.repository'
import { BillingStripePaymentRepository } from '../repositories/billing-stripe-payment.repository'
import { CreditsService } from './credits.service'
import { StripeWebhookBase } from './stripe-service-webhook.base'

@Injectable()
export class StripeService extends StripeWebhookBase implements OnModuleInit {
  constructor(
    configService: ConfigService,
    creditsService: CreditsService,
    errorReporter: ErrorReporter,
    @Optional()
    stripeCustomerRepository?: BillingStripeCustomerRepository,
    @Optional()
    stripePaymentRepository?: BillingStripePaymentRepository,
    @Optional()
    stripeAgentBrainRepository?: BillingStripeAgentBrainRepository,
  ) {
    const customerRepository =
      stripeCustomerRepository ?? new BillingStripeCustomerRepository(configService)
    super(
      configService,
      creditsService,
      errorReporter,
      customerRepository,
      stripePaymentRepository ?? new BillingStripePaymentRepository(customerRepository),
      stripeAgentBrainRepository ?? new BillingStripeAgentBrainRepository(customerRepository),
    )
  }
}
