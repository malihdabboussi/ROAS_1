import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { ConversationMessagesController } from './controllers/conversation-messages.controller'
import { ConversationRecordsController } from './controllers/conversation-records.controller'
import { ConversationSharesController } from './controllers/conversation-shares.controller'
import { ConversationsController } from './controllers/conversations.controller'
import { ConversationPermissionsRepository } from './repositories/conversation-permissions.repository'
import { ConversationsRepository } from './repositories/conversations.repository'
import { MessagesRepository } from './repositories/messages.repository'
import { ConversationAssetsService } from './services/conversation-assets.service'
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
  ],
  providers: [
    ConversationsService,
    ConversationAssetsService,
    ConversationMessagesService,
    ConversationTitleSuggestionService,
    ConversationPermissionsService,
    ConversationPermissionsRepository,
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
