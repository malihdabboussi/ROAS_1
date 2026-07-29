import type { Domain } from './domains.js'

export type RoleDefaultKey =
  | 'vibey_ceo'
  | 'system_hr'
  | 'system_brain'
  | 'system_builder'
  | 'system_flows'
  | 'system_delegation'
  | 'managed_marketing_employee'
  | 'managed_analyst_employee'
  | 'managed_developer_employee'
  | 'managed_operations_employee'
  | 'managed_marketing_manager'
  | 'managed_analyst_manager'
  | 'managed_developer_manager'
  | 'managed_operations_manager'
  | 'managed_marketing_c_level'
  | 'managed_analyst_c_level'
  | 'managed_developer_c_level'
  | 'managed_operations_c_level'
  | 'managed_marketing_system'
  | 'managed_analyst_system'
  | 'managed_developer_system'
  | 'managed_operations_system'

const MANAGED_BASELINE_DOMAINS = [
  'read_campaign',
  'read_marketing_artifacts',
  'manage_content',
  'read_space_context',
  'read_contacts',
  'edit_contacts',
  'manage_tasks_missions',
  'use_integrations',
  'generate_media',
  'read_brain_personal',
  'read_brain_agent',
  'read_brain_company',
  'read_brain_customer',
  'write_user_memory',
  'manage_agents',
  'manage_mission_control',
  'communicate',
  'use_mcp',
] as const satisfies readonly Domain[]

const MANAGED_LEADERSHIP_EXTRA_DOMAINS = ['edit_campaign'] as const satisfies readonly Domain[]

const MARKETING_DOMAINS = [
  ...MANAGED_BASELINE_DOMAINS,
  'write_marketing_artifacts',
] as const satisfies readonly Domain[]

const ANALYST_DOMAINS = [...MANAGED_BASELINE_DOMAINS] as const satisfies readonly Domain[]

const DEVELOPER_DOMAINS = [...MANAGED_BASELINE_DOMAINS] as const satisfies readonly Domain[]

const OPERATIONS_DOMAINS = [...MANAGED_BASELINE_DOMAINS] as const satisfies readonly Domain[]

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
] as const satisfies readonly Domain[]

function withLeadership(domains: readonly Domain[]): readonly Domain[] {
  return Array.from(new Set([...domains, ...MANAGED_LEADERSHIP_EXTRA_DOMAINS]))
}

export const ROLE_TO_DOMAINS = {
  vibey_ceo: SYSTEM_DOMAINS,
  system_hr: [
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
  system_brain: [
    'manage_content',
    'manage_tasks_missions',
    'use_integrations',
    'generate_media',
    'read_brain_personal',
    'read_brain_agent',
    'write_user_memory',
    'write_brain',
    'edit_brain_models',
    'edit_brain_company',
    'read_brain_company',
    'read_brain_customer',
    'edit_brain_customer',
    'manage_agents',
    'communicate',
    'use_mcp',
  ],
  system_builder: [
    'read_campaign',
    'read_marketing_artifacts',
    'manage_content',
    'manage_tasks_missions',
    'custom_db',
    'use_integrations',
    'generate_media',
    'read_brain_personal',
    'read_brain_agent',
    'write_user_memory',
    'manage_agents',
    'communicate',
    'use_mcp',
  ],
  system_flows: [
    'read_space_context',
    'manage_tasks_missions',
    'read_flows',
    'manage_flows',
    'use_integrations',
    'communicate',
    'use_mcp',
  ],
  system_delegation: [
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
  managed_marketing_employee: MARKETING_DOMAINS,
  managed_analyst_employee: ANALYST_DOMAINS,
  managed_developer_employee: DEVELOPER_DOMAINS,
  managed_operations_employee: OPERATIONS_DOMAINS,
  managed_marketing_manager: withLeadership(MARKETING_DOMAINS),
  managed_analyst_manager: withLeadership(ANALYST_DOMAINS),
  managed_developer_manager: withLeadership(DEVELOPER_DOMAINS),
  managed_operations_manager: withLeadership(OPERATIONS_DOMAINS),
  managed_marketing_c_level: withLeadership(MARKETING_DOMAINS),
  managed_analyst_c_level: withLeadership(ANALYST_DOMAINS),
  managed_developer_c_level: withLeadership(DEVELOPER_DOMAINS),
  managed_operations_c_level: withLeadership(OPERATIONS_DOMAINS),
  managed_marketing_system: withLeadership(MARKETING_DOMAINS),
  managed_analyst_system: withLeadership(ANALYST_DOMAINS),
  managed_developer_system: withLeadership(DEVELOPER_DOMAINS),
  managed_operations_system: withLeadership(OPERATIONS_DOMAINS),
} as const satisfies Record<RoleDefaultKey, readonly Domain[]>
