import { Injectable } from '@nestjs/common'
import {
  canonicalAgentKey,
  getSystemAgentContract,
  isAction,
  isAtlasLikeAgent,
  isDomain,
  isHrAgent,
  isLegacySystemBuilderAgent,
  isProtectedSystemAgent,
  isVibeyAgent,
  ROLE_TO_DOMAINS,
  type Action,
  type Domain,
  type PolicyDecision,
  type RoleDefaultKey,
} from '@vibey/agent-policy'
import { AgentPolicyRepository } from '../repositories/agent-policy.repository'
import {
  capabilityKey,
  type AgentCapability,
  type AgentCapabilityKind,
  type ResolvedAgentPolicy,
} from '../types'
import { AgentPolicyActionDecisionService } from './agent-policy-action-decision.service'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

interface CacheEntry {
  resolvedAt: number
  policy: ResolvedAgentPolicy
}

const CACHE_TTL_MS = 30_000

function scopeCacheKey(agentKey: string, scope: ScopeKey): string {
  return `${scope.orgId ?? 'u'}:${scope.userId ?? 'o'}:${agentKey}`
}

/**
 * Single source of truth for "what can agent X do?".
 *
 * Resolution rule:
 *   effective = (teamGrants ∪ overrides.allow_extra) \ overrides.deny
 *
 * Reads are cached per (agentKey, scope) for 30s; busted by `bustAgent`,
 * `bustTeam`, or `bustAll`.
 */
@Injectable()
export class AgentPolicyService {
  private readonly cache = new Map<string, CacheEntry>()
  // Reverse index: team_id -> Set of cache keys, so when a team's grants
  // change we can invalidate every dependent agent.
  private readonly teamIndex = new Map<string, Set<string>>()

  constructor(
    private readonly repository: AgentPolicyRepository,
    private readonly actionDecision: AgentPolicyActionDecisionService,
  ) {}

  bustAgent(agentKey: string, scope: ScopeKey): void {
    agentKey = canonicalAgentKey(agentKey)
    const key = scopeCacheKey(agentKey, scope)
    const entry = this.cache.get(key)
    if (entry) this.removeFromIndex(entry.policy.teamId, key)
    this.cache.delete(key)
  }

  bustTeam(teamId: string): void {
    const keys = this.teamIndex.get(teamId)
    if (!keys) return
    for (const k of keys) this.cache.delete(k)
    this.teamIndex.delete(teamId)
  }

  bustAll(): void {
    this.cache.clear()
    this.teamIndex.clear()
  }

  private removeFromIndex(teamId: string | null, cacheKey: string): void {
    if (!teamId) return
    const set = this.teamIndex.get(teamId)
    if (!set) return
    set.delete(cacheKey)
    if (set.size === 0) this.teamIndex.delete(teamId)
  }

  private addToIndex(teamId: string | null, cacheKey: string): void {
    if (!teamId) return
    let set = this.teamIndex.get(teamId)
    if (!set) {
      set = new Set()
      this.teamIndex.set(teamId, set)
    }
    set.add(cacheKey)
  }

  async resolveAgentPolicy(agentKey: string, scope: ScopeKey): Promise<ResolvedAgentPolicy> {
    agentKey = canonicalAgentKey(agentKey)
    const cacheKey = scopeCacheKey(agentKey, scope)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) {
      return cached.policy
    }
    const policy = await this.computePolicy(agentKey, scope)
    this.cache.set(cacheKey, { resolvedAt: Date.now(), policy })
    this.addToIndex(policy.teamId, cacheKey)
    return policy
  }

  async resolveRoleDefaultCapabilities(
    agentKey: string,
    scope: ScopeKey,
  ): Promise<AgentCapability[]> {
    const roleDomains = await this.resolveRoleDefaultDomains(canonicalAgentKey(agentKey), scope)
    return roleDomains.map((id) => ({ kind: 'action_domain', id }))
  }

  async canAgentUseCapability(
    agentKey: string,
    kind: AgentCapabilityKind,
    id: string,
    scope: ScopeKey,
  ): Promise<boolean> {
    agentKey = canonicalAgentKey(agentKey)
    const [policy, roleDomains] = await Promise.all([
      this.resolveAgentPolicy(agentKey, scope),
      this.resolveRoleDefaultDomains(agentKey, scope),
    ])
    return (
      policy.effective.has(capabilityKey(kind, id)) ||
      this.isCapabilityCoveredByRoleDefaults(kind, id, roleDomains, policy)
    )
  }

  async canAgentAccessContextResource(
    agentKey: string,
    kind: 'space_context' | 'campaign_context',
    resourceId: string,
    scope: ScopeKey,
  ): Promise<boolean> {
    return (
      (await this.canAgentUseCapability(agentKey, kind, '*', scope)) ||
      (await this.canAgentUseCapability(agentKey, kind, resourceId, scope))
    )
  }

  async canExecuteAction(
    agentKey: string,
    action: string,
    scope: ScopeKey,
  ): Promise<PolicyDecision> {
    agentKey = canonicalAgentKey(agentKey)
    if (!isAction(action)) {
      return this.actionDecision.resolveUnknownAction(action)
    }

    const typedAction = action as Action
    const immediateDecision = this.actionDecision.resolveImmediateDecision(typedAction, agentKey)
    if (immediateDecision) return immediateDecision

    const [policy, roleDomains, isSystemAgent] = await Promise.all([
      this.computePolicy(agentKey, scope),
      this.resolveRoleDefaultDomains(agentKey, scope),
      this.isSystemAgent(agentKey, scope),
    ])

    return this.actionDecision.resolvePolicyDecision(agentKey, typedAction, {
      policy,
      roleDomains,
      isSystemAgent,
    })
  }

  private async isSystemAgent(agentKey: string, scope: ScopeKey): Promise<boolean> {
    if (isProtectedSystemAgent(agentKey) || isLegacySystemBuilderAgent(agentKey)) {
      return true
    }
    return this.repository.getSystemFlag(agentKey, scope)
  }

  /**
   * Bulk check helper for callers that need multiple capabilities at once
   * (e.g. integration-context filtering N integrations against the policy).
   */
  async listAllowedCapabilities(
    agentKey: string,
    kind: AgentCapabilityKind,
    candidateIds: string[],
    scope: ScopeKey,
  ): Promise<string[]> {
    agentKey = canonicalAgentKey(agentKey)
    const [policy, roleDomains] = await Promise.all([
      this.resolveAgentPolicy(agentKey, scope),
      this.resolveRoleDefaultDomains(agentKey, scope),
    ])
    return candidateIds.filter(
      (id) =>
        policy.effective.has(capabilityKey(kind, id)) ||
        this.isCapabilityCoveredByRoleDefaults(kind, id, roleDomains, policy),
    )
  }

  private isCapabilityDeniedByOverride(
    policy: ResolvedAgentPolicy,
    kind: AgentCapabilityKind,
    id: string,
  ): boolean {
    return policy.overrides.deny.some(
      (capability) => capability.kind === kind && (capability.id === id || capability.id === '*'),
    )
  }

  private isCapabilityCoveredByRoleDefaults(
    kind: AgentCapabilityKind,
    id: string,
    roleDomains: readonly Domain[],
    policy: ResolvedAgentPolicy,
  ): boolean {
    if (this.isCapabilityDeniedByOverride(policy, kind, id)) return false
    if (kind === 'action_domain' && isDomain(id)) return roleDomains.includes(id as Domain)
    if (kind === 'campaign_context') return roleDomains.includes('read_campaign')
    if (kind === 'space_context') return roleDomains.includes('read_space_context')
    if (kind === 'brain_access' && id === 'personal')
      return roleDomains.includes('read_brain_personal')
    return false
  }

  private async computePolicy(agentKey: string, scope: ScopeKey): Promise<ResolvedAgentPolicy> {
    agentKey = canonicalAgentKey(agentKey)
    const regRow = await this.repository.getAgentTeamRow(agentKey, scope)
    const teamId = (regRow as { team_id?: string | null } | null)?.team_id ?? null

    let teamName: string | null = null
    let grants: AgentCapability[] = []

    if (teamId) {
      teamName = await this.repository.getTeamName(teamId)
      grants = await this.repository.listTeamGrants(teamId)
    }

    const { allowExtra, deny } = await this.repository.listOverrides(agentKey, scope)

    // (grants ∪ allow_extra) \ deny
    const effective = new Set<string>()
    for (const g of grants) effective.add(capabilityKey(g.kind, g.id))
    for (const a of allowExtra) effective.add(capabilityKey(a.kind, a.id))
    for (const d of deny) effective.delete(capabilityKey(d.kind, d.id))

    return {
      agentKey,
      teamId,
      teamName,
      grants,
      overrides: { allow_extra: allowExtra, deny },
      effective,
    }
  }

  private async resolveRoleDefaultDomains(agentKey: string, scope: ScopeKey): Promise<Domain[]> {
    const regRow = await this.repository.getRoleDefaultAgentRow(agentKey, scope)
    const roleKey = this.resolveRoleDefaultKey(regRow, agentKey)
    return roleKey ? [...ROLE_TO_DOMAINS[roleKey]] : []
  }

  private resolveRoleDefaultKey(
    agent: Record<string, unknown> | null,
    fallbackAgentKey: string,
  ): RoleDefaultKey | null {
    const agentKey = String(agent?.agent_key ?? fallbackAgentKey).toLowerCase()
    const config =
      agent?.config && typeof agent.config === 'object'
        ? (agent.config as Record<string, unknown>)
        : {}
    const profile = String(config.capability_profile ?? '')
    const level = String(agent?.level ?? '')
    const explicitDomain = String(config.capability_domain ?? '')
    const inferredDomain = this.inferManagedDomain(agentKey, String(agent?.role ?? ''))
    const managedDomain = explicitDomain || inferredDomain

    const contract = getSystemAgentContract(agentKey)
    if (contract) return contract.roleDefaultKey
    if (profile === 'vibey_ceo' || isVibeyAgent(agentKey)) return 'vibey_ceo'
    if (profile === 'system_hr' || isHrAgent(agentKey)) return 'system_hr'
    if (profile === 'system_brain' || isAtlasLikeAgent(agentKey)) return 'system_brain'
    if (profile === 'system_builder' || isLegacySystemBuilderAgent(agentKey)) {
      return 'system_builder'
    }

    if (!this.isManagedDomain(managedDomain)) return null
    const normalizedLevel =
      level === 'manager' || level === 'c_level' || level === 'system' ? level : 'employee'
    return `managed_${managedDomain}_${normalizedLevel}` as RoleDefaultKey
  }

  private inferManagedDomain(agentKey: string, role: string): string {
    const roleText = role.toLowerCase()
    if (/(copywriter|designer|creative|brand|media|marketing|social)/.test(roleText)) {
      return 'marketing'
    }
    if (/(analyst|finance|data|performance)/.test(roleText)) return 'analyst'
    if (/(developer|engineer|automation|integrations|qa|full-stack|full stack)/.test(roleText)) {
      return 'developer'
    }
    if (/(operations|project.?manag|coordinator|program.?manag)/.test(roleText)) {
      return 'operations'
    }
    if (['copywriter', 'designer', 'media_producer', 'brand_manager'].includes(agentKey)) {
      return 'marketing'
    }
    if (['analyst', 'cfo'].includes(agentKey)) return 'analyst'
    if (['developer', 'automation_integrations_engineer', 'qa_engineer'].includes(agentKey)) {
      return 'developer'
    }
    return 'operations'
  }

  private isManagedDomain(
    value: string,
  ): value is 'marketing' | 'analyst' | 'developer' | 'operations' {
    return (
      value === 'marketing' ||
      value === 'analyst' ||
      value === 'developer' ||
      value === 'operations'
    )
  }
}
