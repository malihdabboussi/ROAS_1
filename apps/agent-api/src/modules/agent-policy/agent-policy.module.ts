import { Global, Module } from '@nestjs/common'
import { AgentPolicyRepository } from './repositories/agent-policy.repository'
import { AgentPolicyActionDecisionService } from './services/agent-policy-action-decision.service'
import { AgentPolicyInvalidationListenerService } from './services/agent-policy-invalidation-listener.service'
import { AgentPolicyService } from './services/agent-policy.service'

/**
 * Global so any module (chat / brain / artifacts / channels) can inject
 * AgentPolicyService without re-importing it.
 */
@Global()
@Module({
  providers: [
    AgentPolicyActionDecisionService,
    AgentPolicyInvalidationListenerService,
    AgentPolicyRepository,
    AgentPolicyService,
  ],
  exports: [AgentPolicyService],
})
export class AgentPolicyModule {}
