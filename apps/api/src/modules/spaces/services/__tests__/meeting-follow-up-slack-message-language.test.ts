import { describe, expect, it } from 'vitest'
import { buildConfirmMessage, buildShareableConfirmReply } from '../meeting-follow-up-slack-message'

describe('meeting follow-up Slack message language', () => {
  it('uses the ROAS portal name in user-facing follow-up copy', () => {
    const message = buildShareableConfirmReply({
      callItem: { title: 'Client call' },
      followUps: [],
    })

    expect(message).toContain('not sent to The ROAS Portal yet')
    expect(message).not.toContain('Page Grader')
  })

  it('keeps Pixel recap concise and moves task review behind one chat link', () => {
    const message = buildConfirmMessage({
      callTitle: 'Yasir weekly review',
      callItem: {
        custom_data: {
          call_date: '2026-08-27T19:47:07.000Z',
          client_campaign: { client_name: 'Yasir Khan Coaching LTD' },
          summary: 'Meeting Purpose\nReview the webinar.\nKey Takeaways\nLaunch is on track.',
        },
      },
      followUps: [{ title: 'Check funnel' }, { title: 'Reset ads' }],
      meetingUrl:
        'https://app.roas.io/home/meetings?meeting=meeting-1&space=space-1&review=follow-up',
    })

    expect(message).toContain('I found 2 follow-ups to review')
    expect(message).toContain('<!date^1787860027^{date_short_pretty} at {time}|')
    expect(message).toContain('*Yasir Khan Coaching LTD*')
    expect(message).toContain('Review meeting follow-ups')
    expect(message).not.toContain('*Action Items*')
    expect(message).not.toContain('React with')
    expect(message).not.toContain('Call status')
  })
})
