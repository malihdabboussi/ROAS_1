import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
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
import { SupabaseServiceClient } from '@vibey/api-shared'
import {
  BRAIN_SEARCH_FAMILY_CAPABILITIES,
  capabilityKey,
  type AgentCapability,
  type AgentCapabilityKind,
  type BrainSearchFamily,
  type ResolvedAgentPolicy,
} from '../agent-policy.types'
import { AgentPolicyRepository } from '../repositories/agent-policy.repository'
import { AgentPolicyActionDecisionService } from './agent-policy-action-decision.service'
import { AgentPolicyInvalidationListenerService } from './agent-policy-invalidation-listener.service'

interface ScopeKey {
  orgId: string | null
  userId: string | null
}

interface CacheEntry {
  resolvedAt: number
  policy: ResolvedAgentPolicy
}

interface DeniedActionsCacheEntry {
  resolvedAt: number
  deniedActions: Action[]
}

const CACHE_TTL_MS = 30_000

function scopeCacheKey(agentKey: string, scope: ScopeKey): string {
  return `${scope.orgId ?? 'u'}:${scope.userId ?? 'o'}:${agentKey}`
}

function deniedActionsCacheKey(
  agentKey: string,
  scope: ScopeKey,
  actions: readonly Action[],
): string {
  return `${scopeCacheKey(agentKey, scope)}:${actions.join('|')}`
}

/**
 * Mirror of `AgentPolicyService` in apps/api. Resolves user-defined RBAC
 * for an agent. effective = (teamGrants ∪ overrides.allow_extra) \ overrides.deny.
 *
 * Reads cached for 30s per (agentKey, scope).
 */
@Injectable()
export class AgentPolicyService implements OnModuleInit, OnModuleDestroy {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly deniedActionsCache = new Map<string, DeniedActionsCacheEntry>()
  private readonly teamIndex = new Map<string, Set<string>>()

  constructor(
    private readonly serviceClient: SupabaseServiceClient,
    private readonly repository: AgentPolicyRepository = new AgentPolicyRepository(),
    private readonly actionDecision: AgentPolicyActionDecisionService = new AgentPolicyActionDecisionService(),
    private readonly invalidationListener: AgentPolicyInvalidationListenerService = new AgentPolicyInvalidationListenerService(),
  ) {}

  bustAll(): void {
    this.cache.clear()
    this.deniedActionsCache.clear()
    this.teamIndex.clear()
  }

  bustAgent(agentKey: string, scope: ScopeKey): void {
    const key = scopeCacheKey(canonicalAgentKey(agentKey), scope)
    const entry = this.cache.get(key)
    if (entry) this.removeFromIndex(entry.policy.teamId, key)
    this.cache.delete(key)
    this.deleteDeniedActionsCacheForScopeKey(key)
  }

  bustTeam(teamId: string): void {
    const keys = this.teamIndex.get(teamId)
    if (!keys) return
    for (const key of keys) {
      this.cache.delete(key)
      this.deleteDeniedActionsCacheForScopeKey(key)
    }
    this.teamIndex.delete(teamId)
  }

  async onModuleInit(): Promise<void> {
    await this.invalidationListener.start((payload) => this.handleInvalidationNotification(payload))
  }

  async onModuleDestroy(): Promise<void> {
    await this.invalidationListener.stop()
  }

  private handleInvalidationNotification(payload: string | undefined): void {
    if (!payload) {
      this.bustAll()
      return
    }
    try {
      const parsed = JSON.parse(payload) as {
        agentKey?: string | null
        teamId?: string | null
        orgId?: string | null
        userId?: string | null
      }
      if (parsed.teamId) this.bustTeam(parsed.teamId)
      if (parsed.agentKey) {
        this.bustAgent(parsed.agentKey, {
          orgId: parsed.orgId ?? null,
          userId: parsed.orgId ? null : (parsed.userId ?? null),
        })
      }
      if (!parsed.teamId && !parsed.agentKey) this.bustAll()
    } catch {
      this.bustAll()
    }
  }

  private removeFromIndex(teamId: string | null, cacheKey: string): void {
    if (!teamId) return
    const keys = this.teamIndex.get(teamId)
    if (!keys) return
    keys.delete(cacheKey)
    if (keys.size === 0) this.teamIndex.delete(teamId)
  }

  private addToIndex(teamId: string | null, cacheKey: string): void {
    if (!teamId) return
    let keys = this.teamIndex.get(teamId)
    if (!keys) {
      keys = new Set()
      this.teamIndex.set(teamId, keys)
    }
    keys.add(cacheKey)
  }

  private deleteDeniedActionsCacheForScopeKey(scopeKey: string): void {
    const prefix = `${scopeKey}:`
    for (const key of this.deniedActionsCache.keys()) {
      if (key.startsWith(prefix)) this.deniedActionsCache.delete(key)
    }
  }

  async resolveAgentPolicy(agentKey: string, scope: ScopeKey): Promise<ResolvedAgentPolicy> {
    agentKey = canonicalAgentKey(agentKey)
    const cacheKey = scopeCacheKey(agentKey, scope)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) return cached.policy
    const policy = await this.computePolicy(agentKey, scope)
    this.cache.set(cacheKey, { resolvedAt: Date.now(), policy })
    this.addToIndex(policy.teamId, cacheKey)
    return policy
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
    const capabilityPolicy =
      kind === 'brain_access' && (await this.isSystemAgent(agentKey, scope))
        ? this.policyIgnoringUserToggleDenies(policy)
        : policy
    return (
      capabilityPolicy.effective.has(capabilityKey(kind, id)) ||
      this.isCapabilityCoveredByRoleDefaults(kind, id, roleDomains, capabilityPolicy)
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
      return {
        allowed: false,
        reason: `Unknown action "${action}".`,
        sourceLevel: 'role_default',
        domain: 'communicate',
      }
    }

    const contractDecision = this.actionDecision.resolveActionContractDecision(
      action as Action,
      agentKey,
    )
    if (contractDecision) return contractDecision

    const systemDecision = this.actionDecision.resolveSystemDomainDecision(
      action as Action,
      agentKey,
    )
    if (systemDecision) return systemDecision

    const [policy, roleDomains, isSystemAgent] = await Promise.all([
      this.computePolicy(agentKey, scope),
      this.resolveRoleDefaultDomains(agentKey, scope),
      this.isSystemAgent(agentKey, scope),
    ])

    return this.actionDecision.resolvePolicyBackedActionDecision(
      action as Action,
      policy,
      roleDomains,
      isSystemAgent,
    )
  }

  async listDeniedActions(
    agentKey: string,
    actions: readonly Action[],
    scope: ScopeKey,
  ): Promise<Action[]> {
    agentKey = canonicalAgentKey(agentKey)
    const cacheKey = deniedActionsCacheKey(agentKey, scope, actions)
    const cached = this.deniedActionsCache.get(cacheKey)
    if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) {
      return [...cached.deniedActions]
    }

    const [policy, roleDomains, isSystemAgent] = await Promise.all([
      this.resolveAgentPolicy(agentKey, scope),
      this.resolveRoleDefaultDomains(agentKey, scope),
      this.isSystemAgent(agentKey, scope),
    ])
    const denied: Action[] = []

    for (const action of actions) {
      const contractDecision = this.actionDecision.resolveActionContractDecision(action, agentKey)
      const systemDecision =
        contractDecision ?? this.actionDecision.resolveSystemDomainDecision(action, agentKey)
      const decision =
        systemDecision ??
        this.actionDecision.resolvePolicyBackedActionDecision(
          action,
          policy,
          roleDomains,
          isSystemAgent,
        )
      if (!decision.allowed) denied.push(action)
    }

    this.deniedActionsCache.set(cacheKey, { resolvedAt: Date.now(), deniedActions: denied })
    return [...denied]
  }

  private async isSystemAgent(agentKey: string, scope: ScopeKey): Promise<boolean> {
    if (isProtectedSystemAgent(agentKey) || isLegacySystemBuilderAgent(agentKey)) {
      return true
    }
    const supa = this.serviceClient.client
    const { isSystem, errorMessage } = await this.repository.lookupSystemAgent(
      supa,
      agentKey,
      scope,
    )
    if (errorMessage) throw new Error(`policy.lookupSystemAgent failed: ${errorMessage}`)
    return isSystem
  }

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

  async listAllowedBrainSearchFamilies(
    agentKey: string,
    scope: ScopeKey,
  ): Promise<BrainSearchFamily[]> {
    agentKey = canonicalAgentKey(agentKey)
    const [policy, roleDomains, isSystemAgent] = await Promise.all([
      this.resolveAgentPolicy(agentKey, scope),
      this.resolveRoleDefaultDomains(agentKey, scope),
      this.isSystemAgent(agentKey, scope),
    ])
    const capabilityPolicy = isSystemAgent ? this.policyIgnoringUserToggleDenies(policy) : policy

    return (Object.keys(BRAIN_SEARCH_FAMILY_CAPABILITIES) as BrainSearchFamily[]).filter(
      (family) => {
        const capability = BRAIN_SEARCH_FAMILY_CAPABILITIES[family]
        if (isSystemAgent) {
          return this.isCapabilityCoveredByRoleDefaults(
            capability.kind,
            capability.id,
            roleDomains,
            capabilityPolicy,
          )
        }
        return (
          policy.effective.has(capabilityKey(capability.kind, capability.id)) ||
          this.isCapabilityCoveredByRoleDefaults(
            capability.kind,
            capability.id,
            roleDomains,
            capabilityPolicy,
          )
        )
      },
    )
  }

  private policyIgnoringUserToggleDenies(policy: ResolvedAgentPolicy): ResolvedAgentPolicy {
    return {
      ...policy,
      overrides: { ...policy.overrides, deny: [] },
    }
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
    const supa = this.serviceClient.client
    const { teamId, errorMessage: registryErrorMessage } = await this.repository.lookupRegistryTeam(
      supa,
      agentKey,
      scope,
    )
    if (registryErrorMessage) {
      throw new Error(`policy.lookupRegistry failed: ${registryErrorMessage}`)
    }

    let teamName: string | null = null
    let grants: AgentCapability[] = []
    if (teamId) {
      const { teamName: resolvedTeamName, errorMessage: teamErrorMessage } =
        await this.repository.lookupTeamName(supa, teamId)
      if (teamErrorMessage) throw new Error(`policy.lookupTeam failed: ${teamErrorMessage}`)
      else if (resolvedTeamName) teamName = resolvedTeamName

      const { grants: grantRows, errorMessage: grantErrorMessage } =
        await this.repository.listTeamGrants(supa, teamId)
      if (grantErrorMessage) throw new Error(`policy.lookupGrants failed: ${grantErrorMessage}`)
      else {
        grants = grantRows.map((r: { capability_kind: string; capability_id: string }) => ({
          kind: r.capability_kind as AgentCapabilityKind,
          id: r.capability_id,
        }))
      }
    }

    const { overrides: ovRows, errorMessage: overrideErrorMessage } =
      await this.repository.listOverrides(supa, agentKey, scope)
    if (overrideErrorMessage) {
      throw new Error(`policy.lookupOverrides failed: ${overrideErrorMessage}`)
    }
    const allowExtra: AgentCapability[] = []
    const deny: AgentCapability[] = []
    for (const r of ovRows as Array<{
      capability_kind: string
      capability_id: string
      mode: string
    }>) {
      const cap: AgentCapability = {
        kind: r.capability_kind as AgentCapabilityKind,
        id: r.capability_id,
      }
      if (r.mode === 'allow_extra') allowExtra.push(cap)
      else if (r.mode === 'deny') deny.push(cap)
    }

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
    const supa = this.serviceClient.client
    const { agent, errorMessage } = await this.repository.lookupRoleDefaultAgent(
      supa,
      agentKey,
      scope,
    )
    if (errorMessage) throw new Error(`policy.lookupRoleDefaults failed: ${errorMessage}`)

    const roleKey = this.resolveRoleDefaultKey(agent, agentKey)
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
