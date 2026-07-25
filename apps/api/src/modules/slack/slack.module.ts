import { Module } from '@nestjs/common'
import { BrainModule } from '../brain/brain.module'
import { ConversationsModule } from '../conversations/conversations.module'
import { LeadsModule } from '../leads/leads.module'
import { MachinesModule } from '../machines/machines.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { SlackAgentMessageToolsController } from './controllers/slack-agent-message-tools.controller'
import { SlackAgentToolsController } from './controllers/slack-agent-tools.controller'
import {
  SlackBrainMappingController,
  SlackBrainSettingsController,
} from './controllers/slack-brain-mapping.controller'
import { SlackIntelligenceAdminController } from './controllers/slack-intelligence-admin.controller'
import { SlackOAuthController } from './controllers/slack-oauth.controller'
import { SlackPeopleController } from './controllers/slack-people.controller'
import { SlackWebhookController } from './controllers/slack-webhook.controller'
import { SlackController } from './controllers/slack.controller'
import { SlackApiIntegration } from './integrations/slack-api.integration'
import { SlackBrainMappingRepository } from './repositories/slack-brain-mapping.repository'
import { SlackObservationRepository } from './repositories/slack-observation.repository'
import { SlackPeopleBrainRepository } from './repositories/slack-people-brain.repository'
import { SlackPeopleIndexRepository } from './repositories/slack-people-index.repository'
import { SlackPeopleRepository } from './repositories/slack-people.repository'
import { SlackRuntimeRepository } from './repositories/slack-runtime.repository'
import { SlackSignalTrainingRepository } from './repositories/slack-signal-training.repository'
import { SlackRepository } from './repositories/slack.repository'
import { SlackAccessControlService } from './services/slack-access-control.service'
import { SlackAgentToolsService } from './services/slack-agent-tools.service'
import { SlackBrainMappingService } from './services/slack-brain-mapping.service'
import { SlackChannelCoverageService } from './services/slack-channel-coverage.service'
import { SlackObservationService } from './services/slack-observation.service'
import { SlackPeopleService } from './services/slack-people.service'
import { SlackSenderResolverService } from './services/slack-sender-resolver.service'
import { SlackSignalResolutionService } from './services/slack-signal-resolution.service'
import { SlackSignalTrainingService } from './services/slack-signal-training.service'
import { SlackService } from './services/slack.service'

@Module({
  imports: [MachinesModule, BrainModule, ConversationsModule, LeadsModule, UserAgentApiModule],
  controllers: [
    SlackController,
    SlackOAuthController,
    SlackWebhookController,
    SlackAgentToolsController,
    SlackAgentMessageToolsController,
    SlackBrainMappingController,
    SlackBrainSettingsController,
    SlackPeopleController,
    SlackIntelligenceAdminController,
  ],
  providers: [
    SlackService,
    SlackAccessControlService,
    SlackAgentToolsService,
    SlackBrainMappingService,
    SlackObservationService,
    SlackPeopleService,
    SlackChannelCoverageService,
    SlackSignalTrainingService,
    SlackSignalResolutionService,
    SlackSenderResolverService,
    SlackRepository,
    SlackRuntimeRepository,
    SlackBrainMappingRepository,
    SlackObservationRepository,
    SlackPeopleIndexRepository,
    SlackPeopleRepository,
    SlackPeopleBrainRepository,
    SlackSignalTrainingRepository,
    SlackApiIntegration,
  ],
  exports: [
    SlackService,
    SlackAgentToolsService,
    SlackBrainMappingService,
    SlackObservationService,
    SlackPeopleService,
    SlackSenderResolverService,
    SlackRepository,
    SlackRuntimeRepository,
    SlackBrainMappingRepository,
    SlackObservationRepository,
    SlackPeopleRepository,
    SlackSignalTrainingRepository,
    SlackApiIntegration,
  ],
})
export class SlackModule {}
