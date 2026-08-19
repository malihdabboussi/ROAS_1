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
      channelName: 'roas-1ds-collective-llc-939',
      messageTs: '1784913900.000100',
      threadTs: null,
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

  it('keeps the channel name and thread ts from a forwarded thread reply with no channel_id', () => {
    const result = parseSlackForwardedMessage([
      {
        is_msg_unfurl: true,
        author_name: 'Krista',
        text: 'Andy wants the new VSL redirect live before Monday',
        from_url:
          'https://1ds.slack.com/archives/C0B6E0K3P53/p1784913900000200?thread_ts=1784913800.000100&cid=C0B6E0K3P53',
        footer: 'From a thread in #roas-1ds-collective-llc-939',
      },
    ])
    expect(result).toMatchObject({
      channelId: 'C0B6E0K3P53',
      channelName: 'roas-1ds-collective-llc-939',
      messageTs: '1784913900.000200',
      threadTs: '1784913800.000100',
    })
    expect(result?.context).toContain('Kind: reply inside a thread')

    const footerOnly = parseSlackForwardedMessage([
      { text: 'quoted', footer: 'From a thread in #roas-1ds-collective-llc-939' },
    ])
    expect(footerOnly).toMatchObject({
      channelId: null,
      channelName: 'roas-1ds-collective-llc-939',
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
