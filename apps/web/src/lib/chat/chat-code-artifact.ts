import {
  downloadCSS,
  downloadHTML,
  openArtifactInShell,
  sanitizeFilename,
  type ShellArtifactViewerTarget,
} from '@/lib/artifacts'

export type ChatCodeArtifactLanguage = 'html' | 'css' | 'svg'

export type ChatCodeArtifactSegment =
  | { kind: 'markdown'; text: string }
  | {
      kind: 'code'
      language: ChatCodeArtifactLanguage
      title: string
      code: string
    }

const MIME_BY_LANGUAGE: Record<ChatCodeArtifactLanguage, string> = {
  html: 'text/html',
  css: 'text/css',
  svg: 'image/svg+xml',
}
const LANGUAGE_BY_MIME: Record<string, ChatCodeArtifactLanguage> = {
  'text/html': 'html',
  'text/css': 'css',
  'image/svg+xml': 'svg',
}
const CLOSED_FENCE = /(```|~~~)[ \t]*([^\n]*)\r?\n([\s\S]*?)\1/g
const LANGUAGE_LABEL: Record<ChatCodeArtifactLanguage, string> = {
  html: 'HTML',
  css: 'CSS',
  svg: 'SVG',
}

export function chatCodeArtifactLanguageLabel(language: ChatCodeArtifactLanguage): string {
  return LANGUAGE_LABEL[language]
}

export function chatCodeArtifactLanguageFromMime(
  mimeType: string | null | undefined,
): ChatCodeArtifactLanguage | null {
  if (!mimeType) return null
  return LANGUAGE_BY_MIME[mimeType] ?? null
}

export function looksLikePreviewableHtml(code: string): boolean {
  const trimmed = code.trim()
  if (trimmed.length < 40) return false
  if (/<!DOCTYPE html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) return true
  const tagCount = (trimmed.match(/<\/?[a-z][\w:-]*\b/gi) ?? []).length
  return tagCount >= 4 && /<(div|section|style|link|header|button|form|svg)\b/i.test(trimmed)
}

export function titleFromChatCode(code: string, language: ChatCodeArtifactLanguage): string {
  const comment = code.match(/<!--\s*([^\n*]{3,80}?)\s*-->/)
  if (comment?.[1]) return cleanTitle(comment[1])
  const heading = code.match(/<h[1-3][^>]*>([^<]{3,80})<\/h[1-3]>/i)
  if (heading?.[1]) return cleanTitle(heading[1])
  const className = code.match(/class=["']([\w-]+)/)
  if (className?.[1]) return cleanTitle(className[1].replace(/__/g, ' ').replace(/[-_]/g, ' '))
  return LANGUAGE_LABEL[language]
}

export function toChatCodePreviewSrcDoc(code: string, language: ChatCodeArtifactLanguage): string {
  const trimmed = code.trim()
  if (language === 'css') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${trimmed}</style></head><body></body></html>`
  }
  if (language === 'svg' && /<svg[\s>]/i.test(trimmed) && !isFullHtmlDocument(trimmed)) {
    return wrapHtmlFragment(trimmed)
  }
  if (isFullHtmlDocument(trimmed)) return trimmed
  return wrapHtmlFragment(trimmed)
}

export function downloadChatCodeArtifact(
  code: string,
  title: string,
  language: ChatCodeArtifactLanguage,
): string {
  if (language === 'css') return downloadCSS(code, title)
  return downloadHTML(toChatCodePreviewSrcDoc(code, language), title)
}

export function chatCodeArtifactFileName(
  title: string,
  language: ChatCodeArtifactLanguage,
): string {
  const extension = language === 'css' ? 'css' : language === 'svg' ? 'svg' : 'html'
  return `${sanitizeFilename(title)}.${extension}`
}

export function splitChatCodeArtifactSegments(text: string): ChatCodeArtifactSegment[] {
  const segments: ChatCodeArtifactSegment[] = []
  let cursor = 0
  CLOSED_FENCE.lastIndex = 0
  for (let match = CLOSED_FENCE.exec(text); match; match = CLOSED_FENCE.exec(text)) {
    const info = (match[2] ?? '').trim()
    const [rawLang, ...rest] = info.split(/\s+/)
    const language = resolveLanguage(rawLang, match[3] ?? '')
    if (!language) continue
    if (match.index > cursor) {
      segments.push({ kind: 'markdown', text: text.slice(cursor, match.index) })
    }
    const code = (match[3] ?? '').trim()
    const fenceTitle = rest.join(' ').trim()
    segments.push({
      kind: 'code',
      language,
      title: fenceTitle || titleFromChatCode(code, language),
      code,
    })
    cursor = match.index + match[0].length
  }
  const tail = text.slice(cursor)
  if (tail) segments.push({ kind: 'markdown', text: tail })
  return segments.length > 0 ? segments : [{ kind: 'markdown', text }]
}

export function isShellCodeArtifactTarget(
  target: ShellArtifactViewerTarget,
): target is ShellArtifactViewerTarget & { content: string } {
  return (
    !target.entityId &&
    typeof target.content === 'string' &&
    target.content.length > 0 &&
    chatCodeArtifactLanguageFromMime(target.mimeType) !== null
  )
}

export function openCodeArtifactInShell(input: {
  title: string
  language: ChatCodeArtifactLanguage
  code: string
}): void {
  openArtifactInShell({
    id: `code:${input.language}:${hashCode(input.code)}`,
    title: input.title,
    type: 'doc',
    content: input.code,
    mimeType: MIME_BY_LANGUAGE[input.language],
    fileName: chatCodeArtifactFileName(input.title, input.language),
    contextLabel: 'Chat',
  })
}

function resolveLanguage(
  rawLang: string | undefined,
  code: string,
): ChatCodeArtifactLanguage | null {
  const fromLang = normalizeLanguage(rawLang)
  if (fromLang) return fromLang
  if (!rawLang && looksLikePreviewableHtml(code)) return 'html'
  return null
}

function normalizeLanguage(language: string | null | undefined): ChatCodeArtifactLanguage | null {
  const normalized = (language ?? '').trim().toLowerCase()
  if (normalized === 'htm' || normalized === 'html') return 'html'
  if (normalized === 'css') return 'css'
  if (normalized === 'svg') return 'svg'
  return null
}

function isFullHtmlDocument(code: string): boolean {
  return /<!DOCTYPE/i.test(code) || /<html[\s>]/i.test(code)
}

function wrapHtmlFragment(fragment: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${fragment}</body></html>`
}

function cleanTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function hashCode(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}
