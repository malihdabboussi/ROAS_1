import { describe, expect, it } from 'vitest'
import { buildOfferStepPreviews, offerStepSummary } from './offer-step-preview'

describe('offerStepSummary', () => {
  it('summarizes the first two meaningful nested strings', () => {
    expect(
      offerStepSummary({
        headline: 'Powerful promise for founders',
        details: {
          ignored: 'short',
          reason: 'A specific reason this offer wins',
        },
      }),
    ).toBe('Powerful promise for founders · A specific reason this offer wins')
  })

  it('returns an empty summary for missing or non-object values', () => {
    expect(offerStepSummary(null)).toBe('')
    expect(offerStepSummary(undefined)).toBe('')
    expect(offerStepSummary('plain' as unknown as Record<string, unknown>)).toBe('')
  })
})

describe('buildOfferStepPreviews', () => {
  it('builds labeled previews from step data fields', () => {
    expect(
      buildOfferStepPreviews({
        step1_data: { headline: 'Product market fit insight' },
        step3_data: { persona: { pain: 'Buyer has a costly manual workflow' } },
      }),
    ).toEqual([
      { label: 'Product & Market', preview: 'Product market fit insight' },
      { label: 'Buyer Persona', preview: 'Buyer has a costly manual workflow' },
    ])
  })

  it('ignores rows without meaningful step data', () => {
    expect(buildOfferStepPreviews(null)).toEqual([])
    expect(buildOfferStepPreviews({ step1_data: { short: 'tiny' } })).toEqual([])
  })
})
