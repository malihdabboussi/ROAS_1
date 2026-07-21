import { Module } from '@nestjs/common'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { AgentTeamExternalMembersController } from './controllers/agent-team-external-members.controller'
import { AgentTeamMembersController } from './controllers/agent-team-members.controller'
import { AgentTeamPoliciesController } from './controllers/agent-team-policies.controller'
import { AgentTeamsController } from './controllers/agent-teams.controller'
import { AgentPolicyRepository } from './repositories/agent-policy.repository'
import { AgentTeamExternalMembersRepository } from './repositories/agent-team-external-members.repository'
import { AgentTeamMembersRepository } from './repositories/agent-team-members.repository'
import { AgentTeamRuntimeRepository } from './repositories/agent-team-runtime.repository'
import { AgentTeamsRepository } from './repositories/agent-teams.repository'
import { AgentPolicyActionDecisionService } from './services/agent-policy-action-decision.service'
import { AgentPolicyService } from './services/agent-policy.service'
import { AgentTeamPolicyWorkflowService } from './services/agent-team-policy-workflow.service'
import { AgentTeamsService } from './services/agent-teams.service'

@Module({
  imports: [UserAgentApiModule],
  controllers: [
    AgentTeamsController,
    AgentTeamPoliciesController,
    AgentTeamMembersController,
    AgentTeamExternalMembersController,
  ],
  providers: [
    AgentTeamMembersRepository,
    AgentTeamExternalMembersRepository,
    AgentPolicyRepository,
    AgentTeamRuntimeRepository,
    AgentTeamsRepository,
    AgentTeamPolicyWorkflowService,
    AgentPolicyActionDecisionService,
    AgentPolicyService,
    AgentTeamsService,
  ],
  exports: [AgentPolicyService, AgentTeamsService, AgentTeamsRepository],
})
export class AgentTeamsModule {}
