import { describe, expect, it } from 'vitest'
import { renderUnifiedMeetingRecap } from './meeting-unified-recap'

describe('renderUnifiedMeetingRecap', () => {
  it('keeps every recording summary and canonical action owner in one recap', () => {
    const recap = renderUnifiedMeetingRecap({
      title: 'Strategy call',
      recordings: [
        {
          title: 'Pre-call',
          provider_summary: 'Aligned before the main call.',
          is_primary: false,
        },
        {
          title: 'Main call',
          provider_summary: 'Agreed on the launch plan.',
          is_primary: true,
        },
      ],
      actions: [
        {
          title: 'Send the launch plan',
          canonical_assignee_name: 'Dylan Vanas',
        },
      ],
    })

    expect(recap).toContain('Aligned before the main call.')
    expect(recap).toContain('Agreed on the launch plan.')
    expect(recap).toContain('Send the launch plan — Dylan Vanas')
  })
})
