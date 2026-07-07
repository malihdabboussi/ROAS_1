import { forwardRef, Module } from '@nestjs/common'
import { AgentSyncModule } from '../agent-sync/agent-sync.module'
import { AgentBillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { ChatModule } from '../chat/chat.module'
import { PublicBrainController } from './controllers/public-brain.controller'
import { PublicChatController } from './controllers/public-chat.controller'
import { PublicConversationsController } from './controllers/public-conversations.controller'
import { PublicWidgetController } from './controllers/public-widget.controller'
import { PublicAgentGuard } from './guards/public-agent.guard'
import { PublicAgentRepository } from './repositories/public-agent.repository'
import { PublicAgentChatService } from './services/public-agent-chat.service'
import { PublicAgentService } from './services/public-agent.service'

@Module({
  imports: [
    AgentSyncModule,
    AgentBillingModule,
    forwardRef(() => ChatModule),
    forwardRef(() => BrainModule),
  ],
  controllers: [
    PublicChatController,
    PublicBrainController,
    PublicConversationsController,
    PublicWidgetController,
  ],
  providers: [PublicAgentGuard, PublicAgentRepository, PublicAgentService, PublicAgentChatService],
})
export class PublicAgentModule {}
