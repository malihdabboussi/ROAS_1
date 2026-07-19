/**
 * Convert TipTap/space-doc HTML into Markdown for GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN.
 * Keeps headings, lists, tables, links, and basic inline marks — not a full HTML engine.
 *
 * TipTap hard breaks (`<br>`) become separate Markdown paragraphs so Google Docs
 * keeps field labels / subject+preview lines from collapsing onto one line.
 */
export function htmlToGoogleDocsMarkdown(html: string): string {
  let text = String(html ?? '')
  if (!text.trim()) return ''

  text = text
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(html|head|body|meta|title)[^>]*>/gi, '')

  // Normalize TipTap/ProseMirror hard breaks before block parsing.
  text = text.replace(/<br\s*\/?>/gi, '\n')

  text = text.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => convertTable(tableHtml))

  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, body: string) => {
    const code = decodeEntities(stripTags(body)).replace(/^\n+|\n+$/g, '')
    return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`
  })

  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, body: string) => {
    const n = Math.max(1, Math.min(6, Number.parseInt(level, 10) || 1))
    const heading = blockContentToMarkdown(body).replace(/\n+/g, ' ').trim()
    return heading ? `\n\n${'#'.repeat(n)} ${heading}\n\n` : '\n\n'
  })

  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, body: string) => {
    const inner = htmlToGoogleDocsMarkdown(body)
      .split('\n')
      .map((line) => (line.trim() ? `> ${line}` : '>'))
      .join('\n')
    return `\n\n${inner}\n\n`
  })

  text = text.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, tag: string, body: string) => {
    let i = 0
    const ordered = tag.toLowerCase() === 'ol'
    const items = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => {
      i += 1
      const prefix = ordered ? `${i}. ` : '- '
      const item = blockContentToMarkdown(match[1] ?? '')
        .replace(/\n+/g, ' ')
        .trim()
      return item ? `${prefix}${item}` : ''
    }).filter(Boolean)
    return items.length ? `\n\n${items.join('\n')}\n\n` : ''
  })

  text = text.replace(/<(p|div)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag: string, body: string) => {
    const lines = blockContentToMarkdown(body)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    if (lines.length === 0) return '\n\n'
    // One Markdown paragraph per visual line so Docs keeps the breaks.
    return `\n\n${lines.join('\n\n')}\n\n`
  })

  text = text.replace(/<\/div>/gi, '\n')
  text = blockContentToMarkdown(text)

  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function blockContentToMarkdown(html: string): string {
  return String(html ?? '')
    .split('\n')
    .map((line) => inlineToMarkdown(line))
    .join('\n')
}

function convertTable(tableHtml: string): string {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) => {
    const cells = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) =>
      blockContentToMarkdown(cell[1] ?? '')
        .replace(/\n+/g, ' ')
        .replace(/\|/g, '\\|')
        .trim(),
    )
    return cells
  })
  if (rows.length === 0) return ''
  const width = Math.max(...rows.map((row) => row.length), 1)
  const normalized = rows.map((row) => {
    const next = [...row]
    while (next.length < width) next.push('')
    return next
  })
  const header = normalized[0]!
  const body = normalized.slice(1)
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ]
  return `\n\n${lines.join('\n')}\n\n`
}

function inlineToMarkdown(html: string): string {
  let text = String(html ?? '')
  text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, body) => {
    const label = inlineToMarkdown(body).trim() || String(href)
    return `[${label}](${href})`
  })
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, body) => {
    const inner = inlineToMarkdown(body).trim()
    return inner ? `**${inner}**` : ''
  })
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, body) => {
    const inner = inlineToMarkdown(body).trim()
    return inner ? `*${inner}*` : ''
  })
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, body) => {
    const inner = decodeEntities(stripTags(body)).replace(/`/g, "'")
    return inner ? `\`${inner}\`` : ''
  })
  text = text.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, (_m, alt) => {
    const label = decodeEntities(String(alt)).trim()
    return label ? label : ''
  })
  text = stripTags(text)
  return decodeEntities(text).replace(/[ \t]{2,}/g, ' ').trim()
}

function stripTags(value: string): string {
  return String(value ?? '').replace(/<[^>]+>/g, '')
}

function decodeEntities(value: string): string {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
}
