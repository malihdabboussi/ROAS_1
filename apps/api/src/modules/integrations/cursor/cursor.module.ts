import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SharedModule } from '@vibey/api-shared'
import { ComposioModule } from '../../composio/composio.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import { IntegrationsCoreService } from '../services/integrations-core.service'
import { CursorController } from './controllers/cursor.controller'
import { CursorIntegration } from './integrations/cursor.integration'
import { CursorRepository } from './repositories/cursor.repository'
import { CursorApiService } from './services/cursor-api.service'
import { CursorWebhookService } from './services/cursor-webhook.service'

@Module({
  imports: [ConfigModule, SharedModule, ComposioModule, forwardRef(() => SpacesModule)],
  controllers: [CursorController],
  providers: [
    CursorIntegration,
    CursorRepository,
    CursorApiService,
    CursorWebhookService,
    IntegrationsRepository,
    IntegrationsCoreService,
  ],
  exports: [CursorIntegration, CursorApiService],
})
export class CursorModule {}
