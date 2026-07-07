import { Module } from '@nestjs/common'
import { ConversationsController } from './controllers/conversations.controller'
import { ConversationPermissionsRepository } from './repositories/conversation-permissions.repository'
import { ConversationsRepository } from './repositories/conversations.repository'
import { MessagesRepository } from './repositories/messages.repository'
import { ConversationPermissionsService } from './services/conversation-permissions.service'
import { ConversationsService } from './services/conversations.service'

@Module({
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
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
  ],
})
export class ConversationsModule {}
