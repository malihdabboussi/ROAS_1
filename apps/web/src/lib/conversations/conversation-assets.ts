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
  let imageMatch: RegExpExecArray | null
  while ((imageMatch = IMAGE_URL_REGEX.exec(cleaned)) !== null) {
    const alt = imageMatch[1] ?? 'Image'
    const url = imageMatch[2] ?? imageMatch[3] ?? ''
    if (url) pushUniqueUrl(map, { kind: 'image', url, label: alt })
  }

  VIDEO_URL_REGEX.lastIndex = 0
  let videoMatch: RegExpExecArray | null
  while ((videoMatch = VIDEO_URL_REGEX.exec(cleaned)) !== null) {
    const url = videoMatch[1] ?? ''
    if (url) pushUniqueUrl(map, { kind: 'video', url, label: 'Video' })
  }

  AUDIO_URL_REGEX.lastIndex = 0
  let audioMatch: RegExpExecArray | null
  while ((audioMatch = AUDIO_URL_REGEX.exec(cleaned)) !== null) {
    const url = audioMatch[1] ?? ''
    if (url) pushUniqueUrl(map, { kind: 'audio', url, label: 'Audio' })
  }

  return [...map.values()]
}

export function extractLinksFromText(text: string): ExtractedLinkItem[] {
  const map = new Map<string, ExtractedLinkItem>()
  const cleaned = text.replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/g, '').trim()

  MARKDOWN_LINK_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = MARKDOWN_LINK_REGEX.exec(cleaned)) !== null) {
    const url = match[2] ?? ''
    const title = (match[1] ?? '').trim() || url
    if (url && !isMediaUrl(url)) map.set(url, { url, title })
  }

  BARE_URL_REGEX.lastIndex = 0
  while ((match = BARE_URL_REGEX.exec(cleaned)) !== null) {
    const url = match[1] ?? ''
    if (!url || isMediaUrl(url)) continue
    if (!map.has(url)) map.set(url, { url, title: truncateHost(url) })
  }

  return [...map.values()]
}

function isMediaUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(lower) ||
    /\.(mp4|webm|mov)(\?|$)/i.test(lower) ||
    /\.(mp3|wav|ogg|aac|m4a)(\?|$)/i.test(lower)
  )
}

function truncateHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
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
