import {
  isDomain,
  resolveEffectiveDomains,
  ROLE_TO_DOMAINS,
  type Domain,
  type RoleDefaultKey,
} from '@vibey/agent-policy'

type MissionAgentPolicyRecord = {
  agent_key?: unknown
  role?: unknown
  level?: unknown
  config?: unknown
}

const MANAGED_DOMAINS = ['marketing', 'analyst', 'developer', 'operations'] as const
const MANAGED_LEVELS = ['employee', 'manager', 'c_level', 'system'] as const

function inferManagedDomain(agentKey: string, role: unknown): (typeof MANAGED_DOMAINS)[number] {
  const roleText = String(role ?? '').toLowerCase()
  if (/(copywriter|designer|creative|brand|media|marketing|social|\bads?\b)/.test(roleText)) {
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

function resolveRoleDefaultKey(
  agent: MissionAgentPolicyRecord,
  fallbackAgentKey: string,
): RoleDefaultKey {
  const agentKey = String(agent.agent_key ?? fallbackAgentKey).toLowerCase()
  const config =
    agent.config && typeof agent.config === 'object' && !Array.isArray(agent.config)
      ? (agent.config as Record<string, unknown>)
      : {}
  const profile = String(config.capability_profile ?? '')

  if (profile in ROLE_TO_DOMAINS) return profile as RoleDefaultKey
  if (agentKey === 'vibey') return 'vibey_ceo'
  if (agentKey === 'hr') return 'system_hr'
  if (agentKey === 'atlas' || agentKey === 'brain_scholar') return 'system_brain'
  if (agentKey === 'viktor' || agentKey === 'widget_builder') return 'system_builder'

  const configuredDomain = String(config.capability_domain ?? '')
  const domain = MANAGED_DOMAINS.includes(configuredDomain as (typeof MANAGED_DOMAINS)[number])
    ? (configuredDomain as (typeof MANAGED_DOMAINS)[number])
    : inferManagedDomain(agentKey, agent.role)
  const configuredLevel = String(agent.level ?? 'employee')
  const level = MANAGED_LEVELS.includes(configuredLevel as (typeof MANAGED_LEVELS)[number])
    ? (configuredLevel as (typeof MANAGED_LEVELS)[number])
    : 'employee'

  return `managed_${domain}_${level}` as RoleDefaultKey
}

function validDomains(values: readonly string[]): Domain[] {
  return values.filter(isDomain)
}

export function resolveMissionEffectiveDomains(
  agent: MissionAgentPolicyRecord,
  fallbackAgentKey: string,
  teamGrants: readonly string[],
  agentAllowExtra: readonly string[],
  agentDeny: readonly string[],
): Set<Domain> {
  const roleKey = resolveRoleDefaultKey(agent, fallbackAgentKey)
  return resolveEffectiveDomains({
    roleDomains: ROLE_TO_DOMAINS[roleKey],
    teamGrants: validDomains(teamGrants),
    agentAllowExtra: validDomains(agentAllowExtra),
    agentDeny: validDomains(agentDeny),
  })
}
