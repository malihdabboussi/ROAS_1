import type { Domain } from './domains.js'
import type { RoleDefaultKey } from './role-defaults.js'

export type ProtectedSystemAgentKey = 'vibey' | 'atlas' | 'brain_scholar' | 'hr' | 'loop'
export type LegacySystemAgentKey = 'viktor' | 'widget_builder'
export type SystemAgentContractKind = 'vibey' | 'atlas' | 'hr' | 'atlas_alias' | 'flows'

export interface SystemAgentContract {
  agentKey: ProtectedSystemAgentKey
  kind: SystemAgentContractKind
  displayName: string
  roleDefaultKey: RoleDefaultKey
  protected: true
  aliasOf?: Exclude<ProtectedSystemAgentKey, 'brain_scholar'>
  platformDomains: readonly Domain[]
}

export const SYSTEM_AGENT_KEYS = ['vibey', 'atlas', 'brain_scholar', 'hr', 'loop'] as const

export const LEGACY_SYSTEM_AGENT_KEYS = ['viktor', 'widget_builder'] as const

export const SKILL_WRITE_LOCKED_SYSTEM_AGENT_KEYS = [
  'atlas',
  'brain_scholar',
  'viktor',
  'widget_builder',
] as const

export const SYSTEM_AGENT_CONTRACTS = {
  vibey: {
    agentKey: 'vibey',
    kind: 'vibey',
    displayName: 'Vibey',
    roleDefaultKey: 'vibey_ceo',
    protected: true,
    platformDomains: [
      'read_campaign',
      'edit_campaign',
      'read_marketing_artifacts',
      'write_marketing_artifacts',
      'manage_content',
      'manage_tasks_missions',
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
      'manage_team_identity',
      'manage_own_skills',
      'manage_mission_control',
      'communicate',
      'use_mcp',
    ],
  },
  atlas: {
    agentKey: 'atlas',
    kind: 'atlas',
    displayName: 'Atlas',
    roleDefaultKey: 'system_brain',
    protected: true,
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
    agentKey: 'brain_scholar',
    kind: 'atlas_alias',
    displayName: 'BrainScholar',
    roleDefaultKey: 'system_brain',
    protected: true,
    aliasOf: 'atlas',
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
    agentKey: 'hr',
    kind: 'hr',
    displayName: 'HR',
    roleDefaultKey: 'system_hr',
    protected: true,
    platformDomains: [
      'read_campaign',
      'edit_campaign',
      'write_user_memory',
      'manage_agents',
      'manage_team_identity',
      'manage_own_skills',
      'manage_team_skills',
      'communicate',
    ],
  },
  loop: {
    agentKey: 'loop',
    kind: 'flows',
    displayName: 'Loop',
    roleDefaultKey: 'system_flows',
    protected: true,
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
} as const satisfies Record<ProtectedSystemAgentKey, SystemAgentContract>

export function normalizeAgentKey(agentKey: string): string {
  return agentKey.trim().toLowerCase()
}

// Shared-runtime gateway agent ids are scoped as `user-<uuid>-<key>` or
// `org-<uuid>-<key>`; policy/registry/artifacts only know the canonical key.
const GATEWAY_SCOPED_AGENT_ID_PATTERN =
  /^(?:org|user)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i

export function canonicalAgentKey(agentKey: string): string {
  const trimmed = agentKey.trim()
  const match = trimmed.match(GATEWAY_SCOPED_AGENT_ID_PATTERN)
  return match?.[1] ?? trimmed
}

export function isVibeyAgent(agentKey: string): boolean {
  return normalizeAgentKey(agentKey) === 'vibey'
}

export function isAtlasLikeAgent(agentKey: string): boolean {
  const normalized = normalizeAgentKey(agentKey)
  return normalized === 'atlas' || normalized === 'brain_scholar'
}

export function isHrAgent(agentKey: string): boolean {
  return normalizeAgentKey(agentKey) === 'hr'
}

export function isLoopAgent(agentKey: string): boolean {
  return normalizeAgentKey(agentKey) === 'loop'
}

export function isProtectedSystemAgent(agentKey: string): agentKey is ProtectedSystemAgentKey {
  return (SYSTEM_AGENT_KEYS as readonly string[]).includes(normalizeAgentKey(agentKey))
}

export function isLegacySystemBuilderAgent(agentKey: string): boolean {
  const normalized = normalizeAgentKey(agentKey)
  return (
    normalized === 'viktor' ||
    normalized === 'widget_builder' ||
    normalized.startsWith('viktor_') ||
    normalized.startsWith('widget_builder_')
  )
}

export function isSkillWriteLockedSystemAgent(agentKey: string): boolean {
  return (SKILL_WRITE_LOCKED_SYSTEM_AGENT_KEYS as readonly string[]).includes(
    normalizeAgentKey(agentKey),
  )
}

export function getSystemAgentContract(agentKey: string): SystemAgentContract | null {
  const normalized = normalizeAgentKey(agentKey)
  if (!isProtectedSystemAgent(normalized)) return null
  return SYSTEM_AGENT_CONTRACTS[normalized]
}
