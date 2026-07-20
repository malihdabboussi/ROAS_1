/**
 * Convert Markdown (from htmlToGoogleDocsMarkdown) into Google Docs batchUpdate
 * requests that target a specific document tab via location/range.tabId.
 *
 * GOOGLEDOCS_UPDATE_DOCUMENT_MARKDOWN ignores tab targeting, so secondary tabs
 * need insertText + style requests. Markdown tables become native insertTable
 * requests (tab-separated paragraphs collapse and wrap badly in Docs).
 */

type InlineMark = { start: number; end: number; bold?: boolean; italic?: boolean }

type Block =
  | { kind: 'heading'; level: number; text: string; marks: InlineMark[] }
  | { kind: 'paragraph'; text: string; marks: InlineMark[] }
  | { kind: 'bullet'; text: string; marks: InlineMark[] }
  | { kind: 'ordered'; text: string; marks: InlineMark[] }
  | { kind: 'empty' }
  | { kind: 'table'; rows: string[][] }

const HEADING_STYLE: Record<number, string> = {
  1: 'HEADING_1',
  2: 'HEADING_2',
  3: 'HEADING_3',
  4: 'HEADING_4',
  5: 'HEADING_5',
  6: 'HEADING_6',
}

const HEADING_TEXT_STYLE: Record<number, { bold: boolean; fontSize: number }> = {
  1: { bold: true, fontSize: 20 },
  2: { bold: true, fontSize: 16 },
  3: { bold: true, fontSize: 14 },
  4: { bold: true, fontSize: 12 },
  5: { bold: true, fontSize: 11 },
  6: { bold: true, fontSize: 11 },
}

export function markdownToGoogleDocsTabRequests(
  markdown: string,
  tabId: string,
  insertionIndex = 1,
): Record<string, unknown>[] {
  const blocks = parseMarkdownBlocks(
    String(markdown ?? '')
      .replace(/\r/g, '')
      .trim(),
  )
  if (blocks.length === 0) return []

  const requests: Record<string, unknown>[] = []
  let index = insertionIndex

  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]!
    if (block.kind === 'table') {
      const built = tableToRequests(block.rows, tabId, index)
      requests.push(...built.requests)
      index = built.endIndex
      i += 1
      continue
    }

    const run: Exclude<Block, { kind: 'table' }>[] = []
    while (i < blocks.length && blocks[i]!.kind !== 'table') {
      run.push(blocks[i] as Exclude<Block, { kind: 'table' }>)
      i += 1
    }
    const built = flowBlocksToRequests(run, tabId, index)
    requests.push(...built.requests)
    index = built.endIndex
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
      const last = blocks[blocks.length - 1]
      if (last && last.kind !== 'empty') {
        blocks.push({ kind: 'empty' })
      }
      i += 1
      continue
    }

    if (line.trim().startsWith('|') && line.includes('|')) {
      const tableRows: string[][] = []
      while (i < lines.length) {
        const row = (lines[i] ?? '').trim()
        if (!row.startsWith('|')) break
        if (/^\|[\s|:-]+\|$/.test(row)) {
          i += 1
          continue
        }
        tableRows.push(
          row
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => parseInline(cell.trim()).text),
        )
        i += 1
      }
      if (tableRows.length > 0) {
        blocks.push({ kind: 'table', rows: tableRows })
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

  while (blocks.length > 0 && blocks[blocks.length - 1]?.kind === 'empty') {
    blocks.pop()
  }
  return blocks
}

function flowBlocksToRequests(
  blocks: Exclude<Block, { kind: 'table' }>[],
  tabId: string,
  startIndex: number,
): { requests: Record<string, unknown>[]; endIndex: number } {
  if (blocks.length === 0) {
    return { requests: [], endIndex: startIndex }
  }

  let cursor = startIndex
  let fullText = ''
  const paragraphStyles: Array<{
    start: number
    end: number
    level: number
    namedStyleType: string
  }> = []
  const textStyles: Array<{ start: number; end: number; bold?: boolean; italic?: boolean }> = []
  const bulletRanges: Array<{ start: number; end: number }> = []
  const orderedRanges: Array<{ start: number; end: number }> = []

  for (const block of blocks) {
    if (block.kind === 'empty') {
      fullText += '\n'
      cursor += 1
      continue
    }

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
        level: block.level,
        namedStyleType: HEADING_STYLE[block.level] ?? 'HEADING_1',
      })
    } else if (block.kind === 'bullet') {
      bulletRanges.push({ start, end })
    } else if (block.kind === 'ordered') {
      orderedRanges.push({ start, end })
    }

    cursor = end
  }

  if (!fullText) {
    return { requests: [], endIndex: startIndex }
  }

  const requests: Record<string, unknown>[] = [
    {
      insertText: {
        text: fullText,
        location: { index: startIndex, tabId },
      },
    },
    {
      updateTextStyle: {
        range: { startIndex, endIndex: startIndex + fullText.length, tabId },
        textStyle: {
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          fontSize: { magnitude: 11, unit: 'PT' },
          weightedFontFamily: { fontFamily: 'Arial' },
        },
        fields:
          'bold,italic,underline,strikethrough,backgroundColor,fontSize,weightedFontFamily',
      },
    },
    {
      updateParagraphStyle: {
        range: { startIndex, endIndex: startIndex + fullText.length, tabId },
        paragraphStyle: {
          namedStyleType: 'NORMAL_TEXT',
          alignment: 'START',
          direction: 'LEFT_TO_RIGHT',
          lineSpacing: 115,
          spaceAbove: { magnitude: 0, unit: 'PT' },
          spaceBelow: { magnitude: 0, unit: 'PT' },
          indentStart: { magnitude: 0, unit: 'PT' },
          indentEnd: { magnitude: 0, unit: 'PT' },
          indentFirstLine: { magnitude: 0, unit: 'PT' },
          keepWithNext: false,
          keepLinesTogether: false,
          avoidWidowAndOrphan: false,
        },
        fields:
          'namedStyleType,alignment,direction,lineSpacing,spaceAbove,spaceBelow,indentStart,indentEnd,indentFirstLine,keepWithNext,keepLinesTogether,avoidWidowAndOrphan',
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
    const headingText = HEADING_TEXT_STYLE[style.level] ?? HEADING_TEXT_STYLE[1]!
    requests.push({
      updateTextStyle: {
        range: { startIndex: style.start, endIndex: style.end, tabId },
        textStyle: {
          bold: headingText.bold,
          fontSize: { magnitude: headingText.fontSize, unit: 'PT' },
        },
        fields: 'bold,fontSize',
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

  return { requests, endIndex: cursor }
}

/**
 * Empty Google Docs table layout: first cell content is tableStart + 4, then each
 * cell is +2, with +1 row terminator → stride per row is (cols * 2 + 1).
 */
export function emptyTableCellIndex(
  tableStart: number,
  row: number,
  col: number,
  cols: number,
): number {
  return tableStart + 4 + row * (cols * 2 + 1) + col * 2
}

export function emptyTableEndIndex(tableStart: number, rows: number, cols: number): number {
  return tableStart + 2 + rows * (1 + 2 * cols)
}

function tableToRequests(
  rows: string[][],
  tabId: string,
  tableStart: number,
): { requests: Record<string, unknown>[]; endIndex: number } {
  const numRows = rows.length
  const numCols = Math.max(...rows.map((row) => row.length), 1)
  const normalized = rows.map((row) => {
    const next = row.map((cell) => (cell.trim().length > 0 ? cell : ' '))
    while (next.length < numCols) next.push(' ')
    return next
  })

  const requests: Record<string, unknown>[] = [
    {
      insertTable: {
        rows: numRows,
        columns: numCols,
        location: { index: tableStart, tabId },
      },
    },
  ]

  // Fill bottom-right → top-left so earlier cell indexes stay stable.
  for (let r = numRows - 1; r >= 0; r -= 1) {
    for (let c = numCols - 1; c >= 0; c -= 1) {
      const text = normalized[r]![c]!
      requests.push({
        insertText: {
          text,
          location: { index: emptyTableCellIndex(tableStart, r, c, numCols), tabId },
        },
      })
    }
  }

  // Bold header row using final indexes after all cell inserts.
  for (let c = 0; c < numCols; c += 1) {
    const text = normalized[0]![c]!
    const start = finalCellIndex(tableStart, 0, c, numCols, normalized)
    requests.push({
      updateTextStyle: {
        range: { startIndex: start, endIndex: start + text.length, tabId },
        textStyle: { bold: true },
        fields: 'bold',
      },
    })
  }

  const totalText = normalized.reduce(
    (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell.length, 0),
    0,
  )
  return {
    requests,
    endIndex: emptyTableEndIndex(tableStart, numRows, numCols) + totalText,
  }
}

function finalCellIndex(
  tableStart: number,
  row: number,
  col: number,
  cols: number,
  cells: string[][],
): number {
  const target = emptyTableCellIndex(tableStart, row, col, cols)
  let index = target
  for (let r = 0; r < cells.length; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cellStart = emptyTableCellIndex(tableStart, r, c, cols)
      if (cellStart < target) {
        index += cells[r]![c]!.length
      }
    }
  }
  return index
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
