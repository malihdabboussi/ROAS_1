import { MENU_GROUP_PREVIEW } from './chat-input-constants'

export interface AtMentionItem {
  id: string
  label: string
  section: 'artifact' | 'media' | 'mission' | 'space-task' | 'person'
  /** Artifact sub-type, media mime_type, mission status label, or space-task status (for filter). */
  type?: string
  /** Public URL for inline thumbnail (media assets). */
  thumbnailUrl?: string
  /** Space task row: OptionDot color (preset name, hex, or gradient). */
  spaceTaskStatusColor?: string
  /** Durable Person Brain connected to this identity, when available. */
  brainId?: string
}

export type StudioArtifactNavRow =
  | {
      kind: 'header'
      typeKey: string
      heading: string
      count: number
      collapsed: boolean
    }
  | { kind: 'artifact-item'; item: AtMentionItem }
  | { kind: 'artifact-more'; typeKey: string; remaining: number }

export function groupStudioArtifactItems(items: AtMentionItem[]): Array<{
  typeKey: string
  heading: string
  items: AtMentionItem[]
}> {
  const by = new Map<string, AtMentionItem[]>()
  for (const it of items) {
    const raw = it.type?.trim() ?? ''
    const key = raw.length > 0 ? raw : '_other'
    let list = by.get(key)
    if (!list) {
      list = []
      by.set(key, list)
    }
    list.push(it)
  }
  const keys = [...by.keys()].sort((a, b) => {
    if (a === '_other') return 1
    if (b === '_other') return -1
    return a.localeCompare(b)
  })
  const headingFor = (typeKey: string): string => {
    if (typeKey === '_other') return 'Other'
    const map: Record<string, string> = {
      offer: 'Offers',
      funnel: 'Funnels',
      sequence: 'Sequences',
      presentation: 'Presentations',
      avatar: 'Avatars',
    }
    if (map[typeKey]) return map[typeKey]
    return typeKey
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
      .join(' ')
  }
  return keys.map((typeKey) => ({
    typeKey,
    heading: headingFor(typeKey),
    items: by.get(typeKey)!,
  }))
}

export function buildStudioArtifactNavRows(
  groups: Array<{ typeKey: string; heading: string; items: AtMentionItem[] }>,
  collapsedByType: Record<string, boolean>,
  moreOpenByType: Record<string, boolean>,
): StudioArtifactNavRow[] {
  const rows: StudioArtifactNavRow[] = []
  for (const g of groups) {
    const isCollapsed = collapsedByType[g.typeKey] === true
    rows.push({
      kind: 'header',
      typeKey: g.typeKey,
      heading: g.heading,
      count: g.items.length,
      collapsed: isCollapsed,
    })
    if (isCollapsed) continue
    const showAll = moreOpenByType[g.typeKey] === true
    const cap = showAll ? g.items.length : Math.min(g.items.length, MENU_GROUP_PREVIEW)
    const visible = g.items.slice(0, cap)
    for (const item of visible) rows.push({ kind: 'artifact-item', item })
    const remaining = g.items.length - visible.length
    if (remaining > 0) rows.push({ kind: 'artifact-more', typeKey: g.typeKey, remaining })
  }
  return rows
}

const MEDIA_BUCKET_KEYS_ORDER = ['image', 'video', 'audio', 'pdf', 'document', '_other'] as const

export function studioMediaBucketKey(item: AtMentionItem): string {
  const mime = (item.type ?? '').trim().toLowerCase()
  const url = item.thumbnailUrl ?? ''
  if (!mime) {
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(url)) return 'image'
    if (/\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(url)) return 'video'
    if (/\.(mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/i.test(url)) return 'audio'
    return '_other'
  }
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf') return 'pdf'
  if (
    mime.startsWith('text/') ||
    mime.startsWith('application/vnd.') ||
    mime.startsWith('application/msword') ||
    mime.includes('wordprocessingml') ||
    mime.includes('spreadsheetml') ||
    mime.includes('presentationml') ||
    mime === 'application/json' ||
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed'
  )
    return 'document'
  return '_other'
}

export function sortMediaBucketKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = MEDIA_BUCKET_KEYS_ORDER.indexOf(a as (typeof MEDIA_BUCKET_KEYS_ORDER)[number])
    const ib = MEDIA_BUCKET_KEYS_ORDER.indexOf(b as (typeof MEDIA_BUCKET_KEYS_ORDER)[number])
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

export function mediaHeadingForBucket(typeKey: string): string {
  const map: Record<string, string> = {
    image: 'Images',
    video: 'Videos',
    audio: 'Audio',
    pdf: 'PDF',
    document: 'Documents',
    _other: 'Other',
  }
  return map[typeKey] ?? 'Other'
}

export type StudioMediaNavRow =
  | {
      kind: 'header'
      typeKey: string
      heading: string
      count: number
      collapsed: boolean
    }
  | { kind: 'media-item'; item: AtMentionItem }
  | { kind: 'media-more'; typeKey: string; remaining: number }

export function groupStudioMediaItems(items: AtMentionItem[]): Array<{
  typeKey: string
  heading: string
  items: AtMentionItem[]
}> {
  const by = new Map<string, AtMentionItem[]>()
  for (const it of items) {
    const key = studioMediaBucketKey(it)
    let list = by.get(key)
    if (!list) {
      list = []
      by.set(key, list)
    }
    list.push(it)
  }
  return sortMediaBucketKeys([...by.keys()]).map((typeKey) => ({
    typeKey,
    heading: mediaHeadingForBucket(typeKey),
    items: by.get(typeKey)!,
  }))
}

export function buildStudioMediaNavRows(
  groups: Array<{ typeKey: string; heading: string; items: AtMentionItem[] }>,
  collapsedByType: Record<string, boolean>,
  moreOpenByType: Record<string, boolean>,
): StudioMediaNavRow[] {
  const rows: StudioMediaNavRow[] = []
  for (const g of groups) {
    const isCollapsed = collapsedByType[g.typeKey] === true
    rows.push({
      kind: 'header',
      typeKey: g.typeKey,
      heading: g.heading,
      count: g.items.length,
      collapsed: isCollapsed,
    })
    if (isCollapsed) continue
    const showAll = moreOpenByType[g.typeKey] === true
    const cap = showAll ? g.items.length : Math.min(g.items.length, MENU_GROUP_PREVIEW)
    const visible = g.items.slice(0, cap)
    for (const item of visible) rows.push({ kind: 'media-item', item })
    const remaining = g.items.length - visible.length
    if (remaining > 0) rows.push({ kind: 'media-more', typeKey: g.typeKey, remaining })
  }
  return rows
}

export type StudioAtMenuTabId =
  | 'people'
  | 'tasks'
  | 'artifacts'
  | 'media'
  | 'missions'
  | 'campaigns'
