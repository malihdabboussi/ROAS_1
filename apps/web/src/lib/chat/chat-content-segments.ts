import { healRedactedSupabaseStorageUrls } from '@/lib/utils/chat-markdown.utils'

export type ParsedContentSegment =
  | { type: 'text'; value: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'video'; url: string; prompt: string }
  | { type: 'audio'; url: string; prompt: string }
  | { type: 'pdf'; url: string; label: string }

const IMAGE_URL_REGEX =
  /(?:!\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|webp|gif)[^\s)]*)\)|(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s]*)?))/gi

const VIDEO_URL_REGEX =
  /(?:\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:mp4|webm|mov)[^\s)]*)\)|(https?:\/\/[^\s)]+\.(?:mp4|webm|mov)(?:\?[^\s)]*)?))/gi

const AUDIO_URL_REGEX =
  /(?:\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:mp3|wav|ogg|aac|m4a)[^\s)]*)\)|(https?:\/\/[^\s)]+\.(?:mp3|wav|ogg|aac|m4a)(?:\?[^\s)]*)?))/gi

const PDF_URL_REGEX =
  /(?:\[([^\]]+)\]\((https?:\/\/[^\s)]+\.pdf[^\s)]*)\)|(https?:\/\/[^\s]+\.pdf(?:\?[^\s]*)?))/gi

function findMatchingBrace(content: string, start: number): number {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < content.length; i++) {
    const ch = content[i]!
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function isEchoedMediaToolResult(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const obj = value as Record<string, unknown>
  if (typeof obj.media_asset_id === 'string') return true
  if (obj.operation === 'render_ig_story' || obj.operation === 'process_media') return true
  if (
    obj.success === true &&
    typeof obj.url === 'string' &&
    (obj.format === 'mp4' || typeof obj.file_path === 'string')
  ) {
    return true
  }
  return false
}

/** Drop assistant-pasted process_media / render_ig_story toolResult JSON blobs. */
export function stripEchoedMediaToolJson(content: string): string {
  let result = ''
  let i = 0
  while (i < content.length) {
    if (content[i] === '{') {
      const end = findMatchingBrace(content, i)
      if (end !== -1) {
        const slice = content.slice(i, end + 1)
        try {
          if (isEchoedMediaToolResult(JSON.parse(slice))) {
            i = end + 1
            continue
          }
        } catch {
          // Keep non-JSON brace regions as text.
        }
      }
    }
    result += content[i]
    i++
  }
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

export function parseContent(content: string): ParsedContentSegment[] {
  const healed = healRedactedSupabaseStorageUrls(content)
  const cleaned = stripEchoedMediaToolJson(
    healed.replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/g, '').trim(),
  )

  const mediaMatches: Array<{ index: number; length: number; segment: ParsedContentSegment }> = []

  IMAGE_URL_REGEX.lastIndex = 0
  let imgMatch
  while ((imgMatch = IMAGE_URL_REGEX.exec(cleaned)) !== null) {
    const alt = imgMatch[1] ?? 'Generated image'
    const url = imgMatch[2] ?? imgMatch[3] ?? ''
    if (url) {
      mediaMatches.push({
        index: imgMatch.index,
        length: imgMatch[0].length,
        segment: { type: 'image', url, alt },
      })
    }
  }

  VIDEO_URL_REGEX.lastIndex = 0
  let vidMatch
  while ((vidMatch = VIDEO_URL_REGEX.exec(cleaned)) !== null) {
    const label = vidMatch[1] ?? null
    const url = vidMatch[2] ?? vidMatch[3] ?? ''
    if (url) {
      mediaMatches.push({
        index: vidMatch.index,
        length: vidMatch[0].length,
        segment: { type: 'video', url, prompt: label || 'Generated video' },
      })
    }
  }

  AUDIO_URL_REGEX.lastIndex = 0
  let audMatch
  while ((audMatch = AUDIO_URL_REGEX.exec(cleaned)) !== null) {
    const label = audMatch[1] ?? null
    const url = audMatch[2] ?? audMatch[3] ?? ''
    if (url) {
      mediaMatches.push({
        index: audMatch.index,
        length: audMatch[0].length,
        segment: { type: 'audio', url, prompt: label || 'Audio' },
      })
    }
  }

  PDF_URL_REGEX.lastIndex = 0
  let pdfMatch
  while ((pdfMatch = PDF_URL_REGEX.exec(cleaned)) !== null) {
    const linkText = pdfMatch[1] ?? null
    const mdUrl = pdfMatch[2] ?? null
    const bareUrl = pdfMatch[3] ?? null
    const url = mdUrl ?? bareUrl ?? ''
    if (url) {
      const label = linkText ?? (url.split('/').pop()?.split('?')[0] || 'Document.pdf')
      mediaMatches.push({
        index: pdfMatch.index,
        length: pdfMatch[0].length,
        segment: { type: 'pdf', url, label },
      })
    }
  }

  mediaMatches.sort((a, b) => a.index - b.index)

  const segments: ParsedContentSegment[] = []
  let lastIndex = 0

  for (const match of mediaMatches) {
    if (match.index < lastIndex) continue
    if (match.index > lastIndex) {
      const before = cleaned.slice(lastIndex, match.index).trim()
      if (before) segments.push({ type: 'text', value: before })
    }
    segments.push(match.segment)
    lastIndex = match.index + match.length
  }

  if (lastIndex < cleaned.length) {
    const remaining = cleaned.slice(lastIndex).trim()
    if (remaining) segments.push({ type: 'text', value: remaining })
  }

  return segments
}
