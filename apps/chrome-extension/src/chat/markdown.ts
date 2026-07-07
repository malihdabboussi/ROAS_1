import { marked } from 'marked'

const lastMediaFolderIdByHost = new Map<string, string>()

export function healRedactedSupabaseStorageUrls(text: string): string {
  let out = text.replace(
    /(https?:\/\/)([a-z0-9]{15,})\.\.co(?=\/storage\/v1\/)/gi,
    '$1$2.supabase.co',
  )
  out = out.replace(/(https?:\/\/)([a-z0-9]{15,})\.\.in(?=\/storage\/v1\/)/gi, '$1$2.supabase.in')
  const validMediaUrlRegex =
    /(https?:\/\/)([a-z0-9.-]+)(\/storage\/v1\/object\/sign\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(images|documents|videos)\/)/gi
  const mediaFolderIdsInThisText: string[] = []
  for (const m of out.matchAll(validMediaUrlRegex)) {
    const host = m[2]
    const folderId = m[4]
    if (!host || !folderId) continue
    lastMediaFolderIdByHost.set(host.toLowerCase(), folderId)
    mediaFolderIdsInThisText.push(folderId)
  }
  const fallbackMediaFolderId = mediaFolderIdsInThisText[0]

  out = out.replace(
    /(https?:\/\/)([a-z0-9.-]+)(\/storage\/v1\/object\/sign\/media\/\/)(images|documents|videos)\//gi,
    (_full, proto: string, host: string, prefix: string, kind: string) => {
      const cached = lastMediaFolderIdByHost.get(String(host).toLowerCase())
      const folderId = cached ?? fallbackMediaFolderId
      if (!folderId) return `${proto}${host}${prefix}${kind}/`
      return `${proto}${host}/storage/v1/object/sign/media/${folderId}/${kind}/`
    },
  )
  return out
}

const renderer = new marked.Renderer()
renderer.link = ({ href, title, text }) => {
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
}
renderer.code = ({ text, lang }) => {
  if (lang === 'mermaid') {
    return `<div class="mermaid-placeholder flex items-center justify-center gap-2.5 overflow-x-auto rounded-lg p-6" style="background:rgba(var(--color-secondary-rgb,42,42,42),0.5);min-height:60px" data-mermaid-code="${encodeURIComponent(text)}"><span class="mermaid-orb-pulse"></span><span class="text-shimmer-gradient" style="font-size:12px;font-weight:500;animation:shimmer 4s infinite linear">Rendering diagram…</span></div>`
  }
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const langClass = lang ? ` class="language-${lang}"` : ''
  return `<pre><code${langClass}>${escaped}</code></pre>`
}

marked.setOptions({ gfm: true, breaks: true, renderer })

function injectColorSwatches(html: string): string {
  return html.replace(
    /(<[^>]*>)|#([0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)\b/g,
    (_match, tag, hexBody) => {
      if (tag) return tag
      const hex = `#${hexBody}`
      return (
        '<span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle;padding:2px 0">' +
        `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${hex};border:1px solid rgba(128,128,128,0.3);flex-shrink:0"></span>` +
        `${hex}</span>`
      )
    },
  )
}

/** Mirrors apps/web `CHAT_MARKDOWN_CLASSNAME` — applied as a single class in the extension CSS file. */
export const CHAT_MARKDOWN_CLASSNAME = 'chat-markdown-prose'

const TABLE_CELL_FILLER_PHRASES = [
  /Give me a second while I finish this for you\.?/gi,
  /One moment(?: please)?\.?/gi,
  /Let me (?:check|find|look)(?: that)?(?: up)?\.?/gi,
  /Just a (?:sec|moment|second)\.?/gi,
]

function repairMalformedMarkdownTables(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const rowTrimmed = line.trim()

    if (rowTrimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length) {
        const row = lines[i] ?? ''
        const t = row.trim()
        const isTableRow = t.startsWith('|') && (t.endsWith('|') || t.includes('-'))
        if (!isTableRow) break
        tableLines.push(row)
        i++
      }

      if (tableLines.length === 0) {
        out.push(line)
        i++
        continue
      }

      const cleaned = tableLines.map((row) => {
        return TABLE_CELL_FILLER_PHRASES.reduce(
          (acc, re) =>
            acc
              .replace(re, '')
              .replace(/\s{2,}/g, ' ')
              .trim(),
          row,
        )
      })

      const firstRow = cleaned[0] ?? ''
      const headerCols = (firstRow.match(/\|/g) ?? []).length - 1
      const validSeparator = `|${Array(headerCols).fill('---').join('|')}|`

      if (cleaned.length >= 2) {
        const sep = cleaned[1] ?? ''
        const isSeparator = /^\|[\s\-:]+\|/.test(sep) && sep.includes('-')
        if (isSeparator) {
          const sepCols = (sep.match(/\|/g) ?? []).length - 1
          if (sepCols !== headerCols) cleaned[1] = validSeparator
        }
      }

      out.push(...cleaned)
      continue
    }

    out.push(line)
    i++
  }

  return out.join('\n')
}

export function splitLongMarkdownParagraphs(text: string): string {
  return text.replace(/^(?!```|`|#|>|[*-]|\d+\.|\|)(.{200,})$/gm, (line) => {
    const parts = line.split(/(?<=[.!?])\s+(?=[A-Z])/)
    if (parts.length < 4) return line
    const blocks: string[] = []
    for (let i = 0; i < parts.length; i += 2) {
      blocks.push(parts.slice(i, i + 2).join(' '))
    }
    return blocks.join('\n\n')
  })
}

function decodeUnicodeEscapes(text: string): string {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
}

export function renderChatMarkdown(text: string): string {
  const decoded = decodeUnicodeEscapes(text)
  const input = healRedactedSupabaseStorageUrls(decoded)
  const repaired = repairMalformedMarkdownTables(input)
  const withReadableBreaks = splitLongMarkdownParagraphs(repaired)
  const html = marked.parse(withReadableBreaks) as string
  return injectColorSwatches(html)
}
