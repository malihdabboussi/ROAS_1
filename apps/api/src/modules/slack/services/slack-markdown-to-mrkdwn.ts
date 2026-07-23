/**
 * Convert common Markdown formatting to Slack mrkdwn.
 * Slack bold is *text* — Markdown **text** otherwise shows literal stars.
 */

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function isTableDivider(line: string, columnCount: number): boolean {
  const cells = parseTableRow(line)
  return (
    cells.length === columnCount &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
  )
}

function convertMarkdownTablesToSlackBullets(text: string): string {
  const lines = text.split('\n')
  const output: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const header = parseTableRow(lines[index] ?? '')
    const divider = lines[index + 1]
    if (header.length < 2 || !divider || !isTableDivider(divider, header.length)) {
      output.push(lines[index] ?? '')
      continue
    }

    const rows: string[][] = []
    let rowIndex = index + 2
    while (rowIndex < lines.length) {
      const line = lines[rowIndex] ?? ''
      if (!line.includes('|')) break
      const row = parseTableRow(line)
      if (row.length !== header.length) break
      rows.push(row)
      rowIndex += 1
    }

    if (rows.length === 0) {
      output.push(lines[index] ?? '')
      continue
    }

    for (const row of rows) {
      const primary = row[0] || header[0]
      const details = header
        .slice(1)
        .map((label, detailIndex) => {
          const value = row[detailIndex + 1]
          return value ? `${label}: ${value}` : null
        })
        .filter((detail): detail is string => Boolean(detail))
      output.push(`• **${primary}**${details.length > 0 ? ` — ${details.join(' · ')}` : ''}`)
    }

    index = rowIndex - 1
  }

  return output.join('\n')
}

export function markdownToSlackMrkdwn(text: string): string {
  if (!text) return text

  const fences: string[] = []
  let out = text.replace(/```[\s\S]*?```/g, (match) => {
    fences.push(match)
    return `\0FENCE${fences.length - 1}\0`
  })

  const inlines: string[] = []
  out = out.replace(/`[^`\n]+`/g, (match) => {
    inlines.push(match)
    return `\0INLINE${inlines.length - 1}\0`
  })

  out = convertMarkdownTablesToSlackBullets(out)

  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => `<${url}|${String(label).trim() || 'link'}>`,
  )

  // Bold before single-asterisk patterns; non-greedy within one line-ish span.
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '*$1*')
  out = out.replace(/__([^_\n]+)__/g, '*$1*')
  out = out.replace(/~~([^~\n]+)~~/g, '~$1~')

  out = out.replace(/\0INLINE(\d+)\0/g, (_match, index: string) => inlines[Number(index)] ?? '')
  out = out.replace(/\0FENCE(\d+)\0/g, (_match, index: string) => fences[Number(index)] ?? '')
  return out
}
