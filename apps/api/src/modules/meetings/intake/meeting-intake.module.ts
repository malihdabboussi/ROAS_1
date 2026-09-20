import { Module } from '@nestjs/common'
import { BillingModule } from '../../billing/billing.module'
import { BrainModule } from '../../brain/brain.module'
import { SpaceTemplatesModule } from '../../space-templates/space-templates.module'
import { SpacesModule } from '../../spaces/spaces.module'
import { VaultModule } from '../../vault/vault.module'
import { CustomNoteTakersModule } from '../custom/custom-note-takers.module'
import { MeetingProvidersModule } from '../providers/meeting-providers.module'
import { MeetingConnectionsController } from './controllers/meeting-connections.controller'
import { MeetingImportsController } from './controllers/meeting-imports.controller'
import { MeetingProviderDefinitionsController } from './controllers/meeting-provider-definitions.controller'
import { MeetingWebhooksController } from './controllers/meeting-webhooks.controller'
import { MeetingIntakeRepository } from './repositories/meeting-intake.repository'
import { MeetingWebhookDeliveriesRepository } from './repositories/meeting-webhook-deliveries.repository'
import { MeetingConnectionsService } from './services/meeting-connections.service'
import { MeetingImportService } from './services/meeting-import.service'
import { MeetingIntakeService } from './services/meeting-intake.service'
import { MeetingsSpaceBootstrapService } from './services/meetings-space-bootstrap.service'

@Module({
  imports: [
    BillingModule,
    BrainModule,
    SpacesModule,
    SpaceTemplatesModule,
    MeetingProvidersModule,
    CustomNoteTakersModule,
    VaultModule,
  ],
  controllers: [
    MeetingWebhooksController,
    MeetingProviderDefinitionsController,
    MeetingImportsController,
    MeetingConnectionsController,
  ],
  providers: [
    MeetingIntakeRepository,
    MeetingWebhookDeliveriesRepository,
    MeetingIntakeService,
    MeetingImportService,
    MeetingConnectionsService,
    MeetingsSpaceBootstrapService,
  ],
  exports: [
    MeetingIntakeService,
    MeetingImportService,
    MeetingIntakeRepository,
    MeetingsSpaceBootstrapService,
  ],
})
export class MeetingIntakeModule {}
