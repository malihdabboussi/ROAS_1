import { marked } from 'marked'

const lastMediaFolderIdByHost = new Map<string, string>()

/**
 * Restores `*.supabase.co` host when agent-api ResponseFilter removed the word `supabase`
 * from streamed text (persisted as `https://<ref>..co/storage/v1/...`).
 */
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
    return `<div class="mermaid-placeholder flex items-center justify-center gap-2.5 overflow-x-auto rounded-lg p-6" style="background:rgba(var(--color-secondary-rgb,30,30,30),0.5);min-height:60px" data-mermaid-code="${encodeURIComponent(text)}"><span class="mermaid-orb-pulse"></span><span class="text-shimmer-gradient" style="font-size:12px;font-weight:500;animation:shimmer 4s infinite linear">Rendering diagram…</span></div>`
  }
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const langClass = lang ? ` class="language-${lang}"` : ''
  return `<div class="chat-markdown-code-block chat-markdown-code-block--wrap"><pre><code${langClass}>${escaped}</code></pre></div>`
}

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
})

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

/**
 * Shared chat markdown styles for readable message content.
 */
export const CHAT_MARKDOWN_CLASSNAME =
  '[&_a]:text-emerald-400 [&_a]:underline [&_a]:break-all [&_a:hover]:no-underline [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--color-primary)]/30 [&_blockquote]:pl-4 [&_blockquote]:text-[var(--color-muted-foreground)] [&_blockquote]:italic [&_code]:rounded [&_code]:bg-[var(--color-secondary)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_hr]:my-4 [&_hr]:border-t [&_hr]:border-[var(--color-border)] [&_li]:leading-relaxed [&_ol]:mb-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-3 [&_p]:break-words [&_p]:leading-relaxed [&_.chat-markdown-code-block]:mb-3 [&_.chat-markdown-code-block_pre]:mb-0 [&_.chat-markdown-code-block_pre]:rounded-lg [&_.chat-markdown-code-block_pre]:bg-transparent [&_.chat-markdown-code-block_pre]:p-4 [&_.chat-markdown-code-block_pre_code]:bg-transparent [&_.chat-markdown-code-block_pre_code]:p-0 [&_.chat-markdown-code-block_pre_code]:text-xs [&_table]:mb-3 [&_table]:w-full [&_table]:table-auto [&_table]:border-collapse [&_table]:text-sm [&_thead]:border-b [&_thead]:border-border [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:text-[var(--color-muted-foreground)] [&_ul]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1'

/** Common filler phrases agents embed in table cells; stripped before render. */
const TABLE_CELL_FILLER_PHRASES = [
  /Give me a second while I finish this for you\.?/gi,
  /One moment(?: please)?\.?/gi,
  /Let me (?:check|find|look)(?: that)?(?: up)?\.?/gi,
  /Just a (?:sec|moment|second)\.?/gi,
]

/**
 * Repair malformed GFM tables from agent output (broken separators, embedded filler text).
 */
function repairMalformedMarkdownTables(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length) {
        const row = lines[i] ?? ''
        const rowTrimmed = row.trim()
        const isTableRow =
          rowTrimmed.startsWith('|') && (rowTrimmed.endsWith('|') || rowTrimmed.includes('-'))
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
          if (sepCols !== headerCols) {
            cleaned[1] = validSeparator
          }
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

/**
 * Split long plain paragraphs into smaller markdown paragraphs for readability.
 */
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
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/**
 * Render markdown to HTML for chat bubbles (GFM table support included).
 */
export function renderChatMarkdown(text: string): string {
  const emDashToComma = text.replace(/\u2014/g, ',')
  const decoded = decodeUnicodeEscapes(emDashToComma)
  const input = healRedactedSupabaseStorageUrls(decoded)
  const repaired = repairMalformedMarkdownTables(input)
  const withReadableBreaks = splitLongMarkdownParagraphs(repaired)
  const html = marked.parse(withReadableBreaks) as string
  const afterSwatches = injectColorSwatches(html)
  return afterSwatches
}
