import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GoogleDriveModule } from '../google-drive/google-drive.module'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { MetaAdAssetsController } from './controllers/meta-ad-assets.controller'
import { MetaAudiencesController } from './controllers/meta-audiences.controller'
import { MetaBrowseSyncController } from './controllers/meta-browse-sync.controller'
import { MetaInsightsController } from './controllers/meta-insights.controller'
import { MetaPagesSearchController } from './controllers/meta-pages-search.controller'
import { MetaPublishController } from './controllers/meta-publish.controller'
import { MetaWebhooksController } from './controllers/meta-webhooks.controller'
import { MetaController } from './controllers/meta.controller'
import { MetaIntegration } from './integrations/meta.integration'
import { MetaAccountsRepository } from './repositories/meta-accounts.repository'
import { MetaEligibilityRepository } from './repositories/meta-eligibility.repository'
import { MetaInsightsRepository } from './repositories/meta-insights.repository'
import { MetaPublishRepository } from './repositories/meta-publish.repository'
import { MetaStatusRepository } from './repositories/meta-status.repository'
import { MetaSyncRepository } from './repositories/meta-sync.repository'
import { MetaApiService } from './services/meta-api.service'
import { MetaAccountsService } from './services/meta-api/meta-accounts.service'
import { MetaBudgetService } from './services/meta-api/meta-budget.service'
import { MetaFetchService } from './services/meta-api/meta-fetch.service'
import { MetaInsightsService } from './services/meta-api/meta-insights.service'
import { MetaPublishBatchService } from './services/meta-api/meta-publish-batch.service'
import { MetaPublishBatchPersistenceService } from './services/meta-api/meta-publish-batch-persistence.service'
import { MetaPublishMediaService } from './services/meta-api/meta-publish-media.service'
import { MetaPublishSharedService } from './services/meta-api/meta-publish-shared.service'
import { MetaPublishSingleService } from './services/meta-api/meta-publish-single.service'
import { MetaStatusService } from './services/meta-api/meta-status.service'
import { MetaSyncService } from './services/meta-api/meta-sync.service'
import { MetaUpdateService } from './services/meta-api/meta-update.service'
import { MetaIntegrationsEligibilityService } from './services/meta-integrations-eligibility.service'
import { MetaOAuthService } from './services/meta-oauth.service'
import { MetaPublishRequestService } from './services/meta-publish-request.service'

@Module({
  imports: [ConfigModule, GoogleDriveModule],
  controllers: [
    MetaController,
    MetaAdAssetsController,
    MetaAudiencesController,
    MetaPagesSearchController,
    MetaInsightsController,
    MetaPublishController,
    MetaBrowseSyncController,
    MetaWebhooksController,
  ],
  providers: [
    MetaIntegration,
    IntegrationConnectionsRepository,
    MetaAccountsRepository,
    MetaEligibilityRepository,
    MetaInsightsRepository,
    MetaPublishRepository,
    MetaStatusRepository,
    MetaSyncRepository,
    MetaIntegrationsEligibilityService,
    MetaOAuthService,
    MetaPublishSharedService,
    MetaAccountsService,
    MetaInsightsService,
    MetaBudgetService,
    MetaPublishMediaService,
    MetaPublishBatchPersistenceService,
    MetaPublishSingleService,
    MetaPublishBatchService,
    MetaStatusService,
    MetaUpdateService,
    MetaFetchService,
    MetaSyncService,
    MetaApiService,
    MetaPublishRequestService,
  ],
  exports: [MetaIntegration, MetaOAuthService, MetaApiService],
})
export class MetaModule {}
