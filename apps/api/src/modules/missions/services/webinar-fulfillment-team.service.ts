import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveDefaultAgentModel } from '../lib/agent-model-defaults'
import {
  extractFirstName,
  findAgentForWebinarRole,
  formatAgentNameRole,
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
  WEBINAR_FULFILLMENT_ROLE_KEYS,
  WEBINAR_ROLE_PREFERRED_FIRST_NAMES,
  type WebinarFulfillmentRoleKey,
} from '../lib/webinar-fulfillment-team'
import { MissionsPlanDecisionRepository } from '../repositories/missions-plan-decision.repository'
import { MissionsRepository } from '../repositories/missions.repository'
import { AgentOnboardingService } from './agent-onboarding.service'
import { MissionAgentGatewayService } from './gateways/mission-agent-gateway.service'
import { MissionSkillSeederService } from './skills/mission-skill-seeder.service'

export type EnsureWebinarTeamResult = {
  ok: true
  playbook_id: string
  campaign_id: string | null
  agents: Array<{
    role_key: WebinarFulfillmentRoleKey
    agent_key: string
    name: string
    created: boolean
    renamed: boolean
    assigned: boolean
    synced: boolean
  }>
}

@Injectable()
export class WebinarFulfillmentTeamService {
  private readonly logger = new Logger(WebinarFulfillmentTeamService.name)

  constructor(
    private readonly agentOnboardingService: AgentOnboardingService,
    private readonly missionsRepository: MissionsRepository,
    private readonly missionSkillSeederService: MissionSkillSeederService,
    private readonly missionAgentGatewayService: MissionAgentGatewayService,
    private readonly planDecisionRepository: MissionsPlanDecisionRepository = new MissionsPlanDecisionRepository(),
  ) {}

  supportsPlaybook(playbookId: string | null | undefined): boolean {
    return [
      WEBINAR_FULFILLMENT_PLAYBOOK_ID,
      'ads-research',
      'ig-organic-video-ad',
      'meta-ads-launch',
      'meta-ads-audit',
    ].includes(String(playbookId || '').trim())
  }

  async ensureTeam(
    supabase: SupabaseClient,
    userId: string,
    opts: { orgId?: string | null; campaignId?: string | null } = {},
  ): Promise<EnsureWebinarTeamResult> {
    const orgId = opts.orgId ?? null
    const campaignId = opts.campaignId ?? null
    const results: EnsureWebinarTeamResult['agents'] = []

    for (const roleKey of WEBINAR_FULFILLMENT_ROLE_KEYS) {
      const ensured = await this.ensureRole(supabase, userId, roleKey, orgId, campaignId)
      results.push(ensured)
    }

    return {
      ok: true,
      playbook_id: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
      campaign_id: campaignId,
      agents: results,
    }
  }

  private async ensureRole(
    supabase: SupabaseClient,
    userId: string,
    roleKey: WebinarFulfillmentRoleKey,
    orgId: string | null,
    campaignId: string | null,
  ): Promise<EnsureWebinarTeamResult['agents'][number]> {
    const template = await this.missionsRepository.getEmployeeTemplate(supabase, roleKey)
    if (!template) {
      throw new Error(`Unknown ready role: ${roleKey}`)
    }

    const templateRole = String(template.role || roleKey)
    const preferredFirst =
      WEBINAR_ROLE_PREFERRED_FIRST_NAMES[roleKey] || String(template.default_name || roleKey)
    const targetDisplayName = formatAgentNameRole(preferredFirst, templateRole)

    let created = false
    let agents = await this.missionsRepository.listOrgAgents(supabase, userId, orgId)
    let match = findAgentForWebinarRole(agents, roleKey, templateRole)

    if (!match) {
      const hired = await this.agentOnboardingService.hireReadyEmployee(
        supabase,
        userId,
        { role_key: roleKey, name: preferredFirst },
        orgId,
      )
      created = true
      const hiredKey = String(hired.agent?.agent_key || '')
      if (!hiredKey) throw new Error(`Hire succeeded without agent_key for ${roleKey}`)
      agents = await this.missionsRepository.listOrgAgents(supabase, userId, orgId)
      match = findAgentForWebinarRole(agents, roleKey, templateRole) ?? {
        agent_key: hiredKey,
        name: String(hired.agent?.name || preferredFirst),
        role: templateRole,
      }
    }

    let renamed = false
    if (match.name.trim() !== targetDisplayName) {
      await this.missionsRepository.renameAgent(
        supabase,
        userId,
        match.agent_key,
        targetDisplayName,
        orgId,
      )
      match = { ...match, name: targetDisplayName }
      renamed = true
    }

    let assigned = false
    if (campaignId) {
      await this.planDecisionRepository.upsertCampaignAgent(supabase, {
        campaign_id: campaignId,
        user_id: userId,
        org_id: orgId,
        agent_key: match.agent_key,
        name: match.name,
        status: 'idle',
      })
      assigned = true
    }

    const skillSeedKey = String(template.skill_seed_key || roleKey)
    await this.missionsRepository.updateAgentConfigPatch(
      supabase,
      userId,
      match.agent_key,
      {
        model_id: resolveDefaultAgentModel({
          agentKey: match.agent_key,
          role: templateRole,
          skillSeedKey,
        }),
      },
      orgId,
    )
    await this.missionSkillSeederService
      .seedTemplateSkills(supabase, userId, match.agent_key, skillSeedKey, orgId)
      .catch((e) =>
        this.logger.warn(
          `Template skill seed failed for ${match.agent_key}: ${(e as Error).message}`,
        ),
      )
    await this.missionSkillSeederService.seedDefaultSkills(supabase, userId, match.agent_key, orgId)

    const synced = await this.missionAgentGatewayService
      .triggerAgentSkillsSync(userId, match.agent_key, orgId)
      .catch((e) => {
        this.logger.warn(`Skill sync failed for ${match.agent_key}: ${(e as Error).message}`)
        return false
      })

    return {
      role_key: roleKey,
      agent_key: match.agent_key,
      name: match.name || formatAgentNameRole(extractFirstName(match.name), templateRole),
      created,
      renamed,
      assigned,
      synced: Boolean(synced),
    }
  }
}
