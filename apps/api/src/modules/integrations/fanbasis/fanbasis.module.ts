import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FanbasisCheckoutSessionsController } from './controllers/fanbasis-checkout-sessions.controller'
import { FanbasisCustomersController } from './controllers/fanbasis-customers.controller'
import { FanbasisDiscountCodesController } from './controllers/fanbasis-discount-codes.controller'
import { FanbasisSubscriptionsController } from './controllers/fanbasis-subscriptions.controller'
import { FanbasisTransactionsController } from './controllers/fanbasis-transactions.controller'
import { FanbasisWebhookSubscriptionsController } from './controllers/fanbasis-webhook-subscriptions.controller'
import { FanbasisController } from './controllers/fanbasis.controller'
import { FanbasisIntegration } from './integrations/fanbasis.integration'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { FanbasisApiService } from './services/fanbasis-api.service'

@Module({
  imports: [ConfigModule],
  controllers: [
    FanbasisController,
    FanbasisCheckoutSessionsController,
    FanbasisTransactionsController,
    FanbasisSubscriptionsController,
    FanbasisWebhookSubscriptionsController,
    FanbasisCustomersController,
    FanbasisDiscountCodesController,
  ],
  providers: [FanbasisIntegration, IntegrationConnectionsRepository, FanbasisApiService],
  exports: [FanbasisIntegration, FanbasisApiService],
})
export class FanbasisModule {}
