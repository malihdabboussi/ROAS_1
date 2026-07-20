import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BrainModule } from '../../brain/brain.module'
import { SpaceTemplatesModule } from '../../space-templates/space-templates.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { FathomMeetingsController } from './controllers/fathom-meetings.controller'
import { FathomWebhooksController } from './controllers/fathom-webhooks.controller'
import { FathomController } from './controllers/fathom.controller'
import { FathomIntegration } from './integrations/fathom.integration'
import { FathomRepository } from './repositories/fathom.repository'
import { FathomApiService } from './services/fathom-api.service'
import { FathomOAuthService } from './services/fathom-oauth.service'
import { FathomWebhookService } from './services/fathom-webhook.service'

@Module({
  imports: [ConfigModule, BrainModule, SpacesModule, SpaceTemplatesModule],
  controllers: [FathomController, FathomMeetingsController, FathomWebhooksController],
  providers: [
    FathomIntegration,
    FathomRepository,
    FathomOAuthService,
    FathomApiService,
    FathomWebhookService,
  ],
  exports: [FathomIntegration, FathomOAuthService, FathomApiService],
})
export class FathomModule {}
