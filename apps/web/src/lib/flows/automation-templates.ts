export type AutomationTemplateWorkflow =
  | 'sales_cs'
  | 'inbound_comms'
  | 'team_ops'
  | 'content_artifacts'
  | 'agency_ops'

export type AutomationTemplateIntegration =
  | 'fathom'
  | 'email'
  | 'slack'
  | 'google_calendar'
  | 'google_drive'
  | 'google_sheets'
  | 'salesforce'
  | 'github'
  | 'notion'

export type AutomationTemplateTriggerGroup =
  | 'forms'
  | 'contacts'
  | 'tasks'
  | 'artifacts'
  | 'schedule'
  | 'brain'

export interface AutomationTemplatePreset {
  id: string
  featured?: boolean
  isNew?: boolean
  workflows: AutomationTemplateWorkflow[]
  integration?: AutomationTemplateIntegration
  triggerGroup?: AutomationTemplateTriggerGroup
  title: string
  description: string
  badge: string
}
