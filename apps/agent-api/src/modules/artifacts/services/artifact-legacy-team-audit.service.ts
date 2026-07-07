import { Injectable } from '@nestjs/common'
import { ArtifactLegacyTeamBrainRepository } from '../repositories/artifact-legacy-team-brain.repository'

@Injectable()
export class ArtifactLegacyTeamAuditService {
  constructor(
    private readonly repository: ArtifactLegacyTeamBrainRepository = new ArtifactLegacyTeamBrainRepository(),
  ) {}

  async hrListTeam(
    target: Record<string, any>,
    _input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const { data, error } = await this.repository.listTeamAgents(supabase, { userId, orgId })
    if (error) throw error
    return {
      success: true,
      team: (data ?? []).map((row) => ({
        agent_key: row.agent_key,
        name: row.name,
        role: row.role,
        level: row.level,
        skills: row.skills,
        status: row.status,
        specialty: (row as Record<string, unknown>).specialty ?? null,
        domain:
          ((row as Record<string, unknown>).config as Record<string, unknown> | null)
            ?.capability_domain ?? null,
      })),
    }
  }

  async auditTeamAgentsAndSkills(
    target: Record<string, any>,
    _input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const audit = await this.loadTeamSkillAudit(target, sessionKey)
    return {
      success: true,
      totals: audit.totals,
      agents: audit.agents,
      gaps: this.buildSkillCoverageGaps(audit.agents),
    }
  }

  async compareTeamSkillCoverage(
    target: Record<string, any>,
    _input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const audit = await this.loadTeamSkillAudit(target, sessionKey)
    const byDomain = new Map<string, typeof audit.agents>()
    for (const agent of audit.agents) {
      const key = agent.domain || 'unassigned'
      byDomain.set(key, [...(byDomain.get(key) ?? []), agent])
    }
    return {
      success: true,
      totals: audit.totals,
      coverage_by_domain: [...byDomain.entries()].map(([domain, agents]) => ({
        domain,
        agent_count: agents.length,
        skill_count: agents.reduce((sum, agent) => sum + agent.skill_count, 0),
        agents_without_skills: agents
          .filter((agent) => agent.skill_count === 0)
          .map((agent) => agent.agent_key),
        common_skill_keys: this.commonSkillKeys(agents),
      })),
      gaps: this.buildSkillCoverageGaps(audit.agents),
    }
  }

  async summarizeAgentCapabilities(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const audit = await this.loadTeamSkillAudit(target, sessionKey)
    const agentKey = this.normalizeAgentKey(input.agent_key)
    const agents = agentKey
      ? audit.agents.filter((agent) => agent.agent_key === agentKey)
      : audit.agents
    if (agentKey && agents.length === 0) {
      return { success: false, error: `Agent "${agentKey}" not found.` }
    }
    return {
      success: true,
      agents: agents.map((agent) => ({
        agent_key: agent.agent_key,
        name: agent.name,
        role: agent.role,
        level: agent.level,
        domain: agent.domain,
        specialty: agent.specialty,
        skill_count: agent.skill_count,
        capability_summary:
          agent.skill_count > 0
            ? agent.skills.map((skill) => skill.name || skill.skill_key).join(', ')
            : 'No enabled skills found.',
      })),
    }
  }

  private async loadTeamSkillAudit(target: Record<string, any>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const { data, error } = await this.repository.listTeamAgents(supabase, { userId, orgId })
    if (error) throw error
    const teamRows = data ?? []
    const agents = await Promise.all(
      teamRows.map(async (row) => {
        const agentKey = String(row.agent_key ?? '')
        const { data: skills, error: skillsError } = await this.repository.listAgentSkills(
          supabase,
          {
            userId,
            orgId,
            agentKey,
          },
        )
        if (skillsError) throw skillsError
        const enabledSkills = (skills ?? [])
          .filter((skill) => skill.skill_key !== 'vibey-api')
          .map((skill) => ({
            skill_key: skill.skill_key,
            name: skill.name,
            description: this.compactText(skill.description, 180),
          }))
        const config = (row.config as Record<string, unknown> | null) ?? {}
        return {
          agent_key: agentKey,
          name: String(row.name ?? agentKey),
          role: String(row.role ?? ''),
          level: String(row.level ?? ''),
          status: String(row.status ?? ''),
          specialty: typeof row.specialty === 'string' ? row.specialty : null,
          domain: typeof config.capability_domain === 'string' ? config.capability_domain : null,
          skill_count: enabledSkills.length,
          skills: enabledSkills,
        }
      }),
    )
    return {
      agents,
      totals: {
        agent_count: agents.length,
        skill_count: agents.reduce((sum, agent) => sum + agent.skill_count, 0),
        agents_without_skills: agents
          .filter((agent) => agent.skill_count === 0)
          .map((agent) => agent.agent_key),
      },
    }
  }

  private buildSkillCoverageGaps(
    agents: Array<{ agent_key: string; role: string; skill_count: number }>,
  ) {
    return agents
      .filter((agent) => agent.skill_count === 0)
      .map((agent) => ({
        agent_key: agent.agent_key,
        issue: 'no_enabled_skills',
        note: `${agent.role || agent.agent_key} has no enabled workflow skills.`,
      }))
  }

  private commonSkillKeys(agents: Array<{ skills: Array<{ skill_key: string }> }>): string[] {
    if (agents.length === 0) return []
    const [first, ...rest] = agents
    const common = new Set((first?.skills ?? []).map((skill) => skill.skill_key))
    for (const agent of rest) {
      const keys = new Set(agent.skills.map((skill) => skill.skill_key))
      for (const key of [...common]) {
        if (!keys.has(key)) common.delete(key)
      }
    }
    return [...common].sort()
  }

  private normalizeAgentKey(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  private compactText(value: string, maxLength: number): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value
  }
}
