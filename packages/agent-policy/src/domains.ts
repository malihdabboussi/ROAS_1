export const DOMAINS = [
  'read_campaign',
  'edit_campaign',
  'read_marketing_artifacts',
  'write_marketing_artifacts',
  'manage_content',
  'read_space_context',
  'read_contacts',
  'edit_contacts',
  'manage_tasks_missions',
  'read_flows',
  'manage_flows',
  'code_projects',
  'custom_db',
  'use_integrations',
  'generate_media',
  'read_brain_personal',
  'read_brain_agent',
  'read_brain_company',
  'read_brain_customer',
  'edit_brain_company',
  'edit_brain_customer',
  'write_user_memory',
  'write_brain',
  'edit_brain_models',
  'manage_agents',
  'manage_team_identity',
  'manage_own_skills',
  'manage_team_skills',
  'manage_mission_control',
  'communicate',
  'use_mcp',
] as const

export type Domain = (typeof DOMAINS)[number]

export type ActionDomainCapabilityKind = 'action_domain'

export function isDomain(value: unknown): value is Domain {
  return typeof value === 'string' && (DOMAINS as readonly string[]).includes(value)
}

export function createCapabilityKey(kind: ActionDomainCapabilityKind, id: Domain): string {
  return `${kind}:${id}`
}
