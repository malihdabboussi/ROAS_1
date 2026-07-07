/**
 * Extract media URLs and links from plain chat message text (mirrors MessageBubble parsing).
 */

const IMAGE_URL_REGEX =
  /(?:!\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|webp|gif)[^\s)]*)\)|(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s]*)?))/gi

const VIDEO_URL_REGEX = /(https?:\/\/[^\s)]+\.(?:mp4|webm|mov)(?:\?[^\s)]*)?)/gi

const AUDIO_URL_REGEX = /(https?:\/\/[^\s)]+\.(?:mp3|wav|ogg|aac|m4a)(?:\?[^\s)]*)?)/gi

const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g

const BARE_URL_REGEX = /(https?:\/\/[^\s<>()[\]]+)/gi

export interface ExtractedMediaItem {
  kind: 'image' | 'video' | 'audio'
  url: string
  label?: string
}

export interface ExtractedLinkItem {
  url: string
  title: string
}

function pushUniqueUrl(map: Map<string, ExtractedMediaItem>, item: ExtractedMediaItem) {
  if (!item.url || map.has(item.url)) return
  map.set(item.url, item)
}

export function extractMediaFromText(text: string): ExtractedMediaItem[] {
  const map = new Map<string, ExtractedMediaItem>()
  const cleaned = text.replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/g, '').trim()

  IMAGE_URL_REGEX.lastIndex = 0
  let imgMatch: RegExpExecArray | null
  while ((imgMatch = IMAGE_URL_REGEX.exec(cleaned)) !== null) {
    const alt = imgMatch[1] ?? 'Image'
    const url = imgMatch[2] ?? imgMatch[3] ?? ''
    if (url) pushUniqueUrl(map, { kind: 'image', url, label: alt })
  }

  VIDEO_URL_REGEX.lastIndex = 0
  let vidMatch: RegExpExecArray | null
  while ((vidMatch = VIDEO_URL_REGEX.exec(cleaned)) !== null) {
    const url = vidMatch[1] ?? ''
    if (url) pushUniqueUrl(map, { kind: 'video', url, label: 'Video' })
  }

  AUDIO_URL_REGEX.lastIndex = 0
  let audMatch: RegExpExecArray | null
  while ((audMatch = AUDIO_URL_REGEX.exec(cleaned)) !== null) {
    const url = audMatch[1] ?? ''
    if (url) pushUniqueUrl(map, { kind: 'audio', url, label: 'Audio' })
  }

  return [...map.values()]
}

export function extractLinksFromText(text: string): ExtractedLinkItem[] {
  const map = new Map<string, ExtractedLinkItem>()
  const cleaned = text.replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/g, '').trim()

  MARKDOWN_LINK_REGEX.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = MARKDOWN_LINK_REGEX.exec(cleaned)) !== null) {
    const url = m[2] ?? ''
    const title = (m[1] ?? '').trim() || url
    if (url && !isImageOrVideoUrl(url)) map.set(url, { url, title })
  }

  BARE_URL_REGEX.lastIndex = 0
  while ((m = BARE_URL_REGEX.exec(cleaned)) !== null) {
    const url = m[1] ?? ''
    if (!url || isImageOrVideoUrl(url)) continue
    if (!map.has(url)) map.set(url, { url, title: truncateHost(url) })
  }

  return [...map.values()]
}

function isImageOrVideoUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(lower) ||
    /\.(mp4|webm|mov)(\?|$)/i.test(lower) ||
    /\.(mp3|wav|ogg|aac|m4a)(\?|$)/i.test(lower)
  )
}

function truncateHost(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.slice(0, 48)
  }
}

const ARTIFACT_DOC_TYPES = new Set([
  'offer',
  'avatar',
  'funnel',
  'presentation',
  'sequence',
  'email',
])

export function isArtifactDocumentType(
  documentType: string,
): documentType is 'offer' | 'avatar' | 'funnel' | 'presentation' | 'sequence' | 'email' {
  return ARTIFACT_DOC_TYPES.has(documentType)
}
