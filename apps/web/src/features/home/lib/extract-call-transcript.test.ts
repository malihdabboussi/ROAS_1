import { describe, expect, it } from 'vitest'
import { extractCallTranscriptText } from './extract-call-transcript'

describe('extractCallTranscriptText', () => {
  it('prefers custom_data.transcript_text', () => {
    expect(
      extractCallTranscriptText({
        description: 'Short summary',
        custom_data: { transcript_text: 'Dylan: hi\nNate: hello' },
      }),
    ).toBe('Dylan: hi\nNate: hello')
  })

  it('falls back to legacy transcript-like description', () => {
    const legacy = `${'x'.repeat(2000)}\nDylan: hello`
    expect(extractCallTranscriptText({ description: legacy, custom_data: {} })).toBe(legacy)
  })

  it('ignores short purpose descriptions', () => {
    expect(
      extractCallTranscriptText({
        description: 'Bridge AM and builders.',
        custom_data: {},
      }),
    ).toBeNull()
  })
})
