import { describe, expect, it } from 'vitest'
import { slackReminderSendParams, workRequestReminderText } from './work-request-reminders'

describe('work-request-reminders', () => {
  it('names the 3-hour wait on the first follow-up', () => {
    expect(workRequestReminderText('reminder_3h_sent_at', 'Edited VSL for 1DS')).toContain(
      "It's been 3 hours",
    )
  })

  it('says the review expires in 2 hours on the second follow-up', () => {
    expect(workRequestReminderText('reminder_1h_sent_at', 'Edited VSL for 1DS')).toBe(
      'Hey — your Service Request review for "Edited VSL for 1DS" expires in 2 hours. Use the secure link from this conversation to complete it.',
    )
  })

  it('replies in the original thread and also posts to the channel', () => {
    expect(
      slackReminderSendParams({
        channel_id: 'C123',
        thread_ts: '123.456',
      }),
    ).toEqual({
      channel_id: 'C123',
      thread_ts: '123.456',
      reply_broadcast: true,
    })
  })

  it('uses the original message as the thread when only message_ts is stored', () => {
    expect(
      slackReminderSendParams({
        context: { slack_channel_id: 'C9', message_ts: '9.9' },
      }),
    ).toEqual({
      channel_id: 'C9',
      thread_ts: '9.9',
      reply_broadcast: true,
    })
  })

  it('skips send when Slack channel provenance is missing', () => {
    expect(slackReminderSendParams({ thread_ts: '123.456' })).toBeNull()
  })
})
