import { describe, expect, it } from 'vitest'
import type { SlackObservationMessage } from '../../../slack/types/slack-observation.types'
import { formatSlackObservationText } from '../slack-team-loop-context'

function message(metadata: Record<string, unknown>): SlackObservationMessage {
  return {
    channel_id: 'C123',
    channel_name: 'acme-client',
    message_ts: '1786640400.123456',
    thread_ts: null,
    sender_slack_user_id: 'U123',
    text: 'Ads still are not live for Friday.',
    is_bot: false,
    observed_at: '2026-08-13T12:00:00.000Z',
    metadata,
  }
}

describe('formatSlackObservationText', () => {
  it('adds deterministic Page Grader client and campaign context for Pixel reasoning', () => {
    expect(
      formatSlackObservationText(
        message({
          page_grader_client_name: 'Acme',
          page_grader_campaign_name: 'August Webinar',
        }),
      ),
    ).toBe(
      '[Page Grader context — client: Acme; campaign: August Webinar]\nAds still are not live for Friday.',
    )
  })

  it('leaves native Slack messages unchanged', () => {
    expect(formatSlackObservationText(message({}))).toBe('Ads still are not live for Friday.')
  })
})
