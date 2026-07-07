import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ActiveCampaignAccountsController } from './controllers/activecampaign-accounts.controller'
import { ActiveCampaignCampaignMessagesController } from './controllers/activecampaign-campaign-messages.controller'
import { ActiveCampaignCommerceController } from './controllers/activecampaign-commerce.controller'
import { ActiveCampaignContactsController } from './controllers/activecampaign-contacts.controller'
import { ActiveCampaignContentController } from './controllers/activecampaign-content.controller'
import { ActiveCampaignDealFieldsController } from './controllers/activecampaign-deal-fields.controller'
import { ActiveCampaignDealsController } from './controllers/activecampaign-deals.controller'
import { ActiveCampaignOperationsController } from './controllers/activecampaign-operations.controller'
import { ActiveCampaignController } from './controllers/activecampaign.controller'
import { ActiveCampaignIntegration } from './integrations/activecampaign.integration'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { ActiveCampaignApiService } from './services/activecampaign-api.service'

@Module({
  imports: [ConfigModule],
  controllers: [
    ActiveCampaignController,
    ActiveCampaignContactsController,
    ActiveCampaignContentController,
    ActiveCampaignDealsController,
    ActiveCampaignDealFieldsController,
    ActiveCampaignAccountsController,
    ActiveCampaignCampaignMessagesController,
    ActiveCampaignOperationsController,
    ActiveCampaignCommerceController,
  ],
  providers: [ActiveCampaignIntegration, IntegrationConnectionsRepository, ActiveCampaignApiService],
  exports: [ActiveCampaignIntegration, ActiveCampaignApiService],
})
export class ActiveCampaignModule {}
