import { describe, expect, it } from 'vitest'
import { parseSlackForwardedMessage } from '../slack-forwarded-message-context'

describe('parseSlackForwardedMessage', () => {
  it('extracts the forwarded text and source channel from a Slack message unfurl', () => {
    const result = parseSlackForwardedMessage([
      {
        author_name: 'John',
        fallback: 'John shared the AOS Re-Launch Master Build Plan',
        text: 'Please review the relaunch tasks and ownership.',
        title: 'AOS Re-Launch Master Build Plan',
        title_link: 'https://docs.google.com/document/d/example/edit',
        from_url: 'https://example.slack.com/archives/C09ABC123/p1784913900000100',
        footer: 'Posted in #roas-1ds-collective-llc-939',
      },
    ])

    expect(result).toEqual({
      channelId: 'C09ABC123',
      messageTs: '1784913900.000100',
      context: [
        '[Forwarded Slack message]',
        'From: John',
        'Channel: #roas-1ds-collective-llc-939',
        'Title: AOS Re-Launch Master Build Plan',
        'Message: Please review the relaunch tasks and ownership.',
        'Link: https://docs.google.com/document/d/example/edit',
        'Source: https://example.slack.com/archives/C09ABC123/p1784913900000100',
      ].join('\n'),
    })
  })

  it('returns null for ordinary link previews', () => {
    expect(
      parseSlackForwardedMessage([
        {
          title: 'ROAS',
          title_link: 'https://roas.co',
          text: 'Performance marketing',
        },
      ]),
    ).toBeNull()
  })
})
