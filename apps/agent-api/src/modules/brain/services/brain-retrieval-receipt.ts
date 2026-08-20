import type {
  BrainRetrievalSearchResult,
  BrainSearchFamily,
  BrainSufficiencyResult,
} from '@vibey/api-shared'

export type BrainRetrievalReceiptScope = 'user' | 'agent' | 'customer' | 'company' | 'campaign'

export type BrainRetrievalReceipt = {
  brain_id: string | null
  brain_name: string | null
  scope: BrainRetrievalReceiptScope
  query: string
  results_count: number
  top_source_types: string[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function topSourceTypes(results: unknown): string[] {
  if (!Array.isArray(results)) return []
  const counts = new Map<string, number>()
  for (const item of results) {
    const row = asRecord(item)
    const kind =
      (typeof row.source_type === 'string' && row.source_type) ||
      (typeof row.kind === 'string' && row.kind) ||
      null
    if (!kind) continue
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kind]) => kind)
}

export function warnBrainSearchReceipt(
  logger: { warn: (message: string) => void },
  family: string,
  brainId: string | null,
  query: string,
  resultsCount: number,
  reason?: string,
): void {
  logger.warn(formatBrainSearchReceiptLog({ family, brainId, query, resultsCount, reason }))
}

export function buildEmptyBrainSearchResult(
  query: string,
  family: BrainSearchFamily,
  reason: string,
  sufficiency: BrainSufficiencyResult,
): BrainRetrievalSearchResult {
  return {
    success: true,
    query,
    family,
    count: 0,
    context_sufficient: false,
    sufficiency: { ...sufficiency, reason },
    missing: sufficiency.missing,
    suggested_next_queries: sufficiency.suggested_next_queries,
    results: [],
  }
}

export function formatBrainSearchReceiptLog(input: {
  family: string
  brainId: string | null
  query: string
  resultsCount: number
  reason?: string
}): string {
  return JSON.stringify({
    feature: 'brain_search_receipt',
    family: input.family,
    brain_id: input.brainId,
    results_count: input.resultsCount,
    query_chars: input.query.length,
    query_preview: input.query.slice(0, 80),
    ...(input.reason ? { reason: input.reason } : {}),
  })
}

export function toBrainRetrievalReceipt(input: {
  brainId?: string | null
  brainName?: string | null
  scope: BrainRetrievalReceiptScope
  query: string
  resultsCount?: number
  results?: unknown
}): BrainRetrievalReceipt {
  const resultsCount =
    typeof input.resultsCount === 'number'
      ? input.resultsCount
      : Array.isArray(input.results)
        ? input.results.length
        : 0
  return {
    brain_id: input.brainId?.trim() || null,
    brain_name: input.brainName?.trim() || null,
    scope: input.scope,
    query: input.query,
    results_count: resultsCount,
    top_source_types: topSourceTypes(input.results),
  }
}

function receiptScope(value: unknown): BrainRetrievalReceiptScope | null {
  if (
    value === 'user' ||
    value === 'agent' ||
    value === 'customer' ||
    value === 'company' ||
    value === 'campaign'
  ) {
    return value
  }
  return null
}

export function receiptsFromFamilySearchHits(
  query: string,
  hits: Array<{
    brain: { id: string }
    family: BrainRetrievalReceiptScope
    result: { count?: unknown; results?: unknown }
  }>,
): BrainRetrievalReceipt[] {
  return hits.map((item) =>
    toBrainRetrievalReceipt({
      brainId: item.brain.id,
      scope: item.family,
      query,
      resultsCount: Number(item.result.count ?? 0),
      results: item.result.results,
    }),
  )
}

export function extractRetrievalReceiptsFromToolResult(result: unknown): BrainRetrievalReceipt[] {
  const row = asRecord(result)
  if (Array.isArray(row.retrieval_receipts)) {
    return row.retrieval_receipts
      .map((item) => {
        const receipt = asRecord(item)
        const scope = receiptScope(receipt.scope)
        if (!scope) return null
        return toBrainRetrievalReceipt({
          brainId: typeof receipt.brain_id === 'string' ? receipt.brain_id : null,
          brainName: typeof receipt.brain_name === 'string' ? receipt.brain_name : null,
          scope,
          query: typeof receipt.query === 'string' ? receipt.query : String(row.query ?? ''),
          resultsCount:
            typeof receipt.results_count === 'number' ? receipt.results_count : undefined,
          results: receipt.top_source_types,
        })
      })
      .filter((item): item is BrainRetrievalReceipt => Boolean(item))
  }

  const byFamily = asRecord(row.by_family)
  const familyKeys = Object.keys(byFamily)
  if (familyKeys.length > 0) {
    return familyKeys
      .map((family) => {
        const scope = receiptScope(family)
        if (!scope) return null
        const familyRow = asRecord(byFamily[family])
        const brainIds = Array.isArray(familyRow.brain_ids) ? familyRow.brain_ids : []
        return toBrainRetrievalReceipt({
          brainId: typeof brainIds[0] === 'string' ? brainIds[0] : null,
          scope,
          query: typeof row.query === 'string' ? row.query : '',
          resultsCount: typeof familyRow.count === 'number' ? familyRow.count : 0,
        })
      })
      .filter((item): item is BrainRetrievalReceipt => Boolean(item))
  }

  const scope = receiptScope(row.family)
  if (!scope) return []
  return [
    toBrainRetrievalReceipt({
      brainId: typeof row.brain_id === 'string' ? row.brain_id : null,
      brainName: typeof row.brain_name === 'string' ? row.brain_name : null,
      scope,
      query: typeof row.query === 'string' ? row.query : '',
      resultsCount: typeof row.count === 'number' ? row.count : undefined,
      results: row.results,
    }),
  ]
}
