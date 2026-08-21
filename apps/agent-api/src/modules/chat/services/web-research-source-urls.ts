export type WebResearchSource = { url: string; title: string }

const WEB_RESEARCH_TOOLS = new Set(['web_search', 'web_fetch'])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function unwrapToolResult(result: unknown): unknown {
  const row = asRecord(result)
  if (typeof row.content === 'string') {
    try {
      return JSON.parse(row.content)
    } catch {
      return result
    }
  }
  if (row.result && typeof row.result === 'object') return row.result
  return result
}

function pushUrl(out: WebResearchSource[], url: string, title?: string): void {
  const trimmed = url.trim()
  if (!trimmed.startsWith('http') || out.some((row) => row.url === trimmed)) return
  out.push({ url: trimmed, title: title?.trim() || trimmed })
}

function collectUrls(value: unknown, out: WebResearchSource[], depth: number): void {
  if (depth > 4 || out.length >= 12 || value == null) return
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, out, depth + 1)
    return
  }
  const row = asRecord(value)
  if (typeof row.url === 'string') {
    pushUrl(out, row.url, typeof row.title === 'string' ? row.title : undefined)
  }
  if (typeof row.href === 'string') {
    pushUrl(out, row.href, typeof row.title === 'string' ? row.title : undefined)
  }
  if (Array.isArray(row.results)) collectUrls(row.results, out, depth + 1)
  if (Array.isArray(row.citations)) {
    for (const citation of row.citations) {
      if (typeof citation === 'string') pushUrl(out, citation)
      else collectUrls(citation, out, depth + 1)
    }
  }
}

export function extractWebResearchSourceUrls(
  name: string,
  result: unknown,
  args?: Record<string, unknown>,
): WebResearchSource[] {
  if (!WEB_RESEARCH_TOOLS.has(name)) return []
  const out: WebResearchSource[] = []
  const argUrl = typeof args?.url === 'string' ? args.url : ''
  if (name === 'web_fetch' && argUrl) pushUrl(out, argUrl)
  collectUrls(unwrapToolResult(result), out, 0)
  return out
}
