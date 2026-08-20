export type BrainRetrievalReceipt = {
  brain_id?: string | null
  brain_name?: string | null
  scope?: string | null
  query?: string | null
  results_count?: number | null
  top_source_types?: string[] | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function isBrainRetrievalReceipt(value: unknown): value is BrainRetrievalReceipt {
  const row = asRecord(value)
  return typeof row.scope === 'string' && typeof row.query === 'string'
}

export type WebResearchSource = { url: string; title: string }

export function isWebResearchSource(value: unknown): value is WebResearchSource {
  const row = asRecord(value)
  return typeof row.url === 'string' && row.url.startsWith('http')
}

export function appendWebResearchSource(
  existing: unknown,
  source: WebResearchSource,
): WebResearchSource[] {
  const current = Array.isArray(existing) ? existing.filter(isWebResearchSource) : []
  if (current.some((row) => row.url === source.url)) return current
  return [...current, { url: source.url, title: source.title || source.url }]
}

export function formatRetrievalSourceTitle(receipt: BrainRetrievalReceipt): string {
  const scope = (receipt.scope ?? 'brain').trim().toUpperCase()
  const name = receipt.brain_name?.trim()
  const heading = name ? `${scope} BRAIN — ${name}` : `${scope} BRAIN`
  const count = typeof receipt.results_count === 'number' ? receipt.results_count : 0
  const query = receipt.query?.trim()
  if (count <= 0) {
    return query ? `${heading} · 0 results — searched '${query}'` : `${heading} · 0 results`
  }
  return `${heading} · ${count} ${count === 1 ? 'memory' : 'memories'}`
}

export function appendRetrievalReceipt(
  existing: unknown,
  receipt: BrainRetrievalReceipt,
): BrainRetrievalReceipt[] {
  const current = Array.isArray(existing) ? existing.filter(isBrainRetrievalReceipt) : []
  const key = `${receipt.scope ?? ''}:${receipt.brain_id ?? ''}:${receipt.query ?? ''}`
  if (
    current.some((row) => `${row.scope ?? ''}:${row.brain_id ?? ''}:${row.query ?? ''}` === key)
  ) {
    return current
  }
  return [...current, receipt]
}
