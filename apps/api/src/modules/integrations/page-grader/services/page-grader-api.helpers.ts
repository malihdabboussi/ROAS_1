import { BadRequestException } from '@nestjs/common'

export const PAGE_GRADER_PROVIDER = 'page_grader'
export const PAGE_GRADER_LABEL_BASE_URL = 'base_url'
export const PAGE_GRADER_LABEL_API_KEY = 'api_key'

export type PageGraderClientScopeEntry = {
  campaign_id: string
  campaign_name?: string
  space_id?: string | null
  space_title?: string | null
  content_hash?: string | null
  campaign_space_hash?: string | null
  last_synced_at?: string | null
  last_sync_status?: string | null
}

export type PageGraderSendResult = {
  space_item_id: string
  status: 'created' | 'skipped_already_sent' | 'failed'
  work_id?: string
  work_url?: string
  clickup_task_id?: string | null
  clickup_task_url?: string | null
  assignee_resolution?: Array<{
    email: string
    status: 'mapped' | 'unmapped'
    page_grader_user_id?: string
  }>
  error?: string
}

export const FALLBACK_PAGE_GRADER_TASK_TYPES: Array<{ id: string; label: string; hint: string }> = [
  { id: 'design', label: 'Graphics', hint: 'Design / graphic design requests' },
  { id: 'copy', label: 'Copywriting', hint: 'Copy and messaging requests' },
  { id: 'funnel', label: 'Funnels & Pages', hint: 'Funnel builds and landing pages' },
  { id: 'ad', label: 'Ads & Media Buying', hint: 'Ad creative and media buying' },
  { id: 'video', label: 'Video Editing', hint: 'Video editing requests' },
  { id: 'ghl', label: 'CRM / LeadConnector', hint: 'GHL / LeadConnector projects' },
  { id: 'other', label: 'Special / Other', hint: 'Anything that doesn’t fit the other types' },
]

export function parseClientScopeMap(raw: unknown): Record<string, PageGraderClientScopeEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, PageGraderClientScopeEntry> = {}
  for (const [clientId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!clientId || !value || typeof value !== 'object' || Array.isArray(value)) continue
    const row = value as Record<string, unknown>
    const campaignId = typeof row.campaign_id === 'string' ? row.campaign_id.trim() : ''
    if (!campaignId) continue
    const campaignName =
      typeof row.campaign_name === 'string' && row.campaign_name.trim()
        ? row.campaign_name.trim()
        : undefined
    const spaceId =
      typeof row.space_id === 'string' && row.space_id.trim()
        ? row.space_id.trim()
        : row.space_id === null
          ? null
          : undefined
    const spaceTitle =
      typeof row.space_title === 'string' && row.space_title.trim()
        ? row.space_title.trim()
        : undefined
    const contentHash =
      typeof row.content_hash === 'string' && row.content_hash.trim()
        ? row.content_hash.trim()
        : row.content_hash === null
          ? null
          : undefined
    const campaignSpaceHash =
      typeof row.campaign_space_hash === 'string' && row.campaign_space_hash.trim()
        ? row.campaign_space_hash.trim()
        : row.campaign_space_hash === null
          ? null
          : undefined
    const lastSyncedAt =
      typeof row.last_synced_at === 'string' && row.last_synced_at.trim()
        ? row.last_synced_at.trim()
        : row.last_synced_at === null
          ? null
          : undefined
    const lastSyncStatus =
      typeof row.last_sync_status === 'string' && row.last_sync_status.trim()
        ? row.last_sync_status.trim()
        : row.last_sync_status === null
          ? null
          : undefined
    out[clientId] = {
      campaign_id: campaignId,
      ...(campaignName ? { campaign_name: campaignName } : {}),
      ...(spaceId !== undefined ? { space_id: spaceId } : {}),
      ...(spaceTitle ? { space_title: spaceTitle } : {}),
      ...(contentHash !== undefined ? { content_hash: contentHash } : {}),
      ...(campaignSpaceHash !== undefined ? { campaign_space_hash: campaignSpaceHash } : {}),
      ...(lastSyncedAt !== undefined ? { last_synced_at: lastSyncedAt } : {}),
      ...(lastSyncStatus !== undefined ? { last_sync_status: lastSyncStatus } : {}),
    }
  }
  return out
}

export function safeHost(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).host
  } catch {
    return null
  }
}

export function derivePageGraderMcpUrl(baseUrl: string): string {
  const url = new URL(baseUrl.trim())
  url.search = ''
  url.hash = ''
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/roas-api$/i, '/page-grader-mcp')
  if (!url.pathname.endsWith('/page-grader-mcp')) {
    throw new BadRequestException(
      'The ROAS Portal API URL must end in /roas-api so its connection can be configured',
    )
  }
  return url.toString().replace(/\/$/, '')
}

export function mapRoasPriority(raw: unknown): string {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (value === 'urgent' || value === 'high' || value === 'low' || value === 'normal') return value
  if (value === 'medium') return 'normal'
  return 'normal'
}

export function buildDescription(
  item: Record<string, unknown>,
  parentContext: Record<string, unknown>,
): string {
  const parts: string[] = []
  const notes = typeof item.notes === 'string' ? item.notes.trim() : ''
  const description = typeof item.description === 'string' ? item.description.trim() : ''
  if (description) parts.push(description)
  // Skip notes when they are an exact copy of description (legacy finalize
  // wrote both columns to the same draft brief, which duplicated ClickUp body).
  if (notes && notes !== description) parts.push(notes)
  if (parentContext.parent_meeting_title) {
    parts.push(`From meeting: ${String(parentContext.parent_meeting_title)}`)
  }
  return parts.join('\n\n')
}

/** Appends operator note to Space notes once; returns null when nothing to write. */
export function mergeOperatorNoteIntoNotes(
  existingNotes: string,
  operatorNote: string,
): string | null {
  if (!operatorNote) return null
  const marker = `Operator note: ${operatorNote}`
  if (existingNotes.includes(marker)) return existingNotes
  if (!existingNotes) return marker
  return `${existingNotes}\n\n${marker}`
}

export async function getPageGraderCreds(
  vault: { getSecret: (userId: string, provider: string, label: string) => Promise<string | null> },
  userId: string,
): Promise<{ baseUrl: string; apiKey: string }> {
  const [baseUrl, apiKey] = await Promise.all([
    vault.getSecret(userId, PAGE_GRADER_PROVIDER, PAGE_GRADER_LABEL_BASE_URL),
    vault.getSecret(userId, PAGE_GRADER_PROVIDER, PAGE_GRADER_LABEL_API_KEY),
  ])
  if (!baseUrl || !apiKey) throw new BadRequestException('The ROAS Portal is not connected')
  return { baseUrl, apiKey }
}
