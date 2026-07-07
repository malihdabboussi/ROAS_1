import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactLegacyTeamBrainRepository } from '../repositories/artifact-legacy-team-brain.repository'
import { inferCapabilityDomain } from './artifact-capability.policy'
import { ArtifactLegacyCampaignTeamService } from './artifact-legacy-campaign-team.service'
import {
  ArtifactLegacyRuntimeErrorService,
  formatArtifactThrownError,
} from './artifact-legacy-runtime-error.service'
import { ArtifactLegacyTeamAuditService } from './artifact-legacy-team-audit.service'
import { ArtifactLegacyTeamBrainMemoryService } from './artifact-legacy-team-brain-memory.service'

export { formatArtifactThrownError }

const PROTECTED_SYSTEM_AGENTS = new Set(['vibey', 'hr', 'brain_scholar', 'atlas', 'viktor'])

@Injectable()
export class ArtifactLegacyTeamBrainService {
  constructor(
    private readonly repository = new ArtifactLegacyTeamBrainRepository(),
    private readonly memoryService = new ArtifactLegacyTeamBrainMemoryService(repository),
    private readonly errorService = new ArtifactLegacyRuntimeErrorService(),
    private readonly campaignTeamService = new ArtifactLegacyCampaignTeamService(repository),
    private readonly teamAuditService = new ArtifactLegacyTeamAuditService(repository),
  ) {}

  async hrListTeam(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.teamAuditService.hrListTeam(target, input, sessionKey)
  }

  async auditTeamAgentsAndSkills(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.teamAuditService.auditTeamAgentsAndSkills(target, input, sessionKey)
  }

  async compareTeamSkillCoverage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.teamAuditService.compareTeamSkillCoverage(target, input, sessionKey)
  }

  async summarizeAgentCapabilities(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.teamAuditService.summarizeAgentCapabilities(target, input, sessionKey)
  }

  async hrGetAgent(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const rawAgentKey = String(input.agent_key ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
    if (!rawAgentKey) return { success: false, error: 'agent_key is required' }

    if (PROTECTED_SYSTEM_AGENTS.has(rawAgentKey)) {
      return {
        success: false,
        error: 'System agents cannot be inspected. They are managed by the platform.',
      }
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined

    const { data: agent, error: agentErr } = await this.repository.findAgentProfile(supabase, {
      userId,
      orgId,
      agentKey: rawAgentKey,
    })
    if (agentErr) throw agentErr
    if (!agent) return { success: false, error: `Agent "${rawAgentKey}" not found.` }

    const config = (agent.config as Record<string, unknown>) ?? {}

    const { data: defs } = await this.repository.listAgentDefinitions(supabase, {
      userId,
      orgId,
      agentKey: rawAgentKey,
    })

    const fileMap = new Map<string, string>()
    for (const d of (defs ?? []) as Array<{ file_name: string; content: string }>) {
      fileMap.set(d.file_name, d.content)
    }

    const discProfile = this.extractDiscProfile(fileMap.get('SOUL.md'))
    const values = this.extractValues(fileMap.get('SOUL.md'))
    const purpose = this.extractPurpose(fileMap.get('ROLE.md'))
    const commStyle = this.extractCommunicationStyle(fileMap.get('IDENTITY.md'))
    const tagline = this.extractTagline(fileMap.get('IDENTITY.md'))

    const { data: skills } = await this.repository.listAgentSkills(supabase, {
      userId,
      orgId,
      agentKey: rawAgentKey,
    })

    return {
      success: true,
      agent: {
        agent_key: agent.agent_key,
        name: agent.name,
        role: agent.role,
        level: agent.level,
        specialty: (agent as Record<string, unknown>).specialty ?? null,
        status: agent.status,
        domain: (config.capability_domain as string) ?? null,
        disc_profile: discProfile,
        purpose,
        tagline,
        communication_style: commStyle,
        values,
        skills: ((skills ?? []) as Array<{ skill_key: string; name: string; description: string }>)
          .filter((s) => s.skill_key !== 'vibey-api')
          .map((s) => ({ skill_key: s.skill_key, name: s.name, description: s.description })),
      },
    }
  }

  private extractDiscProfile(soulContent?: string): string | null {
    if (!soulContent) return null
    const match =
      soulContent.match(/DISC\s+Profile[:\s]*([A-Z]\/[A-Z])\s*\(([^)]+)\)/i) ??
      soulContent.match(/DISC\s+Profile[:\s]*([A-Z]\/[A-Z])/i)
    return match ? (match[2] ? `${match[1]} (${match[2]})` : match[1]) : null
  }

  private extractValues(soulContent?: string): string[] | null {
    if (!soulContent) return null
    const section = soulContent.match(/##\s*Values[\s\S]*?(?=\n##|\n<|$)/i)
    if (!section) return null
    const items = section[0].match(/\d+\.\s*\*\*([^*]+)\*\*/g)
    if (!items || items.length === 0) return null
    return items.map((item) =>
      item
        .replace(/\d+\.\s*\*\*/, '')
        .replace(/\*\*/, '')
        .trim(),
    )
  }

  private extractPurpose(roleContent?: string): string | null {
    if (!roleContent) return null
    const section = roleContent.match(/##\s*Purpose\s*\n+([\s\S]*?)(?=\n##|$)/i)
    if (!section) return null
    return section[1].trim().split('\n')[0].trim() || null
  }

  private extractCommunicationStyle(identityContent?: string): Record<string, string> | null {
    if (!identityContent) return null
    const style: Record<string, string> = {}
    const toneMatch = identityContent.match(/\*\*Tone:\*\*\s*(.+)/i)
    if (toneMatch) style.tone = toneMatch[1].trim()
    const emojiMatch = identityContent.match(/\*\*Emojis?:\*\*\s*(.+)/i)
    if (emojiMatch) style.emojis = emojiMatch[1].trim()
    const humorMatch = identityContent.match(/\*\*Humor:\*\*\s*(.+)/i)
    if (humorMatch) style.humor = humorMatch[1].trim()
    return Object.keys(style).length > 0 ? style : null
  }

  private extractTagline(identityContent?: string): string | null {
    if (!identityContent) return null
    const match = identityContent.match(/\*\*Tagline:\*\*\s*(.+)/i)
    return match ? match[1].trim() : null
  }

  async listCampaignTeam(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.campaignTeamService.listCampaignTeam(target, input, sessionKey)
  }

  async assignAgentToCampaign(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.campaignTeamService.assignAgentToCampaign(target, input, sessionKey)
  }

  async unassignAgentFromCampaign(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.campaignTeamService.unassignAgentFromCampaign(target, input, sessionKey)
  }

  async hrCreateAgent(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const {
      agent_key,
      name,
      role,
      level,
      team_id,
      skills,
      soul,
      role_content,
      identity,
      clone_skills_from,
      skill_seed_key,
      specialty,
    } = input as Record<string, string>
    const cloneSkillKeys = input.clone_skill_keys as string[] | undefined

    if (!agent_key || !name || !role) {
      return { success: false, error: 'agent_key, name, and role are required' }
    }

    const userId = target.resolveUserId(sessionKey)
    const internalToken = (target.config.get('INTERNAL_API_TOKEN') as string | undefined) || ''
    const apiBase =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'

    const definitions: Array<{ file_name: string; content: string }> = []
    if (soul) definitions.push({ file_name: 'SOUL.md', content: soul })
    if (role_content) definitions.push({ file_name: 'ROLE.md', content: role_content })
    if (identity) definitions.push({ file_name: 'IDENTITY.md', content: identity })

    const normalizedAgentKey = String(agent_key)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')

    const hireOrgId =
      typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null
    if (hireOrgId) {
      const orgRole = await this.resolveOrgRole(target, userId, hireOrgId)
      if (!this.canCreateAgentsWithRole(orgRole)) {
        return {
          success: false,
          error: 'Only creators, admins, or owners can create agents in this workspace.',
        }
      }
      const requestedLevel = String(level || 'employee')
      if (requestedLevel === 'c_level') {
        return {
          success: false,
          error: 'C-level agents are platform-managed and cannot be created from HR.',
        }
      }
      if (requestedLevel === 'manager' && !this.isOrgAdminRole(orgRole)) {
        return {
          success: false,
          error: 'Only admins can create manager agents.',
        }
      }
      if (!this.isOrgAdminRole(orgRole)) {
        const selectedTeamId = typeof team_id === 'string' ? team_id.trim() : ''
        if (!selectedTeamId) {
          return {
            success: false,
            error:
              'Pick a team before creating this agent. Creators can only create inside teams they belong to.',
          }
        }
        const isMember = await this.isAgentTeamMember(target, userId, selectedTeamId)
        if (!isMember) {
          return {
            success: false,
            error: 'You can only create agents inside teams you belong to.',
          }
        }
      }
    }
    const payload: Record<string, unknown> = {
      user_id: userId,
      org_id: hireOrgId ?? null,
      agent_key: normalizedAgentKey,
      name,
      role,
      level: level || 'employee',
      capability_profile: this.resolveCapabilityProfileForCreate(
        normalizedAgentKey,
        (level as string) || 'employee',
      ),
      capability_domain: this.resolveCapabilityDomainForCreate(
        target,
        normalizedAgentKey,
        role,
        skill_seed_key,
      ),
      skills: Array.isArray(skills)
        ? skills
        : skills
          ? String(skills)
              .split(',')
              .map((s: string) => s.trim())
          : [],
      definitions,
    }
    if (team_id) payload.team_id = team_id
    if (clone_skills_from) payload.clone_skills_from = clone_skills_from
    if (Array.isArray(cloneSkillKeys) && cloneSkillKeys.length > 0)
      payload.clone_skill_keys = cloneSkillKeys
    if (skill_seed_key) payload.skill_seed_key = skill_seed_key
    if (specialty) payload.specialty = specialty

    const supabase = await target.getUserClient(userId, sessionKey as string)
    const existingLookup = await this.findAgentRegistryRowInScope(
      supabase,
      userId,
      hireOrgId ?? null,
      normalizedAgentKey,
    )
    if (existingLookup.error) {
      return {
        success: false,
        error: `Agent lookup failed: ${existingLookup.error.message}`,
      }
    }
    if (existingLookup.data?.agent_key) {
      return {
        success: true,
        existing: true,
        agent: existingLookup.data,
        message: `${name} is already hired and ready to work.`,
      }
    }

    const res = await fetch(`${apiBase}/api/internal/agents/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalToken}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { success: false, error: `Failed to create agent: ${text || res.status}` }
    }

    const agent = await res.json()
    const persistedLookup = await this.findAgentRegistryRowInScope(
      supabase,
      userId,
      hireOrgId ?? null,
      normalizedAgentKey,
    )
    if (persistedLookup.error) {
      return {
        success: false,
        error: `Agent created but verification failed: ${persistedLookup.error.message}`,
      }
    }
    if (!persistedLookup.data?.agent_key) {
      return { success: false, error: 'Agent created but not yet available. Please try again.' }
    }
    return { success: true, agent, message: `${name} has been hired and is ready to work.` }
  }

  private async findAgentRegistryRowInScope(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
  ): Promise<{ data: { agent_key: string } | null; error: { message: string } | null }> {
    const { data, error } = await this.repository.findAgentRegistryRowInScope(supabase, {
      userId,
      orgId,
      agentKey,
    })
    if (error) return { data: null, error: { message: error.message } }
    return {
      data: data?.agent_key ? { agent_key: String(data.agent_key) } : null,
      error: null,
    }
  }

  async hrUpdateAgent(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { agent_key, name, role, soul, role_content, identity, change_summary } = input as Record<
      string,
      string
    >
    if (!agent_key) return { success: false, error: 'agent_key is required' }

    const normalizedAgentKey = String(agent_key)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
    if (PROTECTED_SYSTEM_AGENTS.has(normalizedAgentKey)) {
      return { success: false, error: 'System agents cannot be updated through this action.' }
    }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const preSnapshot =
      typeof target.captureAgentCheckpointSnapshot === 'function'
        ? await target.captureAgentCheckpointSnapshot(userId, orgId ?? null, normalizedAgentKey)
        : null

    const { data: agent, error: agentErr } = await this.repository.findAgentForUpdate(supabase, {
      userId,
      orgId,
      agentKey: normalizedAgentKey,
    })
    if (agentErr) throw agentErr
    if (!agent) return { success: false, error: `Agent "${normalizedAgentKey}" not found.` }

    if (orgId) {
      const canManage = await this.canManageAgent(supabase, userId, orgId, normalizedAgentKey)
      if (!canManage) {
        return {
          success: false,
          error: 'Only admins or members of this agent’s team can update it.',
        }
      }
    }

    const hasUpdate = name || role || soul || role_content || identity
    if (!hasUpdate) {
      return {
        success: false,
        error: 'Provide at least one field to update (name, role, soul, role_content, identity).',
      }
    }

    const files: Array<{ file_name: string; content: string }> = []
    if (soul) files.push({ file_name: 'SOUL.md', content: soul })
    if (role_content) files.push({ file_name: 'ROLE.md', content: role_content })
    if (identity) files.push({ file_name: 'IDENTITY.md', content: identity })

    const internalToken = (target.config.get('INTERNAL_API_TOKEN') as string | undefined) || ''
    const apiBase =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'

    for (const file of files) {
      const res = await fetch(
        `${apiBase}/api/internal/agents/${normalizedAgentKey}/definitions/${file.file_name}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${internalToken}`,
          },
          body: JSON.stringify({ user_id: userId, org_id: orgId ?? null, content: file.content }),
        },
      )
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return {
          success: false,
          error: `Failed to update ${file.file_name}: ${text || res.status}`,
        }
      }
    }

    if (name || role) {
      const updates: Record<string, string> = {}
      if (name) updates.name = name
      if (role) updates.role = role
      await this.repository.updateAgentRegistry(supabase, {
        userId,
        orgId,
        agentKey: normalizedAgentKey,
        updates,
      })
    }

    const agentApiPort = process.env.PORT ?? '3003'
    await fetch(`http://localhost:${agentApiPort}/api/agents/${normalizedAgentKey}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-openclaw-internal': 'true' },
      body: JSON.stringify({ user_id: userId, ...(orgId ? { org_id: orgId } : {}) }),
    }).catch(() => {})

    if (typeof target.recordAgentCheckpointMutation === 'function') {
      await target.recordAgentCheckpointMutation(
        sessionKey,
        normalizedAgentKey,
        change_summary,
        preSnapshot,
      )
    }

    return {
      success: true,
      agent_key: normalizedAgentKey,
      files_updated: files.length,
      message: `Agent "${agent.name}" has been updated.`,
    }
  }

  async saveMemory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.memoryService.saveMemory(target, input, sessionKey)
  }

  async searchMemory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.memoryService.searchMemory(target, input, sessionKey)
  }

  async logError(target: Record<string, any>, action: string, error: unknown, sessionKey?: string) {
    return this.errorService.logError(target, action, error, sessionKey)
  }

  resolveCreditAwareError(error: unknown): string | null {
    return this.errorService.resolveCreditAwareError(error)
  }

  private resolveCapabilityProfileForCreate(agentKey: string, level: string): string {
    if (agentKey === 'vibey') return 'vibey_ceo'
    if (agentKey === 'hr') return 'system_hr'
    if (agentKey === 'brain_scholar' || agentKey === 'atlas') return 'system_brain'
    if (agentKey === 'viktor' || agentKey === 'widget_builder') return 'system_builder'
    if (level === 'system') return 'system_hr'
    return 'managed_domain'
  }

  private resolveCapabilityDomainForCreate(
    _target: Record<string, any>,
    agentKey: string,
    role: string | undefined,
    skillSeedKey: string | undefined,
  ): string {
    return inferCapabilityDomain(skillSeedKey || agentKey, role ?? '') ?? 'operations'
  }

  private async resolveOrgRole(
    target: Record<string, any>,
    userId: string,
    orgId: string,
  ): Promise<string | null> {
    const { data } = await this.repository.findOrgMemberRole(target.serviceClient, {
      userId,
      orgId,
    })
    return (data?.role as string | null | undefined) ?? null
  }

  private isOrgAdminRole(role: string | null): boolean {
    return role === 'owner' || role === 'admin'
  }

  private canCreateAgentsWithRole(role: string | null): boolean {
    return role === 'owner' || role === 'admin' || role === 'creator'
  }

  private async isAgentTeamMember(
    target: Record<string, any>,
    userId: string,
    teamId: string,
  ): Promise<boolean> {
    const { data } = await this.repository.findAgentTeamMembership(target.serviceClient, {
      userId,
      teamId,
    })
    return !!data
  }

  private async canManageAgent(
    supabase: { rpc: Function },
    userId: string,
    orgId: string | null,
    agentKey: string,
  ): Promise<boolean> {
    const { data, error } = await this.repository.canManageAgent(supabase, {
      userId,
      orgId,
      agentKey,
    })
    if (error) throw error
    return data === true
  }
}
