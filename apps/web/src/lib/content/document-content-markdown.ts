/** Resolves markdown for conversation documents — content may be a string, `{ text }`, `{ blocks }`, or nested JSON. */

export function normalizeStoredMarkdownText(text: unknown): string | null {
  if (typeof text !== 'string') return null

  const raw = text.trim()
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'string') return normalizeStoredMarkdownText(parsed)
    if (
      parsed &&
      typeof parsed === 'object' &&
      'text' in parsed &&
      typeof (parsed as { text?: unknown }).text === 'string'
    ) {
      return normalizeStoredMarkdownText((parsed as { text: string }).text)
    }
  } catch {
    // Fallback below for partially escaped strings.
  }

  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t')
  }

  if (raw.includes('\\n') || raw.includes('\\"') || raw.includes('\\t')) {
    return raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t')
  }

  return raw
}

export function extractMarkdownFromDocumentContent(content: unknown, depth = 0): string | null {
  if (depth > 6 || content == null) return null

  if (typeof content === 'string') {
    const trimmed = content.trim()
    if (!trimmed) return null
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 2) {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        const inner = extractMarkdownFromDocumentContent(parsed, depth + 1)
        if (inner) return inner
      } catch {
        /* use normalize below */
      }
    }
    return normalizeStoredMarkdownText(content)
  }

  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const item of content) {
      const piece = extractMarkdownFromDocumentContent(item, depth + 1)
      if (piece) parts.push(piece)
    }
    if (parts.length) return parts.join('\n\n')
    return null
  }

  if (typeof content !== 'object') return null

  const o = content as Record<string, unknown>

  for (const key of ['text', 'markdown', 'md', 'body', 'content', 'document']) {
    const v = o[key]
    if (typeof v === 'string') {
      const n = normalizeStoredMarkdownText(v)
      if (n) return n
    } else if (v && typeof v === 'object') {
      const nested = extractMarkdownFromDocumentContent(v, depth + 1)
      if (nested) return nested
    }
  }

  if (Array.isArray(o.blocks)) {
    const fromBlocks = extractMarkdownFromDocumentContent(o.blocks, depth + 1)
    if (fromBlocks) return fromBlocks
  }

  const stringVals = Object.values(o).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 48,
  )
  if (stringVals.length === 1) {
    const n = normalizeStoredMarkdownText(stringVals[0])
    if (n) return n
  }

  return null
}
