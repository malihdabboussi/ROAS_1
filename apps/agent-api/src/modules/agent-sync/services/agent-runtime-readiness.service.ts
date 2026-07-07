import { Injectable, Logger } from '@nestjs/common'
import {
  OpenClawGatewayService,
  type OpenClawAgentRuntimeInspection,
  type OpenClawRequiredSkillFile,
} from '../../shared/services/openclaw-gateway.service'
import { AgentSyncService } from './agent-sync.service'

interface EnsureRuntimeReadyInput {
  userId: string
  orgId: string | null
  agentKey: string
  gatewayAgentId: string
  requiredSkillFiles?: OpenClawRequiredSkillFile[]
}

export interface AgentRuntimeReadyResult {
  ready: boolean
  repaired: boolean
  inspection: OpenClawAgentRuntimeInspection
}

@Injectable()
export class AgentRuntimeReadinessService {
  private readonly logger = new Logger(AgentRuntimeReadinessService.name)
  private readonly readyCache = new Map<
    string,
    { expiresAt: number; inspection: OpenClawAgentRuntimeInspection }
  >()
  private readonly inFlightRepairs = new Map<string, Promise<AgentRuntimeReadyResult>>()
  private readonly readyTtlMs = 5 * 60 * 1000

  constructor(
    private readonly syncService: AgentSyncService,
    private readonly gateway: OpenClawGatewayService,
  ) {}

  resetAll(): void {
    this.readyCache.clear()
    this.inFlightRepairs.clear()
  }

  invalidateRuntime(input: EnsureRuntimeReadyInput): void {
    this.readyCache.delete(this.cacheKey(input))
  }

  async ensureRuntimeReady(input: EnsureRuntimeReadyInput): Promise<AgentRuntimeReadyResult> {
    const cacheKey = this.cacheKey(input)
    const cached = this.readyCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return { ready: true, repaired: false, inspection: cached.inspection }
    }

    const inspection = await this.gateway.inspectAgentRuntime(
      input.gatewayAgentId,
      input.requiredSkillFiles ?? [],
    )
    if (inspection.ready) {
      this.readyCache.set(cacheKey, {
        expiresAt: Date.now() + this.readyTtlMs,
        inspection,
      })
      return { ready: true, repaired: false, inspection }
    }

    const existingRepair = this.inFlightRepairs.get(cacheKey)
    if (existingRepair) return existingRepair

    const repair = this.repairAndRecheck(input, inspection)
    this.inFlightRepairs.set(cacheKey, repair)
    try {
      return await repair
    } finally {
      this.inFlightRepairs.delete(cacheKey)
    }
  }

  private async repairAndRecheck(
    input: EnsureRuntimeReadyInput,
    before: OpenClawAgentRuntimeInspection,
  ): Promise<AgentRuntimeReadyResult> {
    this.logger.warn(
      `Runtime not ready for ${input.gatewayAgentId}: ${before.reasons.join(', ') || 'unknown'}`,
    )
    this.readyCache.delete(this.cacheKey(input))
    if (input.orgId) {
      await this.syncService.syncOrgAgent(input.orgId, input.agentKey)
    } else {
      await this.syncService.syncAgent(input.agentKey, input.userId)
    }

    const after = await this.gateway.inspectAgentRuntime(
      input.gatewayAgentId,
      input.requiredSkillFiles ?? [],
    )
    if (after.ready) {
      this.readyCache.set(this.cacheKey(input), {
        expiresAt: Date.now() + this.readyTtlMs,
        inspection: after,
      })
      return { ready: true, repaired: true, inspection: after }
    }

    throw new Error(
      `runtime_not_ready:${input.gatewayAgentId}:${after.reasons.join(',') || 'unknown'}`,
    )
  }

  private cacheKey(input: EnsureRuntimeReadyInput): string {
    const requiredKey = (input.requiredSkillFiles ?? [])
      .map((file) => `${file.skillKey}:${file.kind}:${file.filePath}`)
      .sort()
      .join('|')
    const base = input.orgId
      ? `org:${input.orgId}:${input.agentKey}`
      : `personal:${input.userId}:${input.agentKey}`
    return requiredKey ? `${base}:requires:${requiredKey}` : base
  }
}
