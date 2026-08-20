import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { ConversationConnectionsController } from './controllers/conversation-connections.controller'
import { ConversationMessagesController } from './controllers/conversation-messages.controller'
import { ConversationRecordsController } from './controllers/conversation-records.controller'
import { ConversationSharesController } from './controllers/conversation-shares.controller'
import { ConversationsController } from './controllers/conversations.controller'
import { ConversationActivityRepository } from './repositories/conversation-activity.repository'
import { ConversationConnectionsRepository } from './repositories/conversation-connections.repository'
import { ConversationPermissionsRepository } from './repositories/conversation-permissions.repository'
import { ConversationsRepository } from './repositories/conversations.repository'
import { MessagesRepository } from './repositories/messages.repository'
import { ConversationActivityService } from './services/conversation-activity.service'
import { ConversationAssetsService } from './services/conversation-assets.service'
import { ConversationConnectionsService } from './services/conversation-connections.service'
import { ConversationFeedService } from './services/conversation-feed.service'
import { ConversationMessagesService } from './services/conversation-messages.service'
import { ConversationPermissionsService } from './services/conversation-permissions.service'
import { ConversationTitleSuggestionService } from './services/conversation-title-suggestion.service'
import { ConversationsService } from './services/conversations.service'

@Module({
  imports: [BillingModule],
  controllers: [
    ConversationsController,
    ConversationRecordsController,
    ConversationMessagesController,
    ConversationSharesController,
    ConversationConnectionsController,
  ],
  providers: [
    ConversationsService,
    ConversationActivityService,
    ConversationConnectionsService,
    ConversationFeedService,
    ConversationAssetsService,
    ConversationMessagesService,
    ConversationTitleSuggestionService,
    ConversationPermissionsService,
    ConversationPermissionsRepository,
    ConversationActivityRepository,
    ConversationConnectionsRepository,
    ConversationsRepository,
    MessagesRepository,
  ],
  exports: [
    ConversationsService,
    ConversationPermissionsService,
    ConversationPermissionsRepository,
    ConversationsRepository,
    MessagesRepository,
    ConversationTitleSuggestionService,
  ],
})
export class ConversationsModule {}
