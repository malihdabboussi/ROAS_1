/**
 * Convert Markdown (from htmlToGoogleDocsMarkdown) into Google Docs batchUpdate
 * requests that target a specific document tab via location/range.tabId.
 *
 * GOOGLEDOCS_UPDATE_DOCUMENT_MARKDOWN ignores tab targeting, so secondary tabs
 * need insertText + style requests.
 */

type InlineMark = { start: number; end: number; bold?: boolean; italic?: boolean }

type Block =
  | { kind: 'heading'; level: number; text: string; marks: InlineMark[] }
  | { kind: 'paragraph'; text: string; marks: InlineMark[] }
  | { kind: 'bullet'; text: string; marks: InlineMark[] }
  | { kind: 'ordered'; text: string; marks: InlineMark[] }

const HEADING_STYLE: Record<number, string> = {
  1: 'HEADING_1',
  2: 'HEADING_2',
  3: 'HEADING_3',
  4: 'HEADING_4',
  5: 'HEADING_5',
  6: 'HEADING_6',
}

export function markdownToGoogleDocsTabRequests(
  markdown: string,
  tabId: string,
): Record<string, unknown>[] {
  const blocks = parseMarkdownBlocks(
    String(markdown ?? '')
      .replace(/\r/g, '')
      .trim(),
  )
  if (blocks.length === 0) return []

  let cursor = 1
  let fullText = ''
  const paragraphStyles: Array<{ start: number; end: number; namedStyleType: string }> = []
  const textStyles: Array<{ start: number; end: number; bold?: boolean; italic?: boolean }> = []
  const bulletRanges: Array<{ start: number; end: number }> = []
  const orderedRanges: Array<{ start: number; end: number }> = []

  for (const block of blocks) {
    const line = `${block.text}\n`
    const start = cursor
    const end = start + line.length
    fullText += line

    for (const mark of block.marks) {
      textStyles.push({
        start: start + mark.start,
        end: start + mark.end,
        bold: mark.bold,
        italic: mark.italic,
      })
    }

    if (block.kind === 'heading') {
      paragraphStyles.push({
        start,
        end,
        namedStyleType: HEADING_STYLE[block.level] ?? 'HEADING_1',
      })
    } else if (block.kind === 'bullet') {
      bulletRanges.push({ start, end })
    } else if (block.kind === 'ordered') {
      orderedRanges.push({ start, end })
    }

    cursor = end
  }

  const requests: Record<string, unknown>[] = [
    {
      insertText: {
        text: fullText,
        location: { index: 1, tabId },
      },
    },
  ]

  for (const style of paragraphStyles) {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: style.start, endIndex: style.end, tabId },
        paragraphStyle: { namedStyleType: style.namedStyleType },
        fields: 'namedStyleType',
      },
    })
  }

  for (const style of textStyles) {
    const fields: string[] = []
    const textStyle: Record<string, unknown> = {}
    if (style.bold) {
      textStyle.bold = true
      fields.push('bold')
    }
    if (style.italic) {
      textStyle.italic = true
      fields.push('italic')
    }
    if (fields.length === 0) continue
    requests.push({
      updateTextStyle: {
        range: { startIndex: style.start, endIndex: style.end, tabId },
        textStyle,
        fields: fields.join(','),
      },
    })
  }

  for (const range of mergeContiguous(bulletRanges)) {
    requests.push({
      createParagraphBullets: {
        range: { startIndex: range.start, endIndex: range.end, tabId },
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
      },
    })
  }

  for (const range of mergeContiguous(orderedRanges)) {
    requests.push({
      createParagraphBullets: {
        range: { startIndex: range.start, endIndex: range.end, tabId },
        bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
      },
    })
  }

  return requests
}

export function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = String(markdown ?? '').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const raw = lines[i] ?? ''
    const line = raw.trimEnd()
    if (!line.trim()) {
      i += 1
      continue
    }

    if (line.trim().startsWith('|') && line.includes('|')) {
      const tableLines: string[] = []
      while (i < lines.length) {
        const row = (lines[i] ?? '').trim()
        if (!row.startsWith('|')) break
        if (/^\|[\s|:-]+\|$/.test(row)) {
          i += 1
          continue
        }
        tableLines.push(
          row
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim())
            .join('\t'),
        )
        i += 1
      }
      for (const tableLine of tableLines) {
        const parsed = parseInline(tableLine)
        blocks.push({ kind: 'paragraph', text: parsed.text, marks: parsed.marks })
      }
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const parsed = parseInline(heading[2] ?? '')
      blocks.push({
        kind: 'heading',
        level: heading[1]!.length,
        text: parsed.text,
        marks: parsed.marks,
      })
      i += 1
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      const parsed = parseInline(bullet[1] ?? '')
      blocks.push({ kind: 'bullet', text: parsed.text, marks: parsed.marks })
      i += 1
      continue
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(line)
    if (ordered) {
      const parsed = parseInline(ordered[1] ?? '')
      blocks.push({ kind: 'ordered', text: parsed.text, marks: parsed.marks })
      i += 1
      continue
    }

    if (line.startsWith('>')) {
      const parsed = parseInline(line.replace(/^>\s?/, ''))
      blocks.push({
        kind: 'paragraph',
        text: parsed.text,
        marks: parsed.marks.map((mark) => ({ ...mark, italic: true })),
      })
      i += 1
      continue
    }

    if (line.startsWith('```')) {
      i += 1
      const codeLines: string[] = []
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        codeLines.push(lines[i] ?? '')
        i += 1
      }
      if (i < lines.length) i += 1
      const parsed = parseInline(codeLines.join('\n'))
      blocks.push({ kind: 'paragraph', text: parsed.text, marks: parsed.marks })
      continue
    }

    const parsed = parseInline(line)
    blocks.push({ kind: 'paragraph', text: parsed.text, marks: parsed.marks })
    i += 1
  }
  return blocks
}

function parseInline(input: string): { text: string; marks: InlineMark[] } {
  let text = String(input ?? '')
  // Links → label only
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
  // Strip inline code markers
  text = text.replace(/`([^`]+)`/g, '$1')

  const marks: InlineMark[] = []
  let plain = ''
  let i = 0
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const close = text.indexOf('**', i + 2)
      if (close > i + 2) {
        const inner = text.slice(i + 2, close)
        const start = plain.length
        plain += inner
        marks.push({ start, end: plain.length, bold: true })
        i = close + 2
        continue
      }
    }
    if (text[i] === '*' && text[i + 1] !== '*') {
      const close = text.indexOf('*', i + 1)
      if (close > i + 1) {
        const inner = text.slice(i + 1, close)
        const start = plain.length
        plain += inner
        marks.push({ start, end: plain.length, italic: true })
        i = close + 1
        continue
      }
    }
    plain += text[i]
    i += 1
  }
  return { text: plain, marks }
}

function mergeContiguous(
  ranges: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = [{ ...sorted[0]! }]
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]!
    const last = merged[merged.length - 1]!
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push({ ...current })
    }
  }
  return merged
}
