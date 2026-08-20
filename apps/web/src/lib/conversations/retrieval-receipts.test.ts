import { describe, expect, it } from 'vitest'
import { appendWebResearchSource, formatRetrievalSourceTitle } from './retrieval-receipts'

describe('retrieval receipts', () => {
  it('formats hit and zero-hit campaign brain titles', () => {
    expect(
      formatRetrievalSourceTitle({
        scope: 'campaign',
        brain_name: 'Multifamily Strategy',
        query: 'Christian story',
        results_count: 12,
      }),
    ).toBe('CAMPAIGN BRAIN — Multifamily Strategy · 12 memories')
    expect(
      formatRetrievalSourceTitle({
        scope: 'campaign',
        brain_name: 'Multifamily Strategy',
        query: 'Christian story',
        results_count: 0,
      }),
    ).toBe("CAMPAIGN BRAIN — Multifamily Strategy · 0 results — searched 'Christian story'")
  })

  it('dedupes web research URLs', () => {
    expect(
      appendWebResearchSource([{ url: 'https://example.com/a', title: 'A' }], {
        url: 'https://example.com/a',
        title: 'Again',
      }),
    ).toEqual([{ url: 'https://example.com/a', title: 'A' }])
  })
})
