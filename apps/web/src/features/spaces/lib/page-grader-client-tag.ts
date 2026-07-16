import type { PageGraderClient } from '../services/page-grader-send.service'
import type { SelectOption } from '../types/space-schema'

export type PageGraderClientTagMap = Record<string, { tag_id: string; tag_label: string }>

export type PageGraderClientScopeEntry = {
  campaign_id: string
  campaign_name?: string
  space_id?: string | null
  space_title?: string | null
}

export type PageGraderClientScopeMap = Record<string, PageGraderClientScopeEntry>

export type PageGraderWorkKind = 'task' | 'task_request'

export type PageGraderTaskTypeId =
  | 'design'
  | 'copy'
  | 'funnel'
  | 'ghl'
  | 'ad'
  | 'video'
  | 'other'
  | 'general'

export type PageGraderTaskTypeOption = {
  id: PageGraderTaskTypeId | string
  label: string
  hint: string
}

export const FALLBACK_PAGE_GRADER_TASK_TYPES: PageGraderTaskTypeOption[] = [
  { id: 'design', label: 'Graphics', hint: 'Design / graphic design requests' },
  { id: 'copy', label: 'Copywriting', hint: 'Copy and messaging requests' },
  { id: 'funnel', label: 'Funnels & Pages', hint: 'Funnel builds and landing pages' },
  { id: 'ad', label: 'Ads & Media Buying', hint: 'Ad creative and media buying' },
  { id: 'video', label: 'Video Editing', hint: 'Video editing requests' },
  { id: 'ghl', label: 'CRM / LeadConnector', hint: 'GHL / LeadConnector projects' },
  { id: 'other', label: 'Special / Other', hint: 'Anything that doesn’t fit the other types' },
]

export function normalizeClientLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function slugPageGraderTagId(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  return slug || 'page_grader_client'
}

export function ensurePageGraderTagOption(
  clientName: string,
  options: SelectOption[],
): SelectOption {
  const normalized = normalizeClientLabel(clientName)
  const existing = options.find((o) => normalizeClientLabel(o.label) === normalized)
  if (existing) return existing

  let id = slugPageGraderTagId(clientName)
  const used = new Set(options.map((o) => o.id))
  if (used.has(id)) {
    let n = 2
    while (used.has(`${id}_${n}`)) n += 1
    id = `${id}_${n}`
  }
  return { id, label: clientName.trim(), color: 'blue' }
}

export function clientMatchesScopeName(clientName: string, scopeName: string): boolean {
  const client = normalizeClientLabel(clientName)
  const scope = normalizeClientLabel(scopeName)
  if (!client || !scope) return false
  if (client === scope) return true
  if (client.includes(scope) || scope.includes(client)) return true
  const clientFirst = client.split(' ')[0] ?? ''
  const scopeFirst = scope.split(' ')[0] ?? ''
  return Boolean(clientFirst && scopeFirst && clientFirst === scopeFirst)
}

export function resolveDefaultPageGraderClientId(input: {
  clients: PageGraderClient[]
  clientTagMap: PageGraderClientTagMap
  clientScopeMap?: PageGraderClientScopeMap
  selectedTagIds: string[]
  tagOptions: SelectOption[]
  spaceId?: string | null
  campaignId?: string | null
  campaignName?: string | null
}): string | null {
  if (input.clients.length === 0) return null

  const scopeMap = input.clientScopeMap ?? {}
  const spaceId = input.spaceId?.trim() || null
  const campaignId = input.campaignId?.trim() || null

  if (spaceId) {
    for (const client of input.clients) {
      const mapped = scopeMap[client.id]
      if (mapped?.space_id && mapped.space_id === spaceId) return client.id
    }
  }

  if (campaignId) {
    for (const client of input.clients) {
      const mapped = scopeMap[client.id]
      if (mapped?.campaign_id === campaignId) return client.id
    }
  }

  const selected = new Set(input.selectedTagIds)
  if (selected.size > 0) {
    for (const client of input.clients) {
      const mapped = input.clientTagMap[client.id]
      if (mapped && selected.has(mapped.tag_id)) return client.id
    }

    for (const client of input.clients) {
      const label = normalizeClientLabel(client.name)
      const option = input.tagOptions.find((o) => normalizeClientLabel(o.label) === label)
      if (option && selected.has(option.id)) return client.id
    }
  }

  const campaignName = input.campaignName?.trim() || null
  if (campaignName) {
    for (const client of input.clients) {
      if (clientMatchesScopeName(client.name, campaignName)) return client.id
    }
  }

  return null
}

export function collectSelectedTagIds(
  items: Array<{ custom_data?: Record<string, unknown> }>,
): string[] {
  const ids = new Set<string>()
  for (const item of items) {
    const tags = item.custom_data?.tags
    if (!Array.isArray(tags)) continue
    for (const tag of tags) {
      if (typeof tag === 'string' && tag.trim()) ids.add(tag)
    }
  }
  return [...ids]
}
