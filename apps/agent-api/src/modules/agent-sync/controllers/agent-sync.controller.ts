import { Body, Controller, Logger, Param, Post, UseGuards } from '@nestjs/common'
import { InternalAuthGuard } from '../../artifacts/guards/internal-auth.guard'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { OpenClawGatewayService } from '../../shared/services/openclaw-gateway.service'
import { AgentInstructionAuditService } from '../services/agent-instruction-audit.service'
import { AgentInstructionRepairService } from '../services/agent-instruction-repair.service'
import { AgentRuntimeReadinessService } from '../services/agent-runtime-readiness.service'
import { AgentSyncService } from '../services/agent-sync.service'

@Controller('agents')
@UseGuards(InternalAuthGuard)
export class AgentSyncController {
  private readonly logger = new Logger(AgentSyncController.name)

  constructor(
    private readonly syncService: AgentSyncService,
    private readonly readinessService: AgentRuntimeReadinessService,
    private readonly gateway: OpenClawGatewayService,
    private readonly instructionAudit: AgentInstructionAuditService,
    private readonly instructionRepair: AgentInstructionRepairService,
    private readonly agentRuntime: AgentRuntimeService,
  ) {}

  @Post('sync')
  async syncAll(@Body() body?: { user_id?: string; org_id?: string }) {
    const result = await this.syncService.syncAll(body?.user_id)
    return { ok: true, ...result }
  }

  @Post('instruction-audit')
  async auditInstructions(
    @Body() body?: { agent_key?: string; user_id?: string; org_id?: string },
  ) {
    const result = await this.instructionAudit.audit(body ?? {})
    return { ok: true, ...result }
  }

  @Post('instruction-repair')
  async repairInstructions(
    @Body() body?: { agent_key?: string; user_id?: string; org_id?: string },
  ) {
    const vibeyApiResult = await this.instructionRepair.repairPlatformVibeyApiSkills(body ?? {})
    const toolsResult = await this.instructionRepair.repairPlatformToolsDefinitions(body ?? {})
    const repaired = [...vibeyApiResult.repaired, ...toolsResult.repaired]
    const skipped = [...vibeyApiResult.skipped, ...toolsResult.skipped]
    const syncResults: unknown[] = []
    const syncTargets = new Map(
      repaired.map((item) => [`${item.agentKey}:${item.orgId ?? ''}`, item]),
    )
    for (const target of syncTargets.values()) {
      if (target.orgId) {
        syncResults.push(await this.syncService.syncOrgAgent(target.orgId, target.agentKey))
      } else {
        syncResults.push(
          await this.syncService.syncAgent(target.agentKey, target.userId ?? undefined),
        )
      }
    }
    return { ok: true, repaired, skipped, syncResults }
  }

  @Post(':agentKey/sync')
  async syncAgent(
    @Param('agentKey') agentKey: string,
    @Body() body?: { user_id?: string; org_id?: string; inspect?: boolean },
  ) {
    if (body?.org_id) {
      const result = await this.syncService.syncOrgAgent(body.org_id, agentKey)
      const gatewayAgentId = this.resolveGatewayAgentId(agentKey, body.user_id, body.org_id)
      this.readinessService.invalidateRuntime({
        userId: body.user_id ?? '',
        orgId: body.org_id,
        agentKey,
        gatewayAgentId,
      })
      if (body.inspect === true) {
        const inspection = await this.gateway.inspectAgentRuntime(gatewayAgentId)
        return { ok: true, ...result, inspection }
      }
      return { ok: true, ...result }
    }
    const result = await this.syncService.syncAgent(agentKey, body?.user_id)
    const gatewayAgentId = this.resolveGatewayAgentId(agentKey, body?.user_id, null)
    this.readinessService.invalidateRuntime({
      userId: body?.user_id ?? '',
      orgId: null,
      agentKey,
      gatewayAgentId,
    })
    if (body?.inspect === true) {
      const inspection = await this.gateway.inspectAgentRuntime(gatewayAgentId)
      return { ok: true, ...result, inspection }
    }
    return { ok: true, ...result }
  }

  @Post(':agentKey/ensure-ready')
  async ensureAgentReady(
    @Param('agentKey') agentKey: string,
    @Body()
    body?: {
      user_id?: string
      org_id?: string | null
      gateway_agent_id?: string
    },
  ) {
    const orgId = body?.org_id?.trim() || null
    const userId = body?.user_id?.trim() || ''
    const gatewayAgentId = this.resolveGatewayAgentId(
      agentKey,
      userId,
      orgId,
      body?.gateway_agent_id,
    )
    const result = await this.readinessService.ensureRuntimeReady({
      userId,
      orgId,
      agentKey,
      gatewayAgentId,
    })
    return { ok: true, ...result }
  }

  @Post(':agentKey/register')
  async registerAgent(
    @Param('agentKey') agentKey: string,
    @Body()
    body: {
      user_id?: string
      name: string
      definitions: Array<{ file_name: string; content: string }>
    },
  ) {
    const agentsBaseDir = this.syncService.getAgentsBaseDir()
    const workspace = `${agentsBaseDir}/${agentKey}`

    const result = await this.gateway.ensureAgent({
      agentKey,
      name: body.name,
      workspace,
      definitions: body.definitions,
    })

    if (result.ok) {
      const syncResult = await this.syncService.syncAgent(agentKey, body.user_id)
      this.readinessService.invalidateRuntime({
        userId: body.user_id ?? '',
        orgId: null,
        agentKey,
        gatewayAgentId: agentKey,
      })
      this.logger.log(
        `Agent "${agentKey}" registered: gateway=${result.created ? 'created' : 'exists'}, files=${result.filesWritten}, synced=${syncResult.synced}, healthy=${syncResult.healthy}`,
      )
      return {
        ok: result.ok,
        created: result.created,
        filesWritten: result.filesWritten,
        ...syncResult,
      }
    }

    return { ok: result.ok, created: result.created, filesWritten: result.filesWritten }
  }

  private resolveGatewayAgentId(
    agentKey: string,
    userId?: string | null,
    orgId?: string | null,
    requestedGatewayAgentId?: string,
  ): string {
    const requested = requestedGatewayAgentId?.trim()
    const canonical = this.agentRuntime.resolveGatewayAgentId(agentKey, orgId, userId)
    return !requested || requested === agentKey ? canonical : requested
  }
}
