export type SpaceTemplateItemSeed = {
  kind: 'task' | 'doc'
  title: string
  status?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  description?: string
  body?: string
  custom_data?: Record<string, unknown>
  sort_order: number
}

export type SpaceTemplateAutomationSeed = {
  name: string
  trigger: Record<string, unknown>
  actions: Record<string, unknown>[]
  sort_order: number
}

export type SpaceTemplateSeed = {
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
  items: SpaceTemplateItemSeed[]
  automations: SpaceTemplateAutomationSeed[]
}
