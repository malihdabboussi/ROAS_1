import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveDefaultAgentModel } from '../lib/agent-model-defaults'
import { MissionsRepository } from '../repositories/missions.repository'
import { MissionAgentGatewayService } from './gateways/mission-agent-gateway.service'
import { MissionAvatarService } from './media/mission-avatar.service'
import { MissionSkillSeederService } from './skills/mission-skill-seeder.service'
import { MissionAgentTemplateService } from './templates/mission-agent-template.service'

@Injectable()
export class AgentProvisioningService {
  private readonly logger = new Logger(AgentProvisioningService.name)

  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly missionAgentGatewayService: MissionAgentGatewayService,
    private readonly missionAgentTemplateService: MissionAgentTemplateService,
    private readonly missionSkillSeederService: MissionSkillSeederService,
    private readonly missionAvatarService: MissionAvatarService,
  ) {}

  async listAgentDefinitions(supabase: SupabaseClient, userId: string, agentKey: string) {
    return this.missionsRepository.listAgentDefinitions(supabase, userId, agentKey)
  }

  async internalUpsertAgentDefinition(
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    fileName: string,
    content: string,
  ) {
    const supabase = this.missionAgentGatewayService.getServiceRoleClient()
    return this.missionsRepository.upsertAgentDefinition(
      supabase,
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
    const supabase = this.missionAgentGatewayService.getServiceRoleClient()
    const skill = await this.missionsRepository.internalUpsertAgentSkill(
      supabase,
      userId,
      orgId,
      agentKey,
      skillKey,
      name,
      description,
      markdownContent,
    )
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, agentKey, orgId)
      .catch(() => undefined)
    return skill
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
    const normalizedLevel = this.normalizeAgentLevel(level)
    const resolvedCapabilityProfile = this.normalizeCapabilityProfileForWrite(
      capabilityProfile || this.resolveCapabilityProfile(agentKey, role, normalizedLevel),
      agentKey,
      normalizedLevel,
    )
    const resolvedCapabilityDomain = this.normalizeCapabilityDomainForWrite(
      capabilityDomain || this.resolveCapabilityDomain(skillSeedKey || agentKey, role),
      skillSeedKey || agentKey,
      role,
    )

    const supabase = this.missionAgentGatewayService.getServiceRoleClient()
    const completeDefinitions =
      await this.missionAgentTemplateService.ensureDynamicAgentDefinitionPack(
        definitions,
        name,
        role,
        normalizedLevel,
      )
    const created = await this.missionsRepository.createAgentWithDefinitions(
      supabase,
      userId,
      orgId,
      agentKey,
      name,
      role,
      normalizedLevel,
      skills,
      null,
      completeDefinitions,
      {
        capability_profile: resolvedCapabilityProfile,
        capability_domain: resolvedCapabilityDomain,
      },
      specialty || null,
      teamId ?? null,
    )

    try {
      await this.finishAgentProvisioning(
        supabase,
        userId,
        orgId,
        agentKey,
        name,
        role,
        normalizedLevel,
        definitions,
        cloneSkillsFrom,
        cloneSkillKeys,
        skillSeedKey,
        resolvedCapabilityDomain,
      )
    } catch (err) {
      this.logger.warn(
        `Agent creation failed for ${agentKey}, cleaning up: ${(err as Error).message}`,
      )
      await this.missionsRepository
        .cleanupAgent(supabase, userId, agentKey, orgId)
        .catch((cleanupErr) =>
          this.logger.error(`Cleanup failed for ${agentKey}: ${(cleanupErr as Error).message}`),
        )
      throw err
    }

    this.missionAvatarService
      .generateAgentAvatar(userId, agentKey, name, role, orgId)
      .catch((e) =>
        this.logger.warn(`Avatar generation failed for ${agentKey}: ${(e as Error).message}`),
      )

    return created
  }

  private async finishAgentProvisioning(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    name: string,
    role: string,
    normalizedLevel: 'system' | 'c_level' | 'manager' | 'employee',
    definitions: Array<{ file_name: string; content: string }>,
    cloneSkillsFrom: string | undefined,
    cloneSkillKeys: string[] | undefined,
    skillSeedKey: string | undefined,
    resolvedCapabilityDomain: string,
  ) {
    await this.missionsRepository.updateAgentConfigPatch(
      supabase,
      userId,
      agentKey,
      {
        model_id: resolveDefaultAgentModel({ agentKey, role, skillSeedKey }),
      },
      orgId,
    )

    if (normalizedLevel === 'c_level' || normalizedLevel === 'manager') {
      await this.missionSkillSeederService.seedLeaderSkills(supabase, userId, agentKey, 'ceo')
    }
    await this.missionSkillSeederService.seedTemplateSkills(
      supabase,
      userId,
      agentKey,
      skillSeedKey || role,
      orgId,
    )
    await this.missionSkillSeederService.seedDomainSkills(
      supabase,
      userId,
      agentKey,
      resolvedCapabilityDomain,
      orgId,
    )

    if (cloneSkillsFrom && cloneSkillKeys?.length) {
      await this.missionSkillSeederService.cloneSelectedSkills(
        supabase,
        userId,
        cloneSkillsFrom,
        agentKey,
        cloneSkillKeys,
      )
    }

    await this.missionSkillSeederService.seedDefaultSkills(supabase, userId, agentKey, orgId)

    const synced = await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, agentKey, orgId)
      .catch(() => false)
    if (!synced) {
      throw new Error(`Agent "${agentKey}" created but sync failed`)
    }

    if (!orgId) {
      await this.missionAgentGatewayService
        .registerAgentInGateway(userId, agentKey, name, definitions)
        .catch((e) =>
          this.logger.warn(`Gateway registration failed for ${agentKey}: ${(e as Error).message}`),
        )
    }

    await this.missionsRepository.updateAgentSyncStatus(supabase, userId, agentKey, 'ready', orgId)
  }

  private normalizeAgentLevel(level: string): 'system' | 'c_level' | 'manager' | 'employee' {
    if (level === 'system' || level === 'c_level' || level === 'manager' || level === 'employee') {
      return level
    }
    throw new Error(`Invalid level "${level}". Allowed: system, c_level, manager, employee`)
  }

  private resolveCapabilityProfile(
    agentKey: string,
    _role: string,
    level: 'system' | 'c_level' | 'manager' | 'employee',
  ): string {
    if (agentKey === 'vibey') return 'vibey_ceo'
    if (agentKey === 'hr') return 'system_hr'
    if (agentKey === 'brain_scholar' || agentKey === 'atlas') return 'system_brain'
    if (agentKey === 'viktor' || agentKey === 'widget_builder') return 'system_builder'
    if (level === 'system') return 'system_hr'
    return 'managed_domain'
  }

  private resolveCapabilityDomain(agentKey: string, role: string): string {
    const key = agentKey.toLowerCase()
    const roleText = role.toLowerCase()
    if (
      [
        'copywriter',
        'designer',
        'media_producer',
        'brand_manager',
        'ads_manager',
        'strategist',
      ].includes(key) ||
      /(copywriter|designer|creative|brand|media|marketing|social|strategist|ads.?manager)/.test(
        roleText,
      )
    ) {
      return 'marketing'
    }
    if (['analyst', 'cfo'].includes(key) || /(analyst|finance|data|performance)/.test(roleText)) {
      return 'analyst'
    }
    if (
      ['developer', 'automation_integrations_engineer', 'qa_engineer', 'pm_product'].includes(
        key,
      ) ||
      /(developer|engineer|automation|integrations|qa|reliability|full-stack|full stack)/.test(
        roleText,
      )
    ) {
      return 'developer'
    }
    if (
      ['customer_support', 'customer_success', 'customer_coach'].includes(key) ||
      /(customer.?success|customer.?support|support.?agent|coach|mentor|client|help.?desk)/.test(
        roleText,
      )
    ) {
      return 'support'
    }
    if (
      ['pm_operations', 'product_manager'].includes(key) ||
      /(operations|project.?manag|coordinator|program.?manag)/.test(roleText)
    ) {
      return 'operations'
    }
    return 'operations'
  }

  private normalizeCapabilityProfileForWrite(
    profile: string,
    agentKey: string,
    level: 'system' | 'c_level' | 'manager' | 'employee',
  ): string {
    if (
      profile === 'vibey_ceo' ||
      profile === 'system_hr' ||
      profile === 'system_brain' ||
      profile === 'managed_domain'
    ) {
      return profile
    }
    if (
      profile === 'managed_employee' ||
      profile === 'managed_manager' ||
      profile === 'managed_c_level'
    ) {
      return 'managed_domain'
    }
    return this.resolveCapabilityProfile(agentKey, '', level)
  }

  private normalizeCapabilityDomainForWrite(
    domain: string,
    agentKey: string,
    role: string,
  ): string {
    if (domain === 'shared') return 'operations'
    if (
      domain === 'management' ||
      domain === 'marketing' ||
      domain === 'analyst' ||
      domain === 'developer' ||
      domain === 'operations' ||
      domain === 'support'
    ) {
      return domain
    }
    return this.resolveCapabilityDomain(agentKey, role)
  }
}
