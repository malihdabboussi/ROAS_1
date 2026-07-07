import { backendGet, backendPost } from '@/lib/api/backend-client'
import type { AutomationTemplatePreset } from './automation-templates'

type AutomationTemplateApiRow = {
  template_key: string
  title: string
  description: string
  badge: string
  featured: boolean
  is_new: boolean
  workflows: string[]
  integration: string | null
  trigger_group: string | null
}

function mapAutomationTemplateRow(row: AutomationTemplateApiRow): AutomationTemplatePreset {
  return {
    id: row.template_key,
    title: row.title,
    description: row.description,
    badge: row.badge,
    featured: row.featured || undefined,
    isNew: row.is_new || undefined,
    workflows: row.workflows as AutomationTemplatePreset['workflows'],
    integration: (row.integration ?? undefined) as AutomationTemplatePreset['integration'],
    triggerGroup: (row.trigger_group ?? undefined) as AutomationTemplatePreset['triggerGroup'],
  }
}

export async function fetchAutomationTemplates(
  spaceId?: string | null,
): Promise<AutomationTemplatePreset[]> {
  const path = spaceId
    ? `/api/spaces/${spaceId}/automations/templates`
    : '/api/automations/templates'
  const rows = await backendGet<AutomationTemplateApiRow[]>(path)
  return rows.map(mapAutomationTemplateRow)
}

export async function installAutomationTemplate<TAutomation = unknown>(
  spaceId: string,
  templateKey: string,
): Promise<TAutomation> {
  return backendPost<TAutomation>(
    `/api/spaces/${spaceId}/automations/templates/${encodeURIComponent(templateKey)}/install`,
    {},
  )
}
