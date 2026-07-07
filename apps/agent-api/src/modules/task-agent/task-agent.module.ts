import { forwardRef, Module } from '@nestjs/common'
import { AgentPolicyModule } from '../agent-policy/agent-policy.module'
import { AgentSyncModule } from '../agent-sync/agent-sync.module'
import { AgentBillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { ChatModule } from '../chat/chat.module'
import { AgentsAutomationController } from './controllers/agents-automation.controller'
import { TaskAgentController } from './controllers/task-agent.controller'
import { TaskAgentRepository } from './repositories/task-agent.repository'
import { TaskAgentArtifactOutputsService } from './services/task-agent-artifact-outputs.service'
import { TaskAgentCancelRegistry } from './services/task-agent-cancel-registry.service'
import { TaskAgentInputService } from './services/task-agent-input.service'
import { TaskAgentProgressService } from './services/task-agent-progress.service'
import { TaskAgentRequestContextService } from './services/task-agent-request-context.service'
import { TaskAgentService } from './services/task-agent.service'
import { TaskAgentSuggestionsService } from './services/task-agent-suggestions.service'

@Module({
  imports: [
    AgentPolicyModule,
    AgentSyncModule,
    AgentBillingModule,
    BrainModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [TaskAgentController, AgentsAutomationController],
  providers: [
    TaskAgentRepository,
    TaskAgentArtifactOutputsService,
    TaskAgentCancelRegistry,
    TaskAgentInputService,
    TaskAgentProgressService,
    TaskAgentRequestContextService,
    TaskAgentSuggestionsService,
    TaskAgentService,
  ],
})
export class TaskAgentModule {}
