import type { Action } from './actions.js'
import type { Domain } from './domains.js'
import { getActionDomain } from './registry.js'

export type PolicySourceLevel = 'role_default' | 'team_grant' | 'agent_allow_extra' | 'agent_deny'

export interface ResolveEffectiveDomainsInput {
  roleDomains?: readonly Domain[]
  teamGrants?: readonly Domain[]
  agentAllowExtra?: readonly Domain[]
  agentDeny?: readonly Domain[]
}

export interface PolicyDecision {
  allowed: boolean
  reason: string
  sourceLevel: PolicySourceLevel
  domain: Domain
}

function hasDomain(domains: readonly Domain[] | undefined, domain: Domain): boolean {
  return domains?.includes(domain) ?? false
}

export function resolveEffectiveDomains(input: ResolveEffectiveDomainsInput): Set<Domain> {
  const effective = new Set<Domain>()

  for (const domain of input.roleDomains ?? []) effective.add(domain)
  for (const domain of input.teamGrants ?? []) effective.add(domain)
  for (const domain of input.agentAllowExtra ?? []) effective.add(domain)
  for (const domain of input.agentDeny ?? []) effective.delete(domain)

  return effective
}

export function resolveActionPolicy(
  action: Action,
  input: ResolveEffectiveDomainsInput,
): PolicyDecision {
  const domain = getActionDomain(action)

  if (hasDomain(input.agentDeny, domain)) {
    return {
      allowed: false,
      reason: `Action "${action}" is denied by agent override for domain "${domain}".`,
      sourceLevel: 'agent_deny',
      domain,
    }
  }

  if (hasDomain(input.agentAllowExtra, domain)) {
    return {
      allowed: true,
      reason: `Action "${action}" is allowed by agent override for domain "${domain}".`,
      sourceLevel: 'agent_allow_extra',
      domain,
    }
  }

  if (hasDomain(input.teamGrants, domain)) {
    return {
      allowed: true,
      reason: `Action "${action}" is allowed by team grant for domain "${domain}".`,
      sourceLevel: 'team_grant',
      domain,
    }
  }

  if (hasDomain(input.roleDomains, domain)) {
    return {
      allowed: true,
      reason: `Action "${action}" is allowed by role default for domain "${domain}".`,
      sourceLevel: 'role_default',
      domain,
    }
  }

  return {
    allowed: false,
    reason: `Action "${action}" requires action domain "${domain}".`,
    sourceLevel: 'role_default',
    domain,
  }
}
