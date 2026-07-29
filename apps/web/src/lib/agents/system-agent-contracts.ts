/**
 * Client-safe mirror of `@vibey/agent-policy` system-agent contracts.
 *
 * Do not import the package runtime into Client Components; Turbopack resolves
 * the package's ESM `.js` source specifiers poorly during app dev.
 */
export const PROTECTED_SYSTEM_AGENT_KEYS = new Set([
  'vibey',
  'hr',
  'brain_scholar',
  'atlas',
  'loop',
  'delegator',
])

export const SYSTEM_AGENT_KEYS = new Set([
  ...PROTECTED_SYSTEM_AGENT_KEYS,
  'viktor',
  'widget_builder',
])

export interface WebSystemAgentContract {
  platformDomains: readonly string[]
}

const SYSTEM_DOMAINS = [
  'read_campaign',
  'edit_campaign',
  'read_marketing_artifacts',
  'write_marketing_artifacts',
  'manage_content',
  'read_space_context',
  'read_contacts',
  'edit_contacts',
  'manage_tasks_missions',
  'custom_db',
  'use_integrations',
  'generate_media',
  'read_brain_personal',
  'read_brain_agent',
  'read_brain_company',
  'read_brain_customer',
  'write_user_memory',
  'write_brain',
  'edit_brain_models',
  'edit_brain_company',
  'edit_brain_customer',
  'manage_agents',
  'communicate',
  'use_mcp',
] as const

export const WEB_SYSTEM_AGENT_CONTRACTS: Record<string, WebSystemAgentContract> = {
  vibey: {
    platformDomains: SYSTEM_DOMAINS,
  },
  atlas: {
    platformDomains: [
      'read_brain_personal',
      'read_brain_agent',
      'read_brain_company',
      'read_brain_customer',
      'write_user_memory',
      'write_brain',
      'edit_brain_models',
      'edit_brain_company',
      'edit_brain_customer',
      'manage_content',
      'manage_tasks_missions',
      'use_integrations',
      'generate_media',
      'communicate',
      'use_mcp',
    ],
  },
  brain_scholar: {
    platformDomains: [
      'read_brain_personal',
      'read_brain_agent',
      'read_brain_company',
      'read_brain_customer',
      'write_user_memory',
      'write_brain',
      'edit_brain_models',
      'edit_brain_company',
      'edit_brain_customer',
      'manage_content',
      'manage_tasks_missions',
      'use_integrations',
      'generate_media',
      'communicate',
      'use_mcp',
    ],
  },
  hr: {
    platformDomains: [
      'read_campaign',
      'edit_campaign',
      'read_brain_company',
      'write_user_memory',
      'manage_agents',
      'manage_team_identity',
      'manage_own_skills',
      'manage_team_skills',
      'communicate',
    ],
  },
  loop: {
    platformDomains: [
      'read_space_context',
      'manage_tasks_missions',
      'read_flows',
      'manage_flows',
      'use_integrations',
      'communicate',
      'use_mcp',
    ],
  },
  delegator: {
    platformDomains: [
      'read_campaign',
      'read_marketing_artifacts',
      'read_space_context',
      'read_contacts',
      'manage_tasks_missions',
      'use_integrations',
      'read_brain_personal',
      'read_brain_agent',
      'read_brain_company',
      'read_brain_customer',
      'communicate',
      'use_mcp',
    ],
  },
}

const GATEWAY_SCOPED_AGENT_ID_PATTERN =
  /^(?:org|user)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i

export function canonicalAgentKey(agentKey: string | null | undefined): string {
  const trimmed = agentKey?.trim() ?? ''
  const match = trimmed.match(GATEWAY_SCOPED_AGENT_ID_PATTERN)
  return match?.[1] ?? trimmed
}

export function isProtectedSystemAgent(agentKey: string | null | undefined): boolean {
  const canonical = canonicalAgentKey(agentKey)
  if (!canonical) return false
  return PROTECTED_SYSTEM_AGENT_KEYS.has(canonical)
}

export function getSystemAgentContract(
  agentKey: string | null | undefined,
): WebSystemAgentContract | null {
  const canonical = canonicalAgentKey(agentKey)
  if (!canonical) return null
  return WEB_SYSTEM_AGENT_CONTRACTS[canonical] ?? null
}

export function isSystemAgent(agentKey: string | null | undefined): boolean {
  const canonical = canonicalAgentKey(agentKey)
  if (!canonical) return false
  return SYSTEM_AGENT_KEYS.has(canonical)
}

export const SKILL_WRITE_LOCKED_KEYS = new Set([
  'viktor',
  'widget_builder',
  'atlas',
  'brain_scholar',
  'delegator',
])

export function isSkillWriteLockedAgent(agentKey: string | null | undefined): boolean {
  const canonical = canonicalAgentKey(agentKey)
  if (!canonical) return false
  return SKILL_WRITE_LOCKED_KEYS.has(canonical)
}
