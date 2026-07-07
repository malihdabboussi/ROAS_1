import type {
  AutomationTemplateIntegration,
  AutomationTemplatePreset,
  AutomationTemplateTriggerGroup,
  AutomationTemplateWorkflow,
} from './automation-templates'

export type TemplateNavFilterId =
  | 'all'
  | 'featured'
  | 'new'
  | AutomationTemplateWorkflow
  | AutomationTemplateIntegration
  | AutomationTemplateTriggerGroup

export interface TemplateNavItem {
  id: TemplateNavFilterId
  label: string
}

export interface TemplateNavSection {
  title: string
  items: TemplateNavItem[]
}

export const TEMPLATE_NAV_SECTIONS: TemplateNavSection[] = [
  {
    title: 'Discover',
    items: [
      { id: 'all', label: 'All templates' },
      { id: 'featured', label: 'Featured' },
      { id: 'new', label: 'New' },
    ],
  },
  {
    title: 'By workflow',
    items: [
      { id: 'sales_cs', label: 'Sales & CS' },
      { id: 'inbound_comms', label: 'Inbound & comms' },
      { id: 'team_ops', label: 'Team operations' },
      { id: 'content_artifacts', label: 'Content & artifacts' },
      { id: 'agency_ops', label: 'Agency' },
    ],
  },
  {
    title: 'Connected apps',
    items: [
      { id: 'fathom', label: 'Fathom' },
      { id: 'email', label: 'Email' },
      { id: 'slack', label: 'Slack' },
      { id: 'google_calendar', label: 'Google Calendar' },
      { id: 'google_drive', label: 'Google Drive' },
      { id: 'google_sheets', label: 'Google Sheets' },
      { id: 'salesforce', label: 'Salesforce' },
      { id: 'github', label: 'GitHub' },
      { id: 'notion', label: 'Notion' },
    ],
  },
  {
    title: 'Internal triggers',
    items: [
      { id: 'forms', label: 'Forms' },
      { id: 'contacts', label: 'Contacts' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'artifacts', label: 'Artifacts' },
      { id: 'schedule', label: 'Schedule' },
      { id: 'brain', label: 'Brain' },
    ],
  },
]

const WORKFLOW_IDS = new Set<AutomationTemplateWorkflow>([
  'sales_cs',
  'inbound_comms',
  'team_ops',
  'content_artifacts',
  'agency_ops',
])

const INTEGRATION_IDS = new Set<AutomationTemplateIntegration>([
  'fathom',
  'email',
  'slack',
  'google_calendar',
  'google_drive',
  'google_sheets',
  'salesforce',
  'github',
  'notion',
])

const TRIGGER_GROUP_IDS = new Set<AutomationTemplateTriggerGroup>([
  'forms',
  'contacts',
  'tasks',
  'artifacts',
  'schedule',
  'brain',
])

export function templateMatchesNavFilter(
  template: AutomationTemplatePreset,
  filterId: TemplateNavFilterId,
): boolean {
  if (filterId === 'all') return true
  if (filterId === 'featured') return template.featured === true
  if (filterId === 'new') return template.isNew === true
  if (WORKFLOW_IDS.has(filterId as AutomationTemplateWorkflow)) {
    return template.workflows.includes(filterId as AutomationTemplateWorkflow)
  }
  if (INTEGRATION_IDS.has(filterId as AutomationTemplateIntegration)) {
    return template.integration === filterId
  }
  if (TRIGGER_GROUP_IDS.has(filterId as AutomationTemplateTriggerGroup)) {
    return template.triggerGroup === filterId
  }
  return false
}

export function filterAutomationTemplates(
  filterId: TemplateNavFilterId,
  presets: AutomationTemplatePreset[],
): AutomationTemplatePreset[] {
  if (filterId === 'all') return presets
  return presets.filter((template) => templateMatchesNavFilter(template, filterId))
}

export function countTemplatesForNavFilter(
  filterId: TemplateNavFilterId,
  presets: AutomationTemplatePreset[],
): number {
  return filterAutomationTemplates(filterId, presets).length
}

export function workflowLabel(workflow: AutomationTemplateWorkflow): string {
  switch (workflow) {
    case 'sales_cs':
      return 'Sales & CS'
    case 'inbound_comms':
      return 'Inbound'
    case 'team_ops':
      return 'Ops'
    case 'content_artifacts':
      return 'Content'
    case 'agency_ops':
      return 'Agency'
  }
}
