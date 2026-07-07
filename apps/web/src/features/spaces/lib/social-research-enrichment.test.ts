import { describe, expect, it } from 'vitest'
import {
  hasSocialResearchFormulaBreakdown,
  isSocialResearchAnalyzed,
  resolveSocialResearchEnrichmentFlags,
} from './social-research-enrichment'

describe('social-research-enrichment', () => {
  it('detects analyzed posts from analyzed_at', () => {
    expect(isSocialResearchAnalyzed({ analyzed_at: '2026-06-22T12:00:00.000Z' })).toBe(true)
    expect(isSocialResearchAnalyzed({ analyzed_at: '' })).toBe(false)
    expect(isSocialResearchAnalyzed({})).toBe(false)
  })

  it('detects formula breakdown from video_breakdown object', () => {
    expect(hasSocialResearchFormulaBreakdown({ video_breakdown: { hook: 'test' } })).toBe(true)
    expect(hasSocialResearchFormulaBreakdown({ video_breakdown: null })).toBe(false)
    expect(hasSocialResearchFormulaBreakdown({ video_breakdown: [] })).toBe(false)
  })

  it('resolves both enrichment flags together', () => {
    expect(
      resolveSocialResearchEnrichmentFlags({
        analyzed_at: '2026-06-22T12:00:00.000Z',
        video_breakdown: { winning_topic: 'topic' },
      }),
    ).toEqual({ analyzed: true, hasFormulaBreakdown: true })
  })
})
