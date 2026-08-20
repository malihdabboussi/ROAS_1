import { describe, expect, it } from 'vitest'
import {
  buildEmptyBrainSearchResult,
  extractRetrievalReceiptsFromToolResult,
  formatBrainSearchReceiptLog,
  toBrainRetrievalReceipt,
} from './brain-retrieval-receipt'

describe('brain retrieval receipts', () => {
  it('counts results and top source types', () => {
    expect(
      toBrainRetrievalReceipt({
        brainId: 'brain-1',
        brainName: 'Multifamily Strategy',
        scope: 'campaign',
        query: 'Christian story',
        results: [
          { kind: 'memory', source_type: 'memory' },
          { kind: 'memory', source_type: 'memory' },
          { kind: 'snapshot', source_type: 'snapshot' },
        ],
      }),
    ).toEqual({
      brain_id: 'brain-1',
      brain_name: 'Multifamily Strategy',
      scope: 'campaign',
      query: 'Christian story',
      results_count: 3,
      top_source_types: ['memory', 'snapshot'],
    })
  })

  it('prefers retrieval_receipts, then by_family, then a single family result', () => {
    expect(
      extractRetrievalReceiptsFromToolResult({
        retrieval_receipts: [
          {
            brain_id: 'brain-1',
            brain_name: 'Multifamily Strategy',
            scope: 'campaign',
            query: 'Christian story',
            results_count: 0,
          },
        ],
      })[0]?.results_count,
    ).toBe(0)

    expect(
      extractRetrievalReceiptsFromToolResult({
        query: 'offer',
        by_family: { user: { count: 4, brain_ids: ['brain-user'] } },
      }),
    ).toEqual([
      {
        brain_id: 'brain-user',
        brain_name: null,
        scope: 'user',
        query: 'offer',
        results_count: 4,
        top_source_types: [],
      },
    ])

    expect(
      extractRetrievalReceiptsFromToolResult({
        family: 'campaign',
        brain_id: 'brain-1',
        query: 'story',
        count: 12,
        results: [{ kind: 'memory' }],
      }).map((row) => row.results_count),
    ).toEqual([12])
  })

  it('formats the unconditional brain search warn payload', () => {
    expect(
      JSON.parse(
        formatBrainSearchReceiptLog({
          family: 'user',
          brainId: 'brain-1',
          query: 'Christian story',
          resultsCount: 0,
          reason: 'No accessible Brain found.',
        }),
      ),
    ).toMatchObject({
      feature: 'brain_search_receipt',
      family: 'user',
      brain_id: 'brain-1',
      results_count: 0,
      reason: 'No accessible Brain found.',
    })
  })

  it('builds an empty search result with the receipt reason', () => {
    expect(
      buildEmptyBrainSearchResult('Christian story', 'campaign', 'No accessible Brain found.', {
        sufficient: false,
        confidence: 0,
        reason: 'Retrieved context is not enough to answer definitively.',
        missing: ['No strong direct evidence found.'],
        suggested_next_queries: ['Christian story'],
      }),
    ).toMatchObject({
      success: true,
      query: 'Christian story',
      family: 'campaign',
      count: 0,
      context_sufficient: false,
      sufficiency: { reason: 'No accessible Brain found.' },
      results: [],
    })
  })
})
