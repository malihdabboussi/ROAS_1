import type { SpaceTemplate } from '../../services/space-templates.service'

export type SpaceTemplateNavFilterId =
  | 'all'
  | 'featured'
  | 'new'
  | 'founder_solo'
  | 'sales_cs'
  | 'marketing_content'
  | 'operations'
  | 'agency_client'
  | 'engineering'
  | 'pipelines'
  | 'calendars'
  | 'knowledge'
  | 'research'

export interface SpaceTemplateNavItem {
  id: SpaceTemplateNavFilterId
  label: string
}

export interface SpaceTemplateNavSection {
  title: string
  items: SpaceTemplateNavItem[]
}

export const SPACE_TEMPLATE_NAV_SECTIONS: SpaceTemplateNavSection[] = [
  {
    title: 'Discover',
    items: [
      { id: 'all', label: 'All templates' },
      { id: 'featured', label: 'Featured' },
      { id: 'new', label: 'New' },
    ],
  },
  {
    title: 'By role',
    items: [
      { id: 'founder_solo', label: 'Founder & solo' },
      { id: 'sales_cs', label: 'Sales & CS' },
      { id: 'marketing_content', label: 'Marketing & content' },
      { id: 'operations', label: 'Operations' },
      { id: 'agency_client', label: 'Agency / client work' },
      { id: 'engineering', label: 'Engineering' },
    ],
  },
  {
    title: 'By work type',
    items: [
      { id: 'pipelines', label: 'Pipelines' },
      { id: 'calendars', label: 'Calendars' },
      { id: 'knowledge', label: 'Knowledge' },
      { id: 'research', label: 'Research' },
    ],
  },
]

const PERSONA_MAP: Record<string, SpaceTemplateNavFilterId[]> = {
  solo: ['founder_solo'],
  agency: ['agency_client'],
  startup: ['founder_solo'],
  sales: ['sales_cs'],
  ops: ['operations'],
  content: ['marketing_content'],
  marketing: ['marketing_content'],
  cs: ['sales_cs'],
  founder: ['founder_solo'],
  research: ['research'],
  dev: ['engineering'],
}

const SLUG_WORK_TYPE: Record<string, SpaceTemplateNavFilterId[]> = {
  'personal-workspace': ['calendars'],
  'client-account-workspace': ['pipelines', 'agency_client'],
  'product-launch': ['calendars', 'pipelines'],
  'sales-pipeline': ['pipelines', 'sales_cs'],
  'company-wiki': ['knowledge'],
  'operations-hub': ['pipelines', 'operations'],
  'content-calendar': ['calendars', 'marketing_content'],
  'marketing-campaign': ['calendars', 'pipelines', 'marketing_content'],
  'customer-onboarding': ['pipelines', 'sales_cs'],
  'hiring-pipeline': ['pipelines', 'founder_solo'],
  'research-insights': ['research'],
  'engineering-bug-tracker': ['pipelines', 'engineering'],
}

export function templateMatchesNavFilter(
  template: SpaceTemplate,
  filterId: SpaceTemplateNavFilterId,
): boolean {
  if (filterId === 'all') return true
  if (filterId === 'featured') return template.featured === true
  if (filterId === 'new') return template.is_new === true

  const persona = template.persona ?? ''
  const personaTags = PERSONA_MAP[persona] ?? []
  if (personaTags.includes(filterId)) return true

  const workTags = SLUG_WORK_TYPE[template.slug] ?? []
  if (workTags.includes(filterId)) return true

  if (filterId === 'operations' && template.category === 'tier1_universal' && persona === 'ops') {
    return true
  }

  return false
}

export function filterSpaceTemplates(
  filterId: SpaceTemplateNavFilterId,
  templates: SpaceTemplate[],
): SpaceTemplate[] {
  if (filterId === 'all') return templates
  return templates.filter((t) => templateMatchesNavFilter(t, filterId))
}

export function countTemplatesForNavFilter(
  filterId: SpaceTemplateNavFilterId,
  templates: SpaceTemplate[],
): number {
  return filterSpaceTemplates(filterId, templates).length
}
