import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalAgentKey, isProtectedSystemAgent } from '@vibey/agent-policy'
import type { RequestScope } from '@vibey/api-shared'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { AgentTeamRuntimeRepository } from '../repositories/agent-team-runtime.repository'
import { AgentTeamsRepository } from '../repositories/agent-teams.repository'
import {
  isCapabilityKind,
  type AgentCapabilityKind,
  type AgentOverride,
  type AgentOverrideMode,
  type AgentTeamGrant,
  type ResolvedAgentPolicy,
} from '../types'
import { AgentPolicyService } from './agent-policy.service'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

function toScope(scope: RequestScope): ScopeKey {
  return { orgId: scope.orgId, userId: scope.userId }
}

function isOrgAdmin(scope: RequestScope): boolean {
  return !scope.orgId || scope.orgRole === 'owner' || scope.orgRole === 'admin'
}

@Injectable()
export class AgentTeamPolicyWorkflowService {
  private readonly logger = new Logger(AgentTeamPolicyWorkflowService.name)

  constructor(
    private readonly repo: AgentTeamsRepository,
    private readonly policy: AgentPolicyService,
    private readonly userAgentApi: UserAgentApiService,
    private readonly runtimeRepo: AgentTeamRuntimeRepository,
  ) {}

  async replaceTeamGrants(
    supabase: SupabaseClient,
    scope: RequestScope,
    teamId: string,
    grants: Array<{ kind: string; id: string }>,
  ): Promise<AgentTeamGrant[]> {
    const team = await this.repo.getTeamById(supabase, teamId, toScope(scope))
    if (!team) throw new NotFoundException('Team not found')
    const before = await this.repo.listTeamGrants(supabase, teamId)
    const sanitized = grants
      .filter((g) => isCapabilityKind(g.kind) && typeof g.id === 'string' && g.id.length > 0)
      .map((g) => ({ kind: g.kind as AgentCapabilityKind, id: g.id }))
    const result = await this.repo.replaceTeamGrants(supabase, teamId, sanitized)
    this.policy.bustTeam(teamId)
    await this.notifyPolicyInvalidate(supabase, scope, { teamId })
    await this.triggerRuntimeTeamSync(supabase, scope, teamId)
    this.logger.log(
      `[audit] team.grants.replace team=${teamId} before=${before.length} after=${result.length} actor=${scope.userId}`,
    )
    return result
  }

  async setAgentTeam(
    supabase: SupabaseClient,
    scope: RequestScope,
    agentKey: string,
    teamId: string | null,
  ): Promise<{ agent_key: string; team_id: string | null }> {
    agentKey = canonicalAgentKey(agentKey)
    if (isProtectedSystemAgent(agentKey)) {
      throw new ForbiddenException('System agents cannot be moved to teams')
    }
    if (teamId) {
      const team = await this.repo.getTeamById(supabase, teamId, toScope(scope))
      if (!team) throw new NotFoundException('Team not found')
    }
    const previousTeamId = await this.repo.getAgentTeamId(supabase, agentKey, toScope(scope))
    const result = await this.repo.setAgentTeam(supabase, agentKey, teamId, toScope(scope))
    this.policy.bustAgent(agentKey, toScope(scope))
    if (previousTeamId) this.policy.bustTeam(previousTeamId)
    if (teamId && teamId !== previousTeamId) this.policy.bustTeam(teamId)
    await this.notifyPolicyInvalidate(supabase, scope, { agentKey })
    if (previousTeamId)
      await this.notifyPolicyInvalidate(supabase, scope, { teamId: previousTeamId })
    if (teamId && teamId !== previousTeamId) {
      await this.notifyPolicyInvalidate(supabase, scope, { teamId })
    }
    await this.triggerRuntimeAgentSync(scope, agentKey)
    this.logger.log(
      `[audit] agent.team.set agent=${agentKey} from=${previousTeamId ?? 'null'} to=${teamId ?? 'null'} actor=${scope.userId}`,
    )
    return result
  }

  async listAgentOverrides(
    supabase: SupabaseClient,
    scope: RequestScope,
    agentKey: string,
  ): Promise<AgentOverride[]> {
    agentKey = canonicalAgentKey(agentKey)
    return this.repo.listOverrides(supabase, agentKey, toScope(scope))
  }

  async replaceAgentOverrides(
    supabase: SupabaseClient,
    scope: RequestScope,
    agentKey: string,
    overrides: Array<{ kind: string; id: string; mode: AgentOverrideMode }>,
  ): Promise<AgentOverride[]> {
    agentKey = canonicalAgentKey(agentKey)
    if (isProtectedSystemAgent(agentKey)) {
      throw new ForbiddenException('System agent access is fixed by the platform')
    }
    if (!isOrgAdmin(scope)) {
      if (overrides.some((o) => o.mode !== 'deny')) {
        throw new ForbiddenException('Only admins can add capabilities beyond the team grants')
      }
      const canManage = await this.repo.canManageAgent(supabase, agentKey, toScope(scope))
      if (!canManage) {
        throw new ForbiddenException('You do not have permission to manage this agent')
      }
    }
    const before = await this.repo.listOverrides(supabase, agentKey, toScope(scope))
    const sanitized = overrides
      .filter(
        (o) =>
          isCapabilityKind(o.kind) &&
          typeof o.id === 'string' &&
          o.id.length > 0 &&
          (o.mode === 'allow_extra' || o.mode === 'deny'),
      )
      .map((o) => ({ kind: o.kind as AgentCapabilityKind, id: o.id, mode: o.mode }))
    const result = await this.repo.replaceOverrides(supabase, agentKey, toScope(scope), sanitized)
    this.policy.bustAgent(agentKey, toScope(scope))
    await this.notifyPolicyInvalidate(supabase, scope, { agentKey })
    await this.triggerRuntimeAgentSync(scope, agentKey)
    this.logger.log(
      `[audit] agent.overrides.replace agent=${agentKey} before=${before.length} after=${result.length} actor=${scope.userId}`,
    )
    return result
  }

  async setSkillOverride(
    supabase: SupabaseClient,
    scope: RequestScope,
    agentKey: string,
    skillKey: string,
    enabled: boolean,
  ): Promise<{ agent_key: string; skill_key: string; enabled: boolean }> {
    agentKey = canonicalAgentKey(agentKey)
    if (typeof skillKey !== 'string' || skillKey.length === 0) {
      throw new BadRequestException('skillKey required')
    }
    if (isProtectedSystemAgent(agentKey)) {
      throw new ForbiddenException('System agent access is fixed by the platform')
    }
    if (scope.orgId && !isOrgAdmin(scope)) {
      throw new ForbiddenException('Only admins can toggle org-wide skill overrides')
    }
    const scopeKey = toScope(scope)
    const existing = await this.repo.listOverrides(supabase, agentKey, scopeKey)
    const skillDeny = existing.find(
      (o) => o.capability_kind === 'skill' && o.capability_id === skillKey && o.mode === 'deny',
    )

    if (enabled) {
      if (!skillDeny) {
        return { agent_key: agentKey, skill_key: skillKey, enabled: true }
      }
      const next = existing
        .filter(
          (o) =>
            !(o.capability_kind === 'skill' && o.capability_id === skillKey && o.mode === 'deny'),
        )
        .map((o) => ({
          kind: o.capability_kind as AgentCapabilityKind,
          id: o.capability_id,
          mode: o.mode,
        }))
      await this.repo.replaceOverrides(supabase, agentKey, scopeKey, next)
      this.policy.bustAgent(agentKey, scopeKey)
      await this.notifyPolicyInvalidate(supabase, scope, { agentKey })
      await this.triggerRuntimeAgentSync(scope, agentKey)
      this.logger.log(
        `[audit] agent.skill.enable agent=${agentKey} skill=${skillKey} actor=${scope.userId}`,
      )
      return { agent_key: agentKey, skill_key: skillKey, enabled: true }
    }

    if (skillDeny) {
      return { agent_key: agentKey, skill_key: skillKey, enabled: false }
    }
    const next = [
      ...existing.map((o) => ({
        kind: o.capability_kind as AgentCapabilityKind,
        id: o.capability_id,
        mode: o.mode,
      })),
      { kind: 'skill' as AgentCapabilityKind, id: skillKey, mode: 'deny' as AgentOverrideMode },
    ]
    await this.repo.replaceOverrides(supabase, agentKey, scopeKey, next)
    this.policy.bustAgent(agentKey, scopeKey)
    await this.notifyPolicyInvalidate(supabase, scope, { agentKey })
    await this.triggerRuntimeAgentSync(scope, agentKey)
    this.logger.log(
      `[audit] agent.skill.disable agent=${agentKey} skill=${skillKey} actor=${scope.userId}`,
    )
    return { agent_key: agentKey, skill_key: skillKey, enabled: false }
  }

  async getAgentPolicy(
    scope: RequestScope,
    agentKey: string,
  ): Promise<{
    policy: ResolvedAgentPolicy
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
    agentKey = canonicalAgentKey(agentKey)
    const [policy, roleDefaults] = await Promise.all([
      this.policy.resolveAgentPolicy(agentKey, toScope(scope)),
      this.policy.resolveRoleDefaultCapabilities(agentKey, toScope(scope)),
    ])
    return {
      policy,
      asJson: {
        agent_key: policy.agentKey,
        team_id: policy.teamId,
        team_name: policy.teamName,
        role_defaults: roleDefaults,
        grants: policy.grants,
        overrides: policy.overrides,
        effective: Array.from(policy.effective),
      },
    }
  }

  private async triggerRuntimeAgentSync(scope: RequestScope, agentKey: string): Promise<void> {
    try {
      const res = await this.userAgentApi.invoke(
        scope.userId,
        `/api/agents/${encodeURIComponent(agentKey)}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-openclaw-internal': 'true' },
          body: JSON.stringify({
            user_id: scope.userId,
            ...(scope.orgId ? { org_id: scope.orgId } : {}),
          }),
        },
        { logTag: `agent_access_policy_sync user=${scope.userId} agent=${agentKey}` },
      )
      if (!res.ok) {
        this.logger.warn(`Runtime sync failed for agent=${agentKey}: HTTP ${res.status}`)
      }
    } catch (err) {
      this.logger.warn(`Runtime sync failed for agent=${agentKey}: ${(err as Error).message}`)
    }
  }

  private async triggerRuntimeTeamSync(
    supabase: SupabaseClient,
    scope: RequestScope,
    teamId: string,
  ): Promise<void> {
    const result = await this.runtimeRepo.listAgentKeysByTeam(supabase, teamId, toScope(scope))
    if (result.errorMessage) {
      this.logger.warn(`Runtime team sync lookup failed for team=${teamId}: ${result.errorMessage}`)
      return
    }
    await Promise.allSettled(
      result.agentKeys.map((agentKey) => this.triggerRuntimeAgentSync(scope, agentKey)),
    )
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
