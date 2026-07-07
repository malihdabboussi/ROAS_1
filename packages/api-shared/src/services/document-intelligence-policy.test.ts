import { describe, expect, it } from 'vitest'
import { assessDocumentTextQuality } from './document-intelligence-policy'

describe('document intelligence policy', () => {
  it('marks repeated Vibey watermark PDF text as low signal', () => {
    const text = Array.from({ length: 10 }, () => 'Made with Vibey').join('\n')

    const result = assessDocumentTextQuality({
      text,
      pageCount: 10,
      mimeType: 'application/pdf',
      filename: 'inbar-upload.pdf',
    })

    expect(result.quality).toBe('low_signal')
    expect(result.reason).toBe('boilerplate_or_watermark_dominates')
  })

  it('marks real multi-sentence document text as usable', () => {
    const result = assessDocumentTextQuality({
      text: [
        'Customer research shows strong demand for a faster onboarding flow.',
        'The PDF includes market analysis, pricing notes, competitor positioning, and launch risks.',
        'Recommended next steps include validating the conversion funnel and support handoff.',
      ].join('\n'),
      pageCount: 3,
      mimeType: 'application/pdf',
      filename: 'research.pdf',
    })

    expect(result.quality).toBe('usable')
  })
})
