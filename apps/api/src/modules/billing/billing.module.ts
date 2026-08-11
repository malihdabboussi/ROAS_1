import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UsersModule } from '../users/users.module'
import { BillingAgentBrainController } from './controllers/billing-agent-brain.controller'
import { BillingCreditsController } from './controllers/billing-credits.controller'
import { BillingDataController } from './controllers/billing-data.controller'
import { BillingWebhookController } from './controllers/billing-webhook.controller'
import { BillingController } from './controllers/billing.controller'
import { CreditsGuard } from './guards/credits.guard'
import { BillingCreditsAutoRechargeRepository } from './repositories/billing-credits-auto-recharge.repository'
import { BillingCreditsRepository } from './repositories/billing-credits.repository'
import { BillingStripeAgentBrainRepository } from './repositories/billing-stripe-agent-brain.repository'
import { BillingStripeCustomerRepository } from './repositories/billing-stripe-customer.repository'
import { BillingStripePaymentRepository } from './repositories/billing-stripe-payment.repository'
import { BillingUserActionsRepository } from './repositories/billing-user-actions.repository'
import { BillingUserDataRepository } from './repositories/billing-user-data.repository'
import { CreditHistoryEnrichmentRepository } from './repositories/credit-history-enrichment.repository'
import { BillingUserActionsService } from './services/billing-user-actions.service'
import { BillingUserDataService } from './services/billing-user-data.service'
import { CreditsService } from './services/credits.service'
import { StripeService } from './services/stripe.service'

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [
    BillingController,
    BillingCreditsController,
    BillingDataController,
    BillingAgentBrainController,
    BillingWebhookController,
  ],
  providers: [
    CreditsService,
    StripeService,
    BillingCreditsRepository,
    BillingCreditsAutoRechargeRepository,
    BillingStripeCustomerRepository,
    BillingStripePaymentRepository,
    BillingStripeAgentBrainRepository,
    BillingUserActionsRepository,
    BillingUserDataRepository,
    CreditHistoryEnrichmentRepository,
    BillingUserDataService,
    BillingUserActionsService,
    CreditsGuard,
  ],
  exports: [
    CreditsService,
    StripeService,
    CreditsGuard,
    BillingCreditsRepository,
    CreditHistoryEnrichmentRepository,
  ],
})
export class BillingModule {}
