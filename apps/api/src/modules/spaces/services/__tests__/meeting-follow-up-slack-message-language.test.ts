import { describe, expect, it } from 'vitest'
import { buildShareableConfirmReply } from '../meeting-follow-up-slack-message'

describe('meeting follow-up Slack message language', () => {
  it('uses the ROAS portal name in user-facing follow-up copy', () => {
    const message = buildShareableConfirmReply({
      callItem: { title: 'Client call' },
      followUps: [],
    })

    expect(message).toContain('not sent to the ROAS portal yet')
    expect(message).not.toContain('Page Grader')
  })
})
