import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StripeService } from '../../billing/services/stripe.service'
import {
  BrainHandoffService,
  type BrainHandoffResult,
  type BrainHandoffTarget,
} from '../../brain/services/brain-handoff.service'
import { isSystemAgentFieldLocked } from '../lib/system-agent-keys'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionAgentGatewayService } from './gateways/mission-agent-gateway.service'
import { MissionSkillSeederService } from './skills/mission-skill-seeder.service'

export interface FireEmployeeHandoff {
  scope: 'default' | 'agent' | 'campaign'
  agent_key?: string | null
  campaign_id?: string | null
}

export interface FireEmployeeResult {
  deleted: true
  reassigned_to: string
  handoff: {
    applied: boolean
    scope: FireEmployeeHandoff['scope'] | null
    target_brain_id: string | null
    target_campaign_id: string | null
    copied: BrainHandoffResult['copied'] | null
  }
  brain_cancellation: {
    canceled_addon: boolean
    brain_id: string | null
    deletion_at: string | null
  }
}

@Injectable()
export class AgentManagementService {
  private readonly logger = new Logger(AgentManagementService.name)
  private static readonly STALE_SETUP_REPAIR_MS = 10 * 60 * 1000
  private static readonly VIBEY_BASE_CONFIG = {
    capability_domain: 'management',
    model_id: 'auto:power',
  } as const

  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly missionAgentGatewayService: MissionAgentGatewayService,
    private readonly missionSkillSeederService: MissionSkillSeederService,
    private readonly brainHandoffService: BrainHandoffService,
    private readonly stripeService: StripeService,
  ) {}

  async listAgents(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    await this.missionSkillSeederService.ensureLoopAgent(supabase, userId, orgId)
    return this.missionsRepository.listOrgAgents(supabase, userId, orgId)
  }

  async listAgentsSlim(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    await this.missionSkillSeederService.ensureLoopAgent(supabase, userId, orgId)
    return this.missionsRepository.listOrgAgentsSlim(supabase, userId, orgId)
  }

  async listAgentUserState(supabase: SupabaseClient, userId: string) {
    return this.missionsRepository.listAgentUserState(supabase, userId)
  }

  private async resolveAgentIdInScope(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<string> {
    const agentId = await this.missionsRepository.findAgentRegistryIdInScope(
      supabase,
      userId,
      agentKey,
      orgId,
    )
    if (!agentId) throw new NotFoundException('Agent not found')
    return agentId
  }

  async upsertAgentUserState(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId: string | null | undefined,
    patch: { is_favorite?: boolean },
  ) {
    const agentId = await this.resolveAgentIdInScope(supabase, userId, agentKey, orgId)
    const input: {
      user_id: string
      agent_id: string
      updated_at: string
      is_favorite?: boolean
    } = {
      user_id: userId,
      agent_id: agentId,
      updated_at: new Date().toISOString(),
    }
    if (typeof patch.is_favorite === 'boolean') input.is_favorite = patch.is_favorite
    return this.missionsRepository.upsertAgentUserState(supabase, input)
  }

  async assertCanManageAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<void> {
    const canManage = await this.missionsRepository.canManageAgent(
      supabase,
      userId,
      agentKey,
      orgId,
    )
    if (!canManage) {
      throw new ForbiddenException('You do not have permission to manage this agent')
    }
  }

  async registerAllAgentsInGateway(supabase: SupabaseClient, userId: string) {
    const agents = await this.missionsRepository.listOrgAgents(supabase, userId)
    const serviceSupabase = this.missionAgentGatewayService.getServiceRoleClient()
    const results: Array<{ agent_key: string; ok: boolean }> = []

    for (const agent of agents) {
      const agentKey = agent.agent_key as string
      if (agentKey === 'hr') {
        results.push({ agent_key: agentKey, ok: true })
        continue
      }

      const definitions = await this.missionsRepository.listAgentDefinitionsForGatewayRegistration(
        serviceSupabase,
        userId,
        agentKey,
      )
      const name = (agent.name as string) ?? agentKey
      const ok = await this.missionAgentGatewayService
        .registerAgentInGateway(userId, agentKey, name, definitions)
        .catch(() => false)
      results.push({ agent_key: agentKey, ok: !!ok })
    }

    const registered = results.filter((r) => r.ok).length
    this.logger.log(
      `Registered ${registered}/${results.length} agents in gateway for user ${userId}`,
    )
    return { ok: true, total: results.length, registered, results }
  }

  async renameAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    name: string,
    orgId?: string | null,
  ) {
    if (isSystemAgentFieldLocked(agentKey, 'identity')) {
      throw new ForbiddenException('System agent identity is managed by the platform')
    }
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    return this.missionsRepository.renameAgent(supabase, userId, agentKey, name, orgId)
  }

  async updateAgentImage(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    imageUrl: string,
    orgId?: string | null,
  ) {
    if (isSystemAgentFieldLocked(agentKey, 'brain_grant')) {
      throw new ForbiddenException('System agent brain access is managed by the platform')
    }
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    return this.missionsRepository.updateAgentImage(supabase, userId, agentKey, imageUrl, orgId)
  }

  async updateAgentActive(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    isActive: boolean,
    orgId?: string | null,
  ) {
    if (isSystemAgentFieldLocked(agentKey, 'lifecycle')) {
      throw new ForbiddenException('System agents cannot be deactivated')
    }
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    return this.missionsRepository.updateAgentActive(supabase, userId, agentKey, isActive, orgId)
  }

  async repairAgentSetup(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    return this.executeAgentSetupRepair(supabase, userId, agentKey, orgId, true)
  }

  async repairStaleAgentSetups(limit = 25): Promise<{
    checked: number
    repaired: number
    failed: number
    skipped: number
  }> {
    const serviceSupabase = this.missionAgentGatewayService.getServiceRoleClient()
    const cutoffIso = new Date(
      Date.now() - AgentManagementService.STALE_SETUP_REPAIR_MS,
    ).toISOString()
    const rows = await this.missionsRepository.listStaleAgentSetups(
      serviceSupabase,
      cutoffIso,
      limit,
    )
    let repaired = 0
    let failed = 0
    let skipped = 0

    for (const row of rows as Array<Record<string, unknown>>) {
      const agentKey = typeof row.agent_key === 'string' ? row.agent_key : ''
      const orgId = typeof row.org_id === 'string' ? row.org_id : null
      const actingUserId =
        typeof row.user_id === 'string'
          ? row.user_id
          : typeof row.created_by === 'string'
            ? row.created_by
            : ''

      if (!agentKey || !actingUserId) {
        skipped++
        continue
      }

      try {
        const result = await this.executeAgentSetupRepair(
          serviceSupabase,
          actingUserId,
          agentKey,
          orgId,
          false,
        )
        if (result.sync_status === 'ready') repaired++
        else failed++
      } catch (err) {
        failed++
        this.logger.warn(`Stale setup repair failed for ${agentKey}: ${(err as Error).message}`)
      }
    }

    return { checked: rows.length, repaired, failed, skipped }
  }

  private async executeAgentSetupRepair(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId: string | null | undefined,
    assertAccess: boolean,
  ) {
    if (assertAccess) {
      await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    }

    await this.missionsRepository.getAgent(supabase, userId, agentKey, orgId)
    await this.missionsRepository.updateAgentSyncStatus(
      supabase,
      userId,
      agentKey,
      'syncing',
      orgId,
    )

    const syncResult = await this.missionAgentGatewayService.triggerAgentSkillsSyncDetailed(
      userId,
      agentKey,
      orgId,
      true,
    )
    const inspectionReady = syncResult?.inspection?.ready === true
    const repaired = syncResult?.ok === true && syncResult.healthy === true && inspectionReady
    const nextStatus = repaired ? 'ready' : 'failed'

    await this.missionsRepository.updateAgentSyncStatus(
      supabase,
      userId,
      agentKey,
      nextStatus,
      orgId,
    )

    const agent = await this.missionsRepository.getAgent(supabase, userId, agentKey, orgId)
    return {
      ok: repaired,
      repaired,
      sync_status: nextStatus,
      agent,
      reasons: repaired ? [] : this.collectAgentSetupRepairReasons(syncResult),
    }
  }

  private collectAgentSetupRepairReasons(
    syncResult: Awaited<ReturnType<MissionAgentGatewayService['triggerAgentSkillsSyncDetailed']>>,
  ): string[] {
    if (!syncResult) return ['sync_request_failed']
    const reasons = new Set<string>()
    for (const reason of syncResult.inspection?.reasons ?? []) {
      if (typeof reason === 'string' && reason.trim()) reasons.add(reason.trim())
    }
    for (const failure of syncResult.failed ?? []) {
      const filePath = typeof failure.filePath === 'string' ? failure.filePath : 'unknown_file'
      const error = typeof failure.error === 'string' ? failure.error : 'sync_failed'
      reasons.add(`${filePath}: ${error}`)
    }
    if (syncResult.healthy !== true) reasons.add('sync_unhealthy')
    if (syncResult.inspection?.ready !== true) reasons.add('runtime_not_ready')
    return [...reasons]
  }

  async updateAgentCommunicationModel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    modelId: string | null,
    orgId?: string | null,
  ) {
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    return this.missionsRepository.updateAgentConfigPatch(
      supabase,
      userId,
      agentKey,
      {
        model_id: modelId,
      },
      orgId,
    )
  }

  async promoteVibey(
    supabase: SupabaseClient,
    userId: string,
    archetype: 'ceo',
    orgId?: string | null,
  ): Promise<{ ok: true; vibey: Record<string, unknown> }> {
    const serviceSupabase = this.missionAgentGatewayService.getServiceRoleClient()
    const normalizedArchetype = 'ceo'
    const capabilityProfile = 'vibey_ceo'
    const role = 'CEO'

    await this.missionsRepository.ensureVibeyRegistryRow(
      serviceSupabase,
      userId,
      orgId,
      {
        archetype: 'ceo',
        capability_profile: 'vibey_ceo',
        ...AgentManagementService.VIBEY_BASE_CONFIG,
      },
      'Failed to load Vibey registry row',
      'Failed to create missing Vibey row',
    )

    const updatedVibey = await this.missionsRepository.updateAgentConfigPatch(
      serviceSupabase,
      userId,
      'vibey',
      {
        archetype: normalizedArchetype,
        capability_profile: capabilityProfile,
        capability_domain: AgentManagementService.VIBEY_BASE_CONFIG.capability_domain,
        model_id: AgentManagementService.VIBEY_BASE_CONFIG.model_id,
      },
      orgId,
    )

    await this.missionsRepository.updateAgentRegistryFields(
      serviceSupabase,
      userId,
      'vibey',
      {
        level: 'c_level',
        role,
        name: 'Pixel',
      },
      orgId,
      'Failed to update Vibey promotion role',
    )

    await this.missionSkillSeederService.seedLeaderSkills(
      serviceSupabase,
      userId,
      'vibey',
      normalizedArchetype,
    )

    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, 'vibey', orgId)
      .catch(() => undefined)

    const reloadedVibey = await this.missionsRepository
      .findScopedAgentRegistryRow(serviceSupabase, userId, 'vibey', orgId)
      .catch(() => null)

    return { ok: true, vibey: (reloadedVibey ?? updatedVibey) as Record<string, unknown> }
  }

  async reorderAgents(
    supabase: SupabaseClient,
    userId: string,
    agentKeys: string[],
    orgId?: string | null,
  ) {
    await this.missionsRepository.reorderAgents(supabase, userId, agentKeys, orgId)
  }

  async fireEmployee(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
    opts?: { handoff?: FireEmployeeHandoff | null },
  ): Promise<FireEmployeeResult> {
    if (isSystemAgentFieldLocked(agentKey, 'lifecycle')) {
      throw new ForbiddenException('System agents cannot be removed')
    }
    await this.assertCanManageAgent(supabase, userId, agentKey, orgId)
    const handoff = this.normalizeHandoff(agentKey, opts?.handoff)

    const sourceBrainId = await this.resolveAgentBrainId(supabase, userId, agentKey, orgId ?? null)

    let handoffResult: BrainHandoffResult | null = null
    if (sourceBrainId && handoff) {
      const target = this.handoffToTarget(handoff)
      handoffResult = await this.brainHandoffService.copyAllFromBrain(
        supabase,
        userId,
        sourceBrainId,
        target,
        orgId ?? null,
      )
    }

    const cancellation = await this.stripeService
      .cancelAgentBrainAddonInternal(userId, agentKey, orgId ?? null)
      .catch((err) => {
        this.logger.error(
          `Failed to cancel agent brain addon for ${agentKey}: ${(err as Error).message}`,
        )
        throw err
      })

    const { reassigned_to } = await this.missionsRepository.fireEmployee(
      supabase,
      userId,
      agentKey,
      orgId,
    )

    return {
      deleted: true,
      reassigned_to,
      handoff: {
        applied: !!handoffResult,
        scope: handoff ? handoff.scope : null,
        target_brain_id: handoffResult?.target_brain_id ?? null,
        target_campaign_id: handoffResult?.target_campaign_id ?? null,
        copied: handoffResult?.copied ?? null,
      },
      brain_cancellation: {
        canceled_addon: cancellation.canceled,
        brain_id: cancellation.brain_id,
        deletion_at: cancellation.deletion_at,
      },
    }
  }

  private normalizeHandoff(
    firedAgentKey: string,
    handoff: FireEmployeeHandoff | null | undefined,
  ): FireEmployeeHandoff | null {
    if (!handoff) return null
    const scope = handoff.scope
    if (scope !== 'default' && scope !== 'agent' && scope !== 'campaign') {
      throw new Error(`Invalid handoff scope: ${String(scope)}`)
    }
    if (scope === 'agent') {
      const key = handoff.agent_key?.trim()
      if (!key) throw new Error('handoff.agent_key is required for scope=agent')
      if (key === firedAgentKey) throw new Error('Handoff target must be a different agent')
      return { scope, agent_key: key }
    }
    if (scope === 'campaign') {
      const id = handoff.campaign_id?.trim()
      if (!id) throw new Error('handoff.campaign_id is required for scope=campaign')
      return { scope, campaign_id: id }
    }
    return { scope: 'default' }
  }

  private handoffToTarget(handoff: FireEmployeeHandoff): BrainHandoffTarget {
    switch (handoff.scope) {
      case 'default':
        return { type: 'default' }
      case 'agent':
        return { type: 'agent', agentKey: handoff.agent_key as string }
      case 'campaign':
        return { type: 'campaign', campaignId: handoff.campaign_id as string }
    }
  }

  private async resolveAgentBrainId(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId: string | null,
  ): Promise<string | null> {
    return this.missionsRepository.findAgentBrainId(supabase, userId, agentKey, orgId)
  }
}
