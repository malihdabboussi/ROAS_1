export type SpaceAutomationTemplateSeed = {
  template_key: string
  title: string
  description: string
  badge: string
  featured?: boolean
  is_new?: boolean
  workflows: string[]
  integration?:
    | 'fathom'
    | 'email'
    | 'slack'
    | 'google_calendar'
    | 'google_drive'
    | 'google_sheets'
    | 'salesforce'
    | 'github'
    | 'notion'
    | null
  trigger_group?: 'forms' | 'contacts' | 'tasks' | 'artifacts' | 'schedule' | 'brain' | 'slack' | null
  sort_order: number
  body: Record<string, unknown>
}
