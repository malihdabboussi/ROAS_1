import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../../../../lib/services/database.service'
import { AgentRuntimeService } from '../agent-runtime.service'
import { MissionOpenclawGateway } from '../gateways/mission-openclaw.gateway'

@Injectable()
export class MissionAgentStateService {
  private readonly logger = new Logger(MissionAgentStateService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly openclawGateway: MissionOpenclawGateway,
  ) {}

  async patchAgentState(
    userId: string,
    agentKey: string,
    op: string,
    fields: Record<string, string>,
    orgId?: string | null,
  ) {
    const supabase = this.databaseService.getClient()
    let target = await this.openclawGateway.resolveAgentApiTargetForUser(supabase, userId)
    if (target.machineId) {
      await this.openclawGateway.wakeUserMachineIfNeeded(userId)
      target = await this.openclawGateway.resolveAgentApiTargetForUser(supabase, userId)
    }
    const runtime = await this.agentRuntime.resolveRuntimeAgent(supabase, userId, agentKey, orgId)
    const sessionKey = this.agentRuntime.buildStateSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey,
      userId,
      orgId: orgId ?? null,
    })

    try {
      const res = await this.openclawGateway.fetchAgentApi(
        target,
        '/api/artifacts/stream',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openclaw-internal': 'true',
            'x-session-key': sessionKey,
            ...(orgId ? { 'x-org-id': orgId } : {}),
          },
          body: JSON.stringify({ action: 'patch_state', data: { op, ...fields } }),
        },
        { logTag: `state_patch user=${userId} agent=${agentKey}` },
      )
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        this.logger.warn(`State patch failed (${res.status}): ${text}`)
      }
    } catch (err) {
      this.logger.warn(`State patch error: ${String(err)}`)
    }
  }
}
