import { Logger } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'
import { AgentRuntimeService } from './agent-runtime.service'
import { MissionOpenclawGateway } from './gateways/mission-openclaw.gateway'

export type MissionsSchedulerRecoveryCtx = {
  databaseService: DatabaseService
  logger: Logger
  agentRuntime: AgentRuntimeService
  openclawGateway: MissionOpenclawGateway
  isPastPriorityStaleThreshold: (
    updatedAt: string | null | undefined,
    priority: string | null | undefined,
  ) => boolean
  isPastMissionExecutionLease: (
    updatedAt: string | null | undefined,
    executionStatus?: string | null,
  ) => boolean
  resolveRuntimeAgent: (
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) => Promise<{ gatewayAgentId: string }>
  enqueueOutboxEvent: (input: {
    missionId: string
    userId: string
    orgId?: string | null
    eventType: string
    dedupeKey: string
    payload?: Record<string, unknown>
    requeueExistingDedupeKey?: boolean
  }) => Promise<void>
}
