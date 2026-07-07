import { Injectable } from '@nestjs/common'
import { ArtifactAgentDelegationGatewayClient } from '../integrations/artifact-agent-delegation-gateway.client'
import { ArtifactAgentHireApiClient } from '../integrations/artifact-agent-hire-api.client'
import { ArtifactAgentDelegationRepository } from '../repositories/artifact-agent-delegation.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactAgentDelegationBrainstormService } from './artifact-agent-delegation-brainstorm.service'
import { ArtifactAgentDelegationContextService } from './artifact-agent-delegation-context.service'
import { ArtifactAgentDelegationHireService } from './artifact-agent-delegation-hire.service'
import { ArtifactAgentDelegationQueryService } from './artifact-agent-delegation-query.service'
import { ArtifactAgentDelegationStreamService } from './artifact-agent-delegation-stream.service'
import { ArtifactAgentDelegationTaskService } from './artifact-agent-delegation-task.service'

type ArtifactAgentDelegationServiceDeps = {
  repository?: ArtifactAgentDelegationRepository
  gatewayClient?: ArtifactAgentDelegationGatewayClient
  hireClient?: ArtifactAgentHireApiClient
}

@Injectable()
export class ArtifactAgentDelegationService {
  private readonly repository: ArtifactAgentDelegationRepository
  private readonly context: ArtifactAgentDelegationContextService
  private readonly stream: ArtifactAgentDelegationStreamService
  private readonly query: ArtifactAgentDelegationQueryService
  private readonly task: ArtifactAgentDelegationTaskService
  private readonly brainstorm: ArtifactAgentDelegationBrainstormService
  private readonly hire: ArtifactAgentDelegationHireService

  constructor(deps: ArtifactAgentDelegationServiceDeps = {}) {
    this.repository = deps.repository ?? new ArtifactAgentDelegationRepository()
    this.context = new ArtifactAgentDelegationContextService(this.repository)
    this.stream = new ArtifactAgentDelegationStreamService(
      deps.gatewayClient ?? new ArtifactAgentDelegationGatewayClient(),
    )
    this.query = new ArtifactAgentDelegationQueryService(this.repository, this.context, this.stream)
    this.task = new ArtifactAgentDelegationTaskService(this.repository, this.context, this.stream)
    this.brainstorm = new ArtifactAgentDelegationBrainstormService(
      this.repository,
      this.context,
      this.stream,
    )
    this.hire = new ArtifactAgentDelegationHireService(
      this.repository,
      deps.hireClient ?? new ArtifactAgentHireApiClient(),
    )
  }

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      ask_agent: (data, sessionKey, onProgress) =>
        this.query.askAgent(target, data, sessionKey, onProgress),
      delegate_to_agent: (data, sessionKey, onProgress) =>
        this.task.delegateToAgent(target, data, sessionKey, onProgress),
      approve_agent_hire: (data, sessionKey, onProgress) =>
        this.hire.approveAgentHire(target, data, sessionKey, onProgress),
      brainstorm_agents: (data, sessionKey, onProgress) =>
        this.brainstorm.brainstormAgents(target, data, sessionKey, onProgress),
    }
  }
}
