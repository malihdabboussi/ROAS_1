import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepository } from '../repositories/missions.repository'
import {
  AgentManagementService,
  type FireEmployeeHandoff,
  type FireEmployeeResult,
} from './agent-management.service'
import { AgentOnboardingService } from './agent-onboarding.service'
import { AgentProvisioningService } from './agent-provisioning.service'
import { AgentSkillManagementService } from './agent-skill-management.service'
import { MissionAvatarService } from './media/mission-avatar.service'

@Injectable()
export class MissionsAgentOperationsService {
  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly agentManagementService: AgentManagementService,
    private readonly agentSkillManagementService: AgentSkillManagementService,
    private readonly agentProvisioningService: AgentProvisioningService,
    private readonly agentOnboardingService: AgentOnboardingService,
    private readonly missionAvatarService: MissionAvatarService,
  ) {}

  async listAgents(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    return this.agentManagementService.listAgents(supabase, userId, orgId)
  }

  async listAgentsSlim(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    return this.agentManagementService.listAgentsSlim(supabase, userId, orgId)
  }

  async listAgentUserState(supabase: SupabaseClient, userId: string) {
    return this.agentManagementService.listAgentUserState(supabase, userId)
  }

  async upsertAgentUserState(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId: string | null | undefined,
    patch: { is_favorite?: boolean },
  ) {
    return this.agentManagementService.upsertAgentUserState(
      supabase,
      userId,
      agentKey,
      orgId,
      patch,
    )
  }

  async assertCanManageAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<void> {
    return this.agentManagementService.assertCanManageAgent(supabase, userId, agentKey, orgId)
  }

  async registerAllAgentsInGateway(supabase: SupabaseClient, userId: string) {
    return this.agentManagementService.registerAllAgentsInGateway(supabase, userId)
  }

  async listAgentSkills(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.listAgentSkills(supabase, userId, agentKey, orgId)
  }

  async listAgentSkillsForAgents(
    supabase: SupabaseClient,
    userId: string,
    agentKeys: string[],
    orgId?: string | null,
    opts?: { summary?: boolean },
  ) {
    return this.agentSkillManagementService.listAgentSkillsForAgents(
      supabase,
      userId,
      agentKeys,
      orgId,
      opts,
    )
  }

  async generateOnboardingAvatar(userId: string): Promise<{ url: string } | null> {
    return this.agentOnboardingService.generateOnboardingAvatar(userId)
  }

  async onboardFirstAgent(
    supabase: SupabaseClient,
    userId: string,
    opts: {
      archetype: string
      name: string
      style?: string
      tone?: string
      avatar_mode?: 'animation' | 'portrait'
      avatar_url?: string
      auto_hire_widget_builder?: boolean
    },
    orgId?: string | null,
  ) {
    return this.agentOnboardingService.onboardFirstAgent(supabase, userId, opts, orgId)
  }

  async promoteVibey(
    supabase: SupabaseClient,
    userId: string,
    archetype: 'ceo',
    orgId?: string | null,
  ) {
    return this.agentManagementService.promoteVibey(supabase, userId, archetype, orgId)
  }

  async renameAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    name: string,
    orgId?: string | null,
  ) {
    return this.agentManagementService.renameAgent(supabase, userId, agentKey, name, orgId)
  }

  async updateAgentImage(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    imageUrl: string,
    orgId?: string | null,
  ) {
    return this.agentManagementService.updateAgentImage(supabase, userId, agentKey, imageUrl, orgId)
  }

  async createAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    payload: {
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled?: boolean
    },
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.createAgentSkill(
      supabase,
      userId,
      agentKey,
      payload,
      orgId,
    )
  }

  async updateAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillId: string,
    updates: Partial<{
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled: boolean
    }>,
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.updateAgentSkill(
      supabase,
      userId,
      agentKey,
      skillId,
      updates,
      orgId,
    )
  }

  async deleteAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillId: string,
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.deleteAgentSkill(
      supabase,
      userId,
      agentKey,
      skillId,
      orgId,
    )
  }

  async createAgentSkillResource(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    payload: { file_path: string; content?: string; content_type?: string; storage_url?: string },
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.createAgentSkillResource(
      supabase,
      userId,
      agentKey,
      skillKey,
      payload,
      orgId,
    )
  }

  async updateAgentSkillResource(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    resourceId: string,
    payload: { file_path: string },
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.updateAgentSkillResource(
      supabase,
      userId,
      agentKey,
      skillKey,
      resourceId,
      payload,
      orgId,
    )
  }

  async deleteAgentSkillResource(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    resourceId: string,
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.deleteAgentSkillResource(
      supabase,
      userId,
      agentKey,
      skillKey,
      resourceId,
      orgId,
    )
  }

  async uploadSkillAsset(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
    description?: string,
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.uploadSkillAsset(
      supabase,
      userId,
      agentKey,
      skillKey,
      file,
      description,
      orgId,
    )
  }

  async listAgentWorkflows(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.listAgentWorkflows(supabase, userId, agentKey, orgId)
  }

  async createAgentWorkflow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    payload: {
      workflow_key: string
      name: string
      description: string
      markdown_content: string
      steps: unknown[]
      is_enabled?: boolean
    },
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.createAgentWorkflow(
      supabase,
      userId,
      agentKey,
      payload,
      orgId,
    )
  }

  async updateAgentWorkflow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    workflowId: string,
    updates: Partial<{
      workflow_key: string
      name: string
      description: string
      markdown_content: string
      steps: unknown[]
      is_enabled: boolean
    }>,
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.updateAgentWorkflow(
      supabase,
      userId,
      agentKey,
      workflowId,
      updates,
      orgId,
    )
  }

  async deleteAgentWorkflow(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    workflowId: string,
    orgId?: string | null,
  ) {
    return this.agentSkillManagementService.deleteAgentWorkflow(
      supabase,
      userId,
      agentKey,
      workflowId,
      orgId,
    )
  }

  async updateAgentActive(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    isActive: boolean,
    orgId?: string | null,
  ) {
    return this.agentManagementService.updateAgentActive(
      supabase,
      userId,
      agentKey,
      isActive,
      orgId,
    )
  }

  async repairAgentSetup(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    return this.agentManagementService.repairAgentSetup(supabase, userId, agentKey, orgId)
  }

  async repairStaleAgentSetups(limit?: number) {
    return this.agentManagementService.repairStaleAgentSetups(limit)
  }

  async updateAgentCommunicationModel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    modelId: string | null,
    orgId?: string | null,
  ) {
    return this.agentManagementService.updateAgentCommunicationModel(
      supabase,
      userId,
      agentKey,
      modelId,
      orgId,
    )
  }

  async updateAgentVoiceName(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    voiceName: string | null,
    orgId?: string | null,
  ) {
    await this.agentManagementService.assertCanManageAgent(supabase, userId, agentKey, orgId)
    return this.missionsRepository.updateAgentVoiceName(
      supabase,
      userId,
      agentKey,
      voiceName,
      orgId,
    )
  }

  async reorderAgents(
    supabase: SupabaseClient,
    userId: string,
    agentKeys: string[],
    orgId?: string | null,
  ) {
    await this.agentManagementService.reorderAgents(supabase, userId, agentKeys, orgId)
  }

  async fireEmployee(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
    opts?: { handoff?: FireEmployeeHandoff | null },
  ): Promise<FireEmployeeResult> {
    return this.agentManagementService.fireEmployee(supabase, userId, agentKey, orgId, opts)
  }

  async listReadyEmployeeLibrary(supabase: SupabaseClient) {
    return this.agentOnboardingService.listReadyEmployeeLibrary(supabase)
  }

  async hireReadyEmployee(
    supabase: SupabaseClient,
    userId: string,
    opts: { role_key: string; name?: string; team_id?: string | null },
    orgId?: string | null,
  ) {
    return this.agentOnboardingService.hireReadyEmployee(supabase, userId, opts, orgId)
  }

  async backfillWidgetBuilderEmployee(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ) {
    return this.agentOnboardingService.backfillWidgetBuilderEmployee(supabase, userId, orgId)
  }

  async backfillBrainScholarEmployee(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ) {
    return this.agentOnboardingService.backfillBrainScholarEmployee(supabase, userId, orgId)
  }

  async backfillMissingAvatars(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    const agents = await this.missionsRepository.listOrgAgents(supabase, userId, orgId)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const missing = agents.filter((a) => {
      if (a.image_url || a.agent_key === 'vibey') return false
      const inFlight =
        a.generating_avatar_at && new Date(a.generating_avatar_at as string) > fiveMinutesAgo
      return !inFlight
    })
    if (!missing.length) return { ok: true, triggered: 0 }

    for (const agent of missing) {
      const key = String(agent.agent_key)
      const name = String(agent.name ?? key)
      const role = String(agent.role ?? 'Agent')
      this.missionAvatarService.generateAgentAvatar(userId, key, name, role, orgId).catch(() => {})
    }
    return { ok: true, triggered: missing.length }
  }

  async checkOrgOnboardingStatus(supabase: SupabaseClient, userId: string, orgId: string | null) {
    if (!orgId) return { onboarded: true }
    const agents = await this.missionsRepository.listOrgAgents(supabase, userId, orgId)
    const hasVibeyCeo = agents.some((a) => a.agent_key === 'vibey' && a.level === 'c_level')
    const hasHr = agents.some(
      (a) => a.agent_key === 'hr' || (a.role && String(a.role).toLowerCase().includes('recruiter')),
    )
    const hasBrainScholar = agents.some((a) => {
      const role = String(a.role ?? '').toLowerCase()
      return (
        role === 'brain scholar & knowledge curator' ||
        (Array.isArray(a.skills) &&
          a.skills.some((s: unknown) => String(s).toLowerCase() === 'knowledge-extraction'))
      )
    })
    return {
      onboarded: hasVibeyCeo && hasHr && hasBrainScholar,
      agents: {
        vibey: hasVibeyCeo,
        hr: hasHr,
        brain_scholar: hasBrainScholar,
      },
    }
  }

  async listAgentDefinitions(supabase: SupabaseClient, userId: string, agentKey: string) {
    return this.agentProvisioningService.listAgentDefinitions(supabase, userId, agentKey)
  }

  async patchAgentConfig(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    patch: Record<string, unknown>,
    orgId?: string | null,
  ) {
    await this.agentManagementService.assertCanManageAgent(supabase, userId, agentKey, orgId)
    return this.missionsRepository.updateAgentConfigPatch(supabase, userId, agentKey, patch, orgId)
  }

  async internalUpsertAgentDefinition(
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    fileName: string,
    content: string,
  ) {
    return this.agentProvisioningService.internalUpsertAgentDefinition(
      userId,
      orgId,
      agentKey,
      fileName,
      content,
    )
  }

  async internalUpsertAgentSkill(
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    skillKey: string,
    name: string,
    description: string,
    markdownContent: string,
  ) {
    return this.agentProvisioningService.internalUpsertAgentSkill(
      userId,
      orgId,
      agentKey,
      skillKey,
      name,
      description,
      markdownContent,
    )
  }

  async internalCreateAgent(
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    name: string,
    role: string,
    level: string,
    skills: string[],
    definitions: Array<{ file_name: string; content: string }>,
    cloneSkillsFrom?: string,
    cloneSkillKeys?: string[],
    skillSeedKey?: string,
    capabilityProfile?: string,
    capabilityDomain?: string,
    specialty?: string,
    teamId?: string | null,
  ) {
    return this.agentProvisioningService.internalCreateAgent(
      userId,
      orgId,
      agentKey,
      name,
      role,
      level,
      skills,
      definitions,
      cloneSkillsFrom,
      cloneSkillKeys,
      skillSeedKey,
      capabilityProfile,
      capabilityDomain,
      specialty,
      teamId,
    )
  }
}
