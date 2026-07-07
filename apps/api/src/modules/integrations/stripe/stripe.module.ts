import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { StripeAnalyticsController } from './controllers/stripe-analytics.controller'
import { StripeCampaignController } from './controllers/stripe-campaign.controller'
import { StripeCatalogController } from './controllers/stripe-catalog.controller'
import { StripeConnectionController } from './controllers/stripe-connection.controller'
import { StripeDataController } from './controllers/stripe-data.controller'
import { StripeIntegration } from './integrations/stripe.integration'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { StripeApiService } from './services/stripe-api.service'
import { StripeOAuthService } from './services/stripe-oauth.service'

@Module({
  imports: [ConfigModule],
  controllers: [
    StripeConnectionController,
    StripeCatalogController,
    StripeDataController,
    StripeAnalyticsController,
    StripeCampaignController,
  ],
  providers: [StripeIntegration, IntegrationConnectionsRepository, StripeOAuthService, StripeApiService],
  exports: [StripeIntegration, StripeOAuthService, StripeApiService],
})
export class StripeModule {}
