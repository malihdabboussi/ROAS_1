import type { AtMentionItem } from './chat-input-at-mentions'

export function asEntitySearchResults(value: unknown): Array<{
  id: string
  label: string
  iconUrl?: string | null
  personKind?: 'portal_user' | 'managed_person'
  brainId?: string | null
}> {
  if (!value || typeof value !== 'object') return []
  const results = (value as { results?: unknown }).results
  return Array.isArray(results)
    ? (results as Array<{
        id: string
        label: string
        iconUrl?: string | null
        personKind?: 'portal_user' | 'managed_person'
        brainId?: string | null
      }>)
    : []
}

export function pushNamedArtifacts(
  items: AtMentionItem[],
  result: PromiseSettledResult<unknown>,
  type: string,
) {
  if (result.status !== 'fulfilled') return
  for (const row of asNamedRows(result.value)) {
    items.push({
      id: row.id,
      label: row.name ?? `Untitled ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      section: 'artifact',
      type,
    })
  }
}

export function pushMediaItems(items: AtMentionItem[], result: PromiseSettledResult<unknown>) {
  if (result.status !== 'fulfilled') return
  for (const media of asMediaAssets(result.value)) {
    items.push({
      id: media.id,
      label: media.name,
      section: 'media',
      type: media.mime_type,
      thumbnailUrl: media.public_url ?? undefined,
    })
  }
}

export function pushMissionItems(items: AtMentionItem[], result: PromiseSettledResult<unknown>) {
  if (result.status !== 'fulfilled') return
  for (const mission of asMissionRows(result.value)) {
    items.push({
      id: mission.id,
      label: mission.title ?? 'Untitled Mission',
      section: 'mission',
      type: mission.status,
    })
  }
}

export type CampaignMentionRow = {
  id: string
  name: string
  updatedAt: string
  isSystem: boolean
}

function isSystemCampaignConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return false
  const record = config as Record<string, unknown>
  const systemKind = typeof record.system_kind === 'string' ? record.system_kind : ''
  return record.isSystem === true || systemKind === 'personal' || systemKind === 'general'
}

export function asCampaignRows(value: unknown): CampaignMentionRow[] {
  if (!Array.isArray(value)) return []
  const rows: CampaignMentionRow[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const record = row as {
      id?: unknown
      name?: unknown
      updated_at?: unknown
      config?: unknown
    }
    if (typeof record.id !== 'string' || record.id.length === 0) continue
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    rows.push({
      id: record.id,
      name: name.length > 0 ? name : 'Untitled',
      updatedAt: typeof record.updated_at === 'string' ? record.updated_at : '',
      isSystem: isSystemCampaignConfig(record.config),
    })
  }
  return rows
}

export function sortCampaignMentionRows(rows: CampaignMentionRow[]): CampaignMentionRow[] {
  return [...rows].sort((left, right) => {
    if (left.isSystem !== right.isSystem) return left.isSystem ? 1 : -1
    return right.updatedAt.localeCompare(left.updatedAt)
  })
}

export function sameAtMentionItems(a: AtMentionItem[], b: AtMentionItem[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => {
    const next = b[index]
    return (
      item.id === next?.id &&
      item.label === next.label &&
      item.section === next.section &&
      item.type === next.type &&
      item.thumbnailUrl === next.thumbnailUrl &&
      item.brainId === next.brainId
    )
  })
}

export function sameCampaignRows(
  a: Array<{ id: string; name: string }>,
  b: Array<{ id: string; name: string }>,
): boolean {
  if (a.length !== b.length) return false
  return a.every((campaign, index) => {
    const next = b[index]
    return campaign.id === next?.id && campaign.name === next.name
  })
}

function asNamedRows(value: unknown): Array<{ id: string; name: string | null }> {
  return Array.isArray(value) ? (value as Array<{ id: string; name: string | null }>) : []
}

function asMediaAssets(value: unknown): Array<{
  id: string
  name: string
  mime_type?: string
  public_url?: string | null
}> {
  if (!value || typeof value !== 'object') return []
  const assets = (value as { assets?: unknown }).assets
  return Array.isArray(assets)
    ? (assets as Array<{
        id: string
        name: string
        mime_type?: string
        public_url?: string | null
      }>)
    : []
}

function asMissionRows(value: unknown): Array<{ id: string; title: string; status?: string }> {
  return Array.isArray(value)
    ? (value as Array<{ id: string; title: string; status?: string }>)
    : []
}
