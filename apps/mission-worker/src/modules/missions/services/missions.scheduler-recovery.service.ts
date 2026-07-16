import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'
import { AgentRuntimeService } from './agent-runtime.service'
import { MissionOpenclawGateway } from './gateways/mission-openclaw.gateway'
import { isPastMissionExecutionLease } from './mission-execution-lease'
import { runAutoRetryFailed } from './missions.scheduler-recovery.auto-retry'
import { enqueueMissionOutboxEvent } from './missions.scheduler-recovery.outbox'
import { isPastPriorityStaleThreshold } from './missions.scheduler-recovery.stale'
import { MissionsSchedulerRecoveryCtx } from './missions.scheduler-recovery.types'
import { runDetectStalledWork } from './missions.scheduler-recovery.watchdogs'

@Injectable()
export class MissionsSchedulerRecoveryService {
  private readonly logger = new Logger(MissionsSchedulerRecoveryService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly openclawGateway: MissionOpenclawGateway,
  ) {}

  private async resolveRuntimeAgent(
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<{ gatewayAgentId: string }> {
    const supabase = this.databaseService.getClient()
    const runtime = await this.agentRuntime.resolveRuntimeAgent(supabase, userId, agentKey, orgId)
    return { gatewayAgentId: runtime.gatewayAgentId }
  }

  private buildCtx(): MissionsSchedulerRecoveryCtx {
    return {
      databaseService: this.databaseService,
      logger: this.logger,
      agentRuntime: this.agentRuntime,
      openclawGateway: this.openclawGateway,
      isPastPriorityStaleThreshold,
      isPastMissionExecutionLease: (updatedAt, executionStatus) =>
        isPastMissionExecutionLease(updatedAt, Date.now(), undefined, executionStatus),
      resolveRuntimeAgent: (userId, agentKey, orgId) =>
        this.resolveRuntimeAgent(userId, agentKey, orgId),
      enqueueOutboxEvent: (input) =>
        enqueueMissionOutboxEvent(this.databaseService, this.logger, input),
    }
  }

  async autoRetryFailed(): Promise<void> {
    return runAutoRetryFailed(this.buildCtx())
  }

  async detectStalledWork(): Promise<void> {
    return runDetectStalledWork(this.buildCtx())
  }
}
