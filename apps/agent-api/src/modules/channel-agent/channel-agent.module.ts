import { forwardRef, Module } from '@nestjs/common'
import { AgentPolicyModule } from '../agent-policy/agent-policy.module'
import { AgentSyncModule } from '../agent-sync/agent-sync.module'
import { AgentBillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { ChatModule } from '../chat/chat.module'
import { ChannelAgentController } from './controllers/channel-agent.controller'
import { ChannelAgentRepository } from './repositories/channel-agent.repository'
import { ChannelAgentInputService } from './services/channel-agent-input.service'
import { ChannelAgentProgressService } from './services/channel-agent-progress.service'
import { ChannelAgentService } from './services/channel-agent.service'

@Module({
  imports: [
    AgentPolicyModule,
    AgentSyncModule,
    AgentBillingModule,
    BrainModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [ChannelAgentController],
  providers: [ChannelAgentRepository, ChannelAgentInputService, ChannelAgentProgressService, ChannelAgentService],
})
export class ChannelAgentModule {}
