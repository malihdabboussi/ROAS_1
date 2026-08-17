import { describe, expect, it } from 'vitest'
import { buildDescription } from './page-grader-api.helpers'

describe('buildDescription', () => {
  it('does not repeat notes when they are an exact copy of description', () => {
    const brief =
      'Edit the 12 videos.\n\nSource folder: https://drive.google.com/x\n\nContext: ASAP.'
    expect(buildDescription({ description: brief, notes: brief }, {})).toBe(brief)
  })

  it('keeps distinct notes and meeting context once each', () => {
    expect(
      buildDescription(
        { description: 'Primary brief', notes: 'Extra delivery note' },
        { parent_meeting_title: 'Weekly sync' },
      ),
    ).toBe('Primary brief\n\nExtra delivery note\n\nFrom meeting: Weekly sync')
  })
})
