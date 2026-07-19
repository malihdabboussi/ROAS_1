/**
 * Convert TipTap/space-doc HTML into Markdown for GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN.
 * Keeps headings, lists, tables, links, and basic inline marks — not a full HTML engine.
 */
export function htmlToGoogleDocsMarkdown(html: string): string {
  let text = String(html ?? '')
  if (!text.trim()) return ''

  text = text
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(html|head|body|meta|title)[^>]*>/gi, '')

  text = text.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => convertTable(tableHtml))

  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, body: string) => {
    const code = decodeEntities(stripTags(body)).replace(/^\n+|\n+$/g, '')
    return `\n\`\`\`\n${code}\n\`\`\`\n`
  })

  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, body: string) => {
    const n = Math.max(1, Math.min(6, Number.parseInt(level, 10) || 1))
    return `\n${'#'.repeat(n)} ${inlineToMarkdown(body)}\n`
  })

  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, body: string) => {
    const inner = htmlToGoogleDocsMarkdown(body)
      .split('\n')
      .map((line) => (line.trim() ? `> ${line}` : '>'))
      .join('\n')
    return `\n${inner}\n`
  })

  text = text.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, tag: string, body: string) => {
    let i = 0
    const ordered = tag.toLowerCase() === 'ol'
    const items = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => {
      i += 1
      const prefix = ordered ? `${i}. ` : '- '
      return `${prefix}${inlineToMarkdown(match[1] ?? '')}`
    })
    return items.length ? `\n${items.join('\n')}\n` : ''
  })

  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, body: string) => {
    const line = inlineToMarkdown(body)
    return line ? `\n${line}\n` : '\n'
  })

  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = inlineToMarkdown(text)

  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function convertTable(tableHtml: string): string {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) => {
    const cells = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) =>
      inlineToMarkdown(cell[1] ?? '').replace(/\|/g, '\\|').trim(),
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
  return `\n${lines.join('\n')}\n`
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
