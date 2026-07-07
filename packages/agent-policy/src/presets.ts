import type { Domain } from './domains.js'

export type PresetKey =
  | 'read_only_campaign'
  | 'marketing_builder'
  | 'support_agent'
  | 'brain_operator'
  | 'dev_builder'
  | 'management'

export interface PolicyPreset {
  label: string
  domains: readonly Domain[]
}

export const PRESETS = {
  read_only_campaign: {
    label: 'Read-only campaign',
    domains: ['read_campaign', 'read_marketing_artifacts', 'read_brain_agent'],
  },
  marketing_builder: {
    label: 'Marketing builder',
    domains: [
      'read_campaign',
      'edit_campaign',
      'read_marketing_artifacts',
      'write_marketing_artifacts',
      'write_user_memory',
      'manage_content',
      'read_contacts',
      'edit_contacts',
      'use_integrations',
      'generate_media',
    ],
  },
  support_agent: {
    label: 'Support agent',
    domains: [
      'read_campaign',
      'read_marketing_artifacts',
      'write_user_memory',
      'read_contacts',
      'edit_contacts',
      'manage_tasks_missions',
      'communicate',
    ],
  },
  brain_operator: {
    label: 'Brain operator',
    domains: [
      'read_brain_personal',
      'read_brain_agent',
      'write_brain',
      'edit_brain_models',
      'manage_content',
    ],
  },
  dev_builder: {
    label: 'Dev builder',
    domains: ['write_user_memory', 'use_mcp', 'generate_media', 'manage_tasks_missions'],
  },
  management: {
    label: 'Management',
    domains: [
      'read_campaign',
      'edit_campaign',
      'write_user_memory',
      'read_contacts',
      'edit_contacts',
      'manage_tasks_missions',
      'manage_agents',
      'communicate',
      'use_integrations',
    ],
  },
} as const satisfies Record<PresetKey, PolicyPreset>
