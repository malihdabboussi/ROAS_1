export type SpaceTemplateRow = {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  icon_color: string
  category: string
  persona: string | null
  badge: string | null
  featured: boolean
  is_new: boolean
  schema: Record<string, unknown>
  channel_name: string | null
  channel_description: string | null
  sort_order: number
}

export type SpaceTemplateDetailRow = SpaceTemplateRow & {
  task_count: number
  doc_count: number
  automation_count: number
  has_channel: boolean
}

export type SpaceTemplateItemRow = {
  id: string
  template_id: string
  kind: 'task' | 'doc'
  title: string
  status: string | null
  priority: string
  description: string | null
  body: string | null
  custom_data: Record<string, unknown>
  sort_order: number
}

export type SpaceTemplateAutomationRow = {
  id: string
  template_id: string
  name: string
  trigger: Record<string, unknown>
  actions: Record<string, unknown>[]
  sort_order: number
}

export type SpaceTemplateInstantiateResult = {
  space: Record<string, unknown>
  automations: Record<string, unknown>[]
}
