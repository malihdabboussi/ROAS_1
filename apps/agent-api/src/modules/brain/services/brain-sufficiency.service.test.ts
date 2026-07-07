import { describe, expect, it } from 'vitest'
import type { BrainRetrievalCandidate } from '@vibey/api-shared'
import { BrainSufficiencyService } from './brain-sufficiency.service'

function candidate(overrides: Partial<BrainRetrievalCandidate>): BrainRetrievalCandidate {
  return {
    id: 'candidate',
    brain_id: 'brain-1',
    brain_scope: 'user',
    brain_owner_id: 'user-1',
    org_id: null,
    effective_access: 'query',
    access_source: 'owner',
    family: 'user',
    kind: 'memory',
    title: 'Candidate',
    content: 'Candidate content',
    snippet: 'Candidate content',
    source_type: null,
    source_id: null,
    source_title: null,
    metadata: {},
    scores: { final: 0.2 },
    match_reasons: [],
    evidence_refs: [],
    related: [],
    ...overrides,
  }
}

describe('BrainSufficiencyService', () => {
  it('marks direct grounded evidence as sufficient', async () => {
    const result = await new BrainSufficiencyService().evaluate('pricing decision', [
      candidate({
        title: 'Pricing decision',
        content: 'The launch pricing decision was approved.',
        source_id: 'meeting-1',
        source_title: 'Pricing meeting',
        scores: { final: 0.72 },
      }),
    ])

    expect(result).toMatchObject({ sufficient: true, missing: [] })
  })

  it('marks vague related context as insufficient', async () => {
    const result = await new BrainSufficiencyService().evaluate('approved launch price', [
      candidate({
        title: 'Pricing thought',
        content: 'Pricing might matter later.',
        scores: { final: 0.22 },
      }),
    ])

    expect(result.sufficient).toBe(false)
    expect(result.missing.length).toBeGreaterThan(0)
    expect(result.suggested_next_queries).toContain('approved launch price source evidence')
  })

  it('marks high-scoring context without direct evidence as insufficient', async () => {
    const result = await new BrainSufficiencyService().evaluate('approved launch price', [
      candidate({
        title: 'Approved launch price',
        content: 'The approved launch price is recorded here.',
        scores: { final: 0.92 },
      }),
    ])

    expect(result.sufficient).toBe(false)
    expect(result.missing).toContain('No direct source-grounded evidence found.')
  })

  it('marks unrelated strong source evidence as insufficient', async () => {
    const result = await new BrainSufficiencyService().evaluate('approved Almanac budget memo', [
      candidate({
        title: 'Core Web Vitals approval',
        content: 'The Core Web Vitals decision was approved.',
        source_id: 'meeting-2',
        source_title: 'Web performance meeting',
        scores: { final: 0.91 },
      }),
    ])

    expect(result.sufficient).toBe(false)
    expect(result.missing).toContain(
      'Important query terms are weakly represented in retrieved context.',
    )
  })

  it('marks strong top source-grounded evidence as sufficient even with abstract query wording', async () => {
    const result = await new BrainSufficiencyService().evaluate(
      'why does context act as a moat over time',
      [
        candidate({
          title: 'Context compounding effect',
          content: 'Context creates a compounding effect as the system learns user vocabulary.',
          source_title: 'Product strategy session',
          scores: { final: 0.82 },
        }),
      ],
    )

    expect(result).toMatchObject({ sufficient: true, missing: [] })
  })
})
