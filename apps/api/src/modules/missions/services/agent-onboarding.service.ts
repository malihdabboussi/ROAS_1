import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SYSTEM_AGENT_FIXED_KEYS } from '../lib/system-agent-keys'
import { MissionsRepository } from '../repositories/missions.repository'
import {
  deriveAgentKey,
  hasBrainScholarEmployee,
  hasWidgetBuilderEmployee,
  normalizeStyle,
  normalizeTemplateProfile,
  resolveCapabilityDomain,
  resolveCapabilityProfile,
  styleDescription,
  styleLabel,
} from './agent-onboarding-profile'
import { MissionAgentGatewayService } from './gateways/mission-agent-gateway.service'
import { MissionAvatarService } from './media/mission-avatar.service'
import { MissionSkillSeederService } from './skills/mission-skill-seeder.service'
import { AgentTemplateCatalogSeederService } from './templates/agent-template-catalog-seeder.service'
import { MissionAgentTemplateService } from './templates/mission-agent-template.service'

export { isSystemAgentKey, SYSTEM_AGENT_KEYS } from '../lib/system-agent-keys'

@Injectable()
export class AgentOnboardingService {
  private readonly logger = new Logger(AgentOnboardingService.name)

  constructor(
    private readonly missionsRepository: MissionsRepository,
    private readonly missionAgentGatewayService: MissionAgentGatewayService,
    private readonly missionAgentTemplateService: MissionAgentTemplateService,
    private readonly agentTemplateCatalogSeederService: AgentTemplateCatalogSeederService,
    private readonly missionSkillSeederService: MissionSkillSeederService,
    private readonly missionAvatarService: MissionAvatarService,
  ) {}

  async generateOnboardingAvatar(userId: string): Promise<{ url: string } | null> {
    return this.missionAvatarService.generateOnboardingAvatar(userId)
  }

  async listReadyEmployeeLibrary(supabase: SupabaseClient) {
    const templates = await this.missionsRepository.listEmployeeTemplates(supabase)
    if (!templates.length) return []

    const seedKeys = [...new Set(templates.map((row) => String(row.skill_seed_key).trim()))]
    const skillsByTemplate = new Map<
      string,
      Array<{ skill_key: string; name: string; description: string }>
    >()

    await Promise.all(
      seedKeys.map(async (seedKey) => {
        const skills = await this.missionsRepository.listTemplateSkills(supabase, seedKey)
        skillsByTemplate.set(
          seedKey,
          skills.map((skill) => ({
            skill_key: String(skill.skill_key),
            name: String(skill.name),
            description: String(skill.description),
          })),
        )
      }),
    )

    return templates.map((template) => {
      const profile = normalizeTemplateProfile(template)
      return {
        ...profile,
        skill_profiles: skillsByTemplate.get(profile.skill_seed_key) ?? [],
      }
    })
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
    const shouldAutoHireWidgetBuilder = opts.auto_hire_widget_builder === true
    const existing = await this.missionsRepository.listOrgAgents(supabase, userId, orgId)
    const serviceSupabase = this.missionAgentGatewayService.getServiceRoleClient()

    const vibeyRow = (await this.missionsRepository
      .findScopedAgentRegistryRow(serviceSupabase, userId, 'vibey', orgId, 'level, config')
      .catch(() => null)) as { level?: string | null; config?: unknown } | null

    const vibeyConfig = (vibeyRow?.config ?? {}) as Record<string, unknown>
    if (vibeyRow?.level === 'c_level' && vibeyConfig.archetype) {
      this.logger.log(
        `User ${userId} already onboarded (Vibey is c_level with archetype) — ensuring sub-agents`,
      )
      await Promise.all([
        this.missionSkillSeederService
          .seedHrAgent(serviceSupabase, userId, orgId)
          .catch((e) => this.logger.warn(`HR backfill on re-entry: ${(e as Error).message}`)),
        this.ensureBrainScholarEmployee(supabase, userId, existing, orgId).catch((e) =>
          this.logger.warn(`Sub-agent backfill on re-entry: ${(e as Error).message}`),
        ),
      ])
      return { ok: true, agent: vibeyRow, skipped: true }
    }

    const normalizedArchetype = 'ceo'
    const role = 'CEO'
    const styleKey = normalizeStyle(opts.style ?? opts.tone)
    const avatarMode = opts.avatar_mode === 'portrait' ? 'portrait' : 'animation'
    const resolvedStyleLabel = styleLabel(styleKey)
    const resolvedStyleDescription = styleDescription(styleKey)
    await this.agentTemplateCatalogSeederService.ensureSeeded(serviceSupabase)

    await this.missionsRepository.ensureVibeyRegistryRow(serviceSupabase, userId, orgId, {
      archetype: 'ceo',
      capability_profile: 'vibey_ceo',
      capability_domain: 'management',
      model_id: 'auto',
    })
    const capabilityProfile = 'vibey_ceo'
    const capabilityDomain = 'shared'

    const agent = await this.missionsRepository.updateAgentConfigPatch(
      serviceSupabase,
      userId,
      'vibey',
      {
        style: styleKey,
        style_label: resolvedStyleLabel,
        style_description: resolvedStyleDescription,
        archetype: normalizedArchetype,
        avatar_mode: avatarMode,
        needs_onboarding_chat: true,
        model_id: 'auto',
        capability_profile: capabilityProfile,
        capability_domain: capabilityDomain,
      },
      orgId,
      { ignoreLookupError: true },
    )

    await this.missionsRepository.updateAgentRegistryFields(
      serviceSupabase,
      userId,
      'vibey',
      {
        name: 'Vibey',
        role,
        level: 'c_level',
        ...(avatarMode === 'animation' ? { image_url: null } : {}),
        ...(avatarMode === 'portrait' && opts.avatar_url ? { image_url: opts.avatar_url } : {}),
      },
      orgId,
      'Failed to promote Vibey during onboarding',
    )

    if (avatarMode === 'portrait' && !opts.avatar_url) {
      this.missionAvatarService
        .generateAgentAvatar(userId, 'vibey', 'Vibey', role, orgId)
        .catch((e) => this.logger.warn(`Vibey avatar generation failed: ${(e as Error).message}`))
    }

    await Promise.all([
      this.missionSkillSeederService.seedHrAgent(serviceSupabase, userId, orgId),
      this.missionSkillSeederService.seedLeaderSkills(
        serviceSupabase,
        userId,
        'vibey',
        normalizedArchetype,
      ),
      this.missionSkillSeederService.seedDefaultSkills(serviceSupabase, userId, 'vibey', orgId),
      shouldAutoHireWidgetBuilder
        ? this.ensureWidgetBuilderEmployee(supabase, userId, existing, orgId)
        : Promise.resolve(),
      this.ensureBrainScholarEmployee(supabase, userId, existing, orgId),
    ])

    this.triggerPostOnboardingRuntimeSync(userId, orgId ?? null, shouldAutoHireWidgetBuilder)

    this.missionAvatarService
      .generateAgentAvatar(userId, 'hr', 'Jaime', 'HR Manager', orgId)
      .catch((e) => this.logger.warn(`HR avatar generation failed: ${(e as Error).message}`))

    const vibey = await this.missionsRepository
      .findScopedAgentRegistryRow(serviceSupabase, userId, 'vibey', orgId)
      .catch(() => null)

    return { ok: true, agent: vibey ?? agent }
  }

  async hireReadyEmployee(
    supabase: SupabaseClient,
    userId: string,
    opts: { role_key: string; name?: string; team_id?: string | null },
    orgId?: string | null,
  ) {
    const template = await this.missionsRepository.getEmployeeTemplate(supabase, opts.role_key)
    const profile = template ? normalizeTemplateProfile(template) : null
    if (!profile) {
      throw new Error(`Unknown ready role: ${opts.role_key}`)
    }

    const serviceSupabase = this.missionAgentGatewayService.getServiceRoleClient()
    await this.agentTemplateCatalogSeederService.ensureSeeded(serviceSupabase)
    const requestedName = (opts.name || '').trim()
    const pool = profile.name_pool?.length ? profile.name_pool : [profile.default_name]
    const finalName = requestedName || pool[Math.floor(Math.random() * pool.length)]!
    const fixedKey = SYSTEM_AGENT_FIXED_KEYS[opts.role_key]
    const baseKey = fixedKey ?? deriveAgentKey(finalName)
    const agentKey =
      fixedKey ??
      (await this.missionsRepository.ensureUniqueAgentKey(serviceSupabase, userId, baseKey, orgId))
    const rawDefinitions = await this.missionAgentTemplateService.loadTemplatePack(
      serviceSupabase,
      profile.template_key,
    )
    const definitions = await this.missionAgentTemplateService.ensureDynamicAgentDefinitionPack(
      rawDefinitions,
      finalName,
      profile.role,
      profile.level,
    )
    const capabilityProfile = resolveCapabilityProfile(agentKey, profile.role, profile.level)
    const capabilityDomain = resolveCapabilityDomain(
      profile.skill_seed_key || agentKey,
      profile.role,
    )

    const created = await this.missionsRepository.createAgentWithDefinitions(
      serviceSupabase,
      userId,
      orgId ?? null,
      agentKey,
      finalName,
      profile.role,
      profile.level,
      profile.skills,
      null,
      definitions,
      { capability_profile: capabilityProfile, capability_domain: capabilityDomain },
      profile.specialty || null,
      opts.team_id ?? null,
    )

    try {
      await this.missionsRepository.updateAgentConfigPatch(
        serviceSupabase,
        userId,
        agentKey,
        { model_id: 'auto' },
        orgId,
      )

      await this.missionSkillSeederService.seedTemplateSkills(
        serviceSupabase,
        userId,
        agentKey,
        profile.skill_seed_key,
        orgId,
      )
      await this.missionSkillSeederService.seedDomainSkills(
        serviceSupabase,
        userId,
        agentKey,
        capabilityDomain,
        orgId,
      )
      await this.missionSkillSeederService.seedDefaultSkills(
        serviceSupabase,
        userId,
        agentKey,
        orgId,
      )

      const hireSyncOk = await this.missionAgentGatewayService
        .triggerAgentSkillsSync(userId, agentKey, orgId)
        .catch((e) => {
          this.logger.warn(`Skill sync failed for ${agentKey}: ${(e as Error).message}`)
          return false
        })
      if (!hireSyncOk) {
        throw new Error(`Agent "${agentKey}" created but sync failed`)
      }

      if (!orgId) {
        await this.missionAgentGatewayService
          .registerAgentInGateway(userId, agentKey, finalName, definitions)
          .catch((e) =>
            this.logger.warn(
              `Gateway registration failed for ${agentKey}: ${(e as Error).message}`,
            ),
          )
      }

      await this.missionsRepository.updateAgentSyncStatus(
        serviceSupabase,
        userId,
        agentKey,
        'ready',
        orgId,
      )
    } catch (err) {
      this.logger.warn(`Hire failed for ${agentKey}, cleaning up: ${(err as Error).message}`)
      await this.missionsRepository
        .cleanupAgent(serviceSupabase, userId, agentKey, orgId)
        .catch((cleanupErr) =>
          this.logger.error(`Cleanup failed for ${agentKey}: ${(cleanupErr as Error).message}`),
        )
      throw err
    }

    this.missionAvatarService
      .generateAgentAvatar(userId, agentKey, finalName, profile.role, orgId)
      .catch((e) =>
        this.logger.warn(`Avatar generation failed for ${agentKey}: ${(e as Error).message}`),
      )

    return { ok: true, role_key: profile.role_key, agent: created }
  }

  async backfillWidgetBuilderEmployee(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ) {
    const existing = await this.missionsRepository.listOrgAgents(supabase, userId, orgId)
    const alreadyPresent = hasWidgetBuilderEmployee(existing)
    if (alreadyPresent) {
      return { ok: true, created: false, message: 'Widget builder already exists' }
    }
    await this.ensureWidgetBuilderEmployee(supabase, userId, existing, orgId)
    return { ok: true, created: true }
  }

  private async ensureWidgetBuilderEmployee(
    supabase: SupabaseClient,
    userId: string,
    preloadedAgents?: Array<{
      agent_key?: string | null
      role?: string | null
      skills?: string[] | null
    }>,
    orgId?: string | null,
  ) {
    const existing =
      preloadedAgents ?? (await this.missionsRepository.listOrgAgents(supabase, userId, orgId))
    if (hasWidgetBuilderEmployee(existing)) return
    await this.hireReadyEmployee(
      supabase,
      userId,
      { role_key: 'widget_builder', name: 'Viktor' },
      orgId,
    )
  }

  private async ensureBrainScholarEmployee(
    supabase: SupabaseClient,
    userId: string,
    preloadedAgents?: Array<{ role?: string | null; skills?: string[] | null }>,
    orgId?: string | null,
  ) {
    const existing =
      preloadedAgents ?? (await this.missionsRepository.listOrgAgents(supabase, userId, orgId))
    const hasScholar = hasBrainScholarEmployee(existing)
    if (hasScholar) return
    await this.hireReadyEmployee(
      supabase,
      userId,
      { role_key: 'brain_scholar', name: 'Atlas' },
      orgId,
    )
  }

  private triggerPostOnboardingRuntimeSync(
    userId: string,
    orgId: string | null,
    includeWidgetBuilder: boolean,
  ): void {
    const requiredAgents = ['vibey', 'hr', 'atlas']
    if (includeWidgetBuilder) requiredAgents.push('viktor')

    Promise.allSettled([
      ...requiredAgents.map((agentKey) =>
        this.missionAgentGatewayService.triggerAgentSkillsSync(userId, agentKey, orgId),
      ),
      this.missionAgentGatewayService.triggerFullSync(userId),
    ]).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected').length
      if (failed > 0) {
        this.logger.warn(`Post-onboarding runtime sync had ${failed} failed task(s)`)
      }
    })
  }

  async backfillBrainScholarEmployee(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ) {
    const existing = await this.missionsRepository.listOrgAgents(supabase, userId, orgId)
    const alreadyPresent = hasBrainScholarEmployee(existing)
    if (alreadyPresent) {
      return { ok: true, created: false, message: 'Brain scholar already exists' }
    }
    await this.ensureBrainScholarEmployee(supabase, userId, existing, orgId)
    return { ok: true, created: true }
  }

  async backfillSystemAgentsForManagedUsers(supabase: SupabaseClient) {
    let managedUsers: Array<{ user_id: string | null; org_id: string | null }>
    try {
      managedUsers = await this.missionsRepository.listManagedVibeyOwnerScopes(supabase)
    } catch (error) {
      return { ok: false, error: (error as Error).message }
    }

    const results: Array<{
      user_id: string | null
      org_id: string | null
      atlas: boolean
    }> = []
    for (const row of managedUsers) {
      const userId = row.user_id ? String(row.user_id) : null
      const orgId = row.org_id ? String(row.org_id) : null
      const existing = await this.missionsRepository.listOrgAgents(supabase, userId ?? '', orgId)
      let createdAtlas = false

      if (!hasBrainScholarEmployee(existing)) {
        await this.ensureBrainScholarEmployee(supabase, userId ?? '', existing, orgId).catch((e) =>
          this.logger.warn(
            `Atlas backfill failed for user=${userId} org=${orgId}: ${(e as Error).message}`,
          ),
        )
        createdAtlas = true
      }

      if (createdAtlas) {
        results.push({ user_id: userId, org_id: orgId, atlas: createdAtlas })
      }
    }

    return { ok: true, backfilled: results.length, results }
  }
}
