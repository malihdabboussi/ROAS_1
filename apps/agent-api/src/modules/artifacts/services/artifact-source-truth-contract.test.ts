import { describe, expect, it } from 'vitest'
import { sourceTruthAsOf, withSourceTruth } from './artifact-source-truth-contract'

describe('artifact source-of-truth contract', () => {
  it('adds the shared provenance and freshness envelope', () => {
    expect(
      withSourceTruth(
        { success: true, count: 2 },
        {
          canonical_source: { system: 'brain', owner: 'ns_memories', mutable: false },
          as_of: '2026-08-29T12:00:00.000Z',
          evidence: [{ memory_id: 'memory-1' }],
          brain_context: { family: 'company' },
        },
      ),
    ).toEqual({
      success: true,
      count: 2,
      canonical_source: { system: 'brain', owner: 'ns_memories', mutable: false },
      as_of: '2026-08-29T12:00:00.000Z',
      evidence: [{ memory_id: 'memory-1' }],
      brain_context: { family: 'company' },
    })
  })

  it('uses a verified source timestamp and falls back when absent', () => {
    const fallback = new Date('2026-08-29T12:00:00.000Z')
    expect(sourceTruthAsOf('2026-08-28T10:30:00.000Z', fallback)).toBe(
      '2026-08-28T10:30:00.000Z',
    )
    expect(sourceTruthAsOf('not-a-date', fallback)).toBe('2026-08-29T12:00:00.000Z')
  })
})
