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

export function asCampaignRows(value: unknown): Array<{ id: string; name: string | null }> {
  return Array.isArray(value) ? (value as Array<{ id: string; name: string | null }>) : []
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
