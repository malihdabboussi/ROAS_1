import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { AgentTeamRuntimeRepository } from '../repositories/agent-team-runtime.repository'
import { AgentTeamsRepository } from '../repositories/agent-teams.repository'
import {
  type AgentOverride,
  type AgentOverrideMode,
  type AgentTeam,
  type AgentTeamGrant,
  type AgentTeamMember,
  type AgentTeamWithCounts,
  type ResolvedAgentPolicy,
} from '../types'
import { AgentPolicyService } from './agent-policy.service'
import { AgentTeamPolicyWorkflowService } from './agent-team-policy-workflow.service'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

function toScope(scope: RequestScope): ScopeKey {
  return { orgId: scope.orgId, userId: scope.userId }
}

@Injectable()
export class AgentTeamsService {
  private readonly logger = new Logger(AgentTeamsService.name)

  constructor(
    private readonly repo: AgentTeamsRepository,
    private readonly policy: AgentPolicyService,
    private readonly policyWorkflow: AgentTeamPolicyWorkflowService,
    private readonly runtimeRepo: AgentTeamRuntimeRepository,
  ) {}

  async listTeams(supabase: SupabaseClient, scope: RequestScope): Promise<AgentTeamWithCounts[]> {
    return this.repo.listTeams(supabase, toScope(scope))
  }

  async createTeam(
    supabase: SupabaseClient,
    scope: RequestScope,
    payload: {
      name: string
      color?: string
      icon?: string
      parent_team_id?: string | null
    },
  ): Promise<AgentTeam> {
    const trimmed = payload.name?.trim()
    if (!trimmed) throw new BadRequestException('Team name required')
    const team = await this.repo.createTeam(supabase, toScope(scope), { ...payload, name: trimmed })
    this.logger.log(
      `[audit] team.create id=${team.id} name="${team.name}" scope=${scope.orgId ? `org:${scope.orgId}` : `user:${scope.userId}`} actor=${scope.userId}`,
    )
    return team
  }

  async updateTeam(
    supabase: SupabaseClient,
    scope: RequestScope,
    teamId: string,
    patch: {
      name?: string
      color?: string
      icon?: string
      parent_team_id?: string | null
    },
  ): Promise<AgentTeam> {
    const existing = await this.repo.getTeamById(supabase, teamId, toScope(scope))
    if (!existing) throw new NotFoundException('Team not found')
    if (existing.is_system) {
      // System teams (General, Management) cannot be renamed or re-parented.
      // Color and icon stay editable so users can theme them.
      const safe: typeof patch = {}
      if (patch.color !== undefined) safe.color = patch.color
      if (patch.icon !== undefined) safe.icon = patch.icon
      if (
        (patch.name !== undefined && patch.name.trim() !== existing.name) ||
        patch.parent_team_id !== undefined
      ) {
        throw new ForbiddenException('System teams cannot be renamed or re-parented')
      }
      const next = await this.repo.updateTeam(supabase, teamId, toScope(scope), safe)
      this.policy.bustTeam(teamId)
      await this.notifyPolicyInvalidate(supabase, scope, { teamId })
      this.logger.log(
        `[audit] team.update id=${teamId} system patch=${JSON.stringify(safe)} actor=${scope.userId}`,
      )
      return next
    }
    const next = await this.repo.updateTeam(supabase, teamId, toScope(scope), patch)
    this.policy.bustTeam(teamId)
    await this.notifyPolicyInvalidate(supabase, scope, { teamId })
    this.logger.log(
      `[audit] team.update id=${teamId} patch=${JSON.stringify(patch)} actor=${scope.userId}`,
    )
    return next
  }

  async deleteTeam(
    supabase: SupabaseClient,
    scope: RequestScope,
    teamId: string,
  ): Promise<{ deleted: true; reassigned_to_team_id: string | null }> {
    const result = await this.repo.deleteTeam(supabase, teamId, toScope(scope))
    this.policy.bustTeam(teamId)
    if (result.reassigned_to_team_id) this.policy.bustTeam(result.reassigned_to_team_id)
    await this.notifyPolicyInvalidate(supabase, scope, { teamId })
    if (result.reassigned_to_team_id) {
      await this.notifyPolicyInvalidate(supabase, scope, { teamId: result.reassigned_to_team_id })
    }
    this.logger.warn(
      `[audit] team.delete id=${teamId} reassigned_to=${result.reassigned_to_team_id ?? 'null'} actor=${scope.userId}`,
    )
    return result
  }

  async listTeamMembers(
    supabase: SupabaseClient,
    scope: RequestScope,
    teamId: string,
  ): Promise<AgentTeamMember[]> {
    return this.repo.listTeamMembers(supabase, teamId, toScope(scope))
  }

  async listMyTeamMemberships(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<{ team_ids: string[] }> {
    const teamIds = await this.repo.listMyTeamMemberships(supabase, scope.userId, toScope(scope))
    return { team_ids: teamIds }
  }

  async addTeamMember(
    supabase: SupabaseClient,
    scope: RequestScope,
    teamId: string,
    userId: string,
  ): Promise<AgentTeamMember> {
    const member = await this.repo.addTeamMember(
      supabase,
      teamId,
      userId,
      scope.userId,
      toScope(scope),
    )
    this.policy.bustTeam(teamId)
    this.logger.log(`[audit] team.member.add team=${teamId} user=${userId} actor=${scope.userId}`)
    return member
  }

  async removeTeamMember(
    supabase: SupabaseClient,
    scope: RequestScope,
    teamId: string,
    userId: string,
  ): Promise<{ deleted: true }> {
    const team = await this.repo.getTeamById(supabase, teamId, toScope(scope))
    if (!team) throw new NotFoundException('Team not found')
    if (team.is_system && team.name === 'Management' && team.org_id) {
      const { role, status } = await this.runtimeRepo.getOrgMemberRoleStatus(
        supabase,
        team.org_id,
        userId,
      )
      if (status === 'active' && role === 'owner') {
        throw new ForbiddenException('Org owners cannot be removed from Management')
      }
    }
    await this.repo.removeTeamMember(supabase, teamId, userId, toScope(scope))
    this.policy.bustTeam(teamId)
    this.logger.warn(
      `[audit] team.member.remove team=${teamId} user=${userId} actor=${scope.userId}`,
    )
    return { deleted: true }
  }

  async listTeamGrants(supabase: SupabaseClient, teamId: string): Promise<AgentTeamGrant[]> {
    return this.repo.listTeamGrants(supabase, teamId)
  }

  async getTeamOverview(
    supabase: SupabaseClient,
    teamId: string,
    range?: { start?: string | null; end?: string | null },
  ): Promise<Record<string, unknown>> {
    const params: Record<string, unknown> = { p_team_id: teamId }
    if (range?.start) params.p_start = range.start
    if (range?.end) params.p_end = range.end
    return this.runtimeRepo.getTeamOverview(supabase, params)
  }

  async getTeamSpending(
    supabase: SupabaseClient,
    orgId: string,
    teamId: string,
    range?: { startDate?: string; endDate?: string; campaignIds?: string[] },
  ): Promise<{
    totals: { credits: number; costUsd: number; eventCount: number }
    previousTotals: { credits: number; costUsd: number; eventCount: number }
    daily: Array<{ day: string; credits: number; costUsd: number; eventCount: number }>
  }> {
    const end = range?.endDate ? new Date(range.endDate) : new Date()
    const start = range?.startDate
      ? new Date(range.startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate')
    }
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('startDate must be before endDate')
    }
    const maxMs = 366 * 24 * 60 * 60 * 1000
    if (end.getTime() - start.getTime() > maxMs) {
      throw new BadRequestException('Date range cannot exceed 366 days')
    }

    const campaignIds =
      range?.campaignIds && range.campaignIds.length > 0 ? range.campaignIds : null
    const { data, errorMessage } = await this.runtimeRepo.getTeamSpending(supabase, {
      orgId,
      teamId,
      start: start.toISOString(),
      end: end.toISOString(),
      campaignIds,
    })
    if (errorMessage) {
      this.logger.error(`team-spending rpc: ${errorMessage}`)
      throw new BadRequestException('Failed to fetch team spending')
    }
    const raw = data
    const totals = (raw.totals as Record<string, unknown> | null) ?? {}
    const prev = (raw.previousTotals as Record<string, unknown> | null) ?? {}
    const daily = (raw.daily as Array<Record<string, unknown>>) ?? []
    return {
      totals: {
        credits: Number(totals.credits ?? 0),
        costUsd: Number(totals.costUsd ?? 0),
        eventCount: Number(totals.eventCount ?? 0),
      },
      previousTotals: {
        credits: Number(prev.credits ?? 0),
        costUsd: Number(prev.costUsd ?? 0),
        eventCount: Number(prev.eventCount ?? 0),
      },
      daily: daily.map((d) => ({
        day: String(d.day ?? ''),
        credits: Number(d.credits ?? 0),
        costUsd: Number(d.costUsd ?? 0),
        eventCount: Number(d.eventCount ?? 0),
      })),
    }
  }

  async replaceTeamGrants(
    supabase: SupabaseClient,
    scope: RequestScope,
    teamId: string,
    grants: Array<{ kind: string; id: string }>,
  ): Promise<AgentTeamGrant[]> {
    return this.policyWorkflow.replaceTeamGrants(supabase, scope, teamId, grants)
  }

  async setAgentTeam(
    supabase: SupabaseClient,
    scope: RequestScope,
    agentKey: string,
    teamId: string | null,
  ): Promise<{ agent_key: string; team_id: string | null }> {
    return this.policyWorkflow.setAgentTeam(supabase, scope, agentKey, teamId)
  }

  async listAgentOverrides(
    supabase: SupabaseClient,
    scope: RequestScope,
    agentKey: string,
  ): Promise<AgentOverride[]> {
    return this.policyWorkflow.listAgentOverrides(supabase, scope, agentKey)
  }

  async replaceAgentOverrides(
    supabase: SupabaseClient,
    scope: RequestScope,
    agentKey: string,
    overrides: Array<{ kind: string; id: string; mode: AgentOverrideMode }>,
  ): Promise<AgentOverride[]> {
    return this.policyWorkflow.replaceAgentOverrides(supabase, scope, agentKey, overrides)
  }

  /**
   * Per-skill toggle for an agent: insert or remove a single
   * `agent_overrides` row with `capability_kind='skill'`.
   *
   * Default behavior is "skill enabled" (no row needed). To disable a skill,
   * pass `enabled=false` — a `mode='deny'` row is inserted. To re-enable,
   * pass `enabled=true` — the existing deny row is removed.
   *
   * Scope: per-user when no orgId in scope; per-org when scope is org-scoped
   * and caller is org admin/owner.
   */
  async setSkillOverride(
    supabase: SupabaseClient,
    scope: RequestScope,
    agentKey: string,
    skillKey: string,
    enabled: boolean,
  ): Promise<{ agent_key: string; skill_key: string; enabled: boolean }> {
    return this.policyWorkflow.setSkillOverride(supabase, scope, agentKey, skillKey, enabled)
  }

  async getAgentPolicy(
    scope: RequestScope,
    agentKey: string,
  ): Promise<{
    policy: ResolvedAgentPolicy
    /** Plain JSON-friendly serialization for HTTP. */
    asJson: {
      agent_key: string
      team_id: string | null
      team_name: string | null
      role_defaults: Array<{ kind: string; id: string }>
      grants: Array<{ kind: string; id: string }>
      overrides: {
        allow_extra: Array<{ kind: string; id: string }>
        deny: Array<{ kind: string; id: string }>
      }
      effective: string[]
    }
  }> {
    return this.policyWorkflow.getAgentPolicy(scope, agentKey)
  }

  private async notifyPolicyInvalidate(
    supabase: SupabaseClient,
    scope: RequestScope,
    payload: { agentKey?: string; teamId?: string | null },
  ): Promise<void> {
    const errorMessage = await this.runtimeRepo.notifyPolicyInvalidate(
      supabase,
      toScope(scope),
      payload,
    )
    if (errorMessage) this.logger.warn(`policy.invalidate.notify failed: ${errorMessage}`)
  }
}
