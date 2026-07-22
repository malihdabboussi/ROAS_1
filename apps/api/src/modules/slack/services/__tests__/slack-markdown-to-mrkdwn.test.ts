import { describe, expect, it } from 'vitest'
import { markdownToSlackMrkdwn } from '../slack-markdown-to-mrkdwn'

describe('markdownToSlackMrkdwn', () => {
  it('converts Markdown bold to Slack bold', () => {
    expect(markdownToSlackMrkdwn('1. **Check Adam Lamb prior video ads** for evergreen use')).toBe(
      '1. *Check Adam Lamb prior video ads* for evergreen use',
    )
  })

  it('converts Markdown links and leaves code alone', () => {
    expect(markdownToSlackMrkdwn('See [docs](https://example.com) and `**raw**`')).toBe(
      'See <https://example.com|docs> and `**raw**`',
    )
  })

  it('converts strikethrough without touching fenced code', () => {
    const input = ['~~old~~', '```', '**keep**', '```'].join('\n')
    expect(markdownToSlackMrkdwn(input)).toBe(['~old~', '```', '**keep**', '```'].join('\n'))
  })
})
