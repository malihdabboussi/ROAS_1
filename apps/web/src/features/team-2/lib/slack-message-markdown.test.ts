import { describe, expect, it } from 'vitest'
import { slackMrkdwnToMarkdown } from './slack-message-markdown'

describe('slackMrkdwnToMarkdown', () => {
  it('preserves lists and converts Slack links, emphasis, and emoji names', () => {
    expect(
      slackMrkdwnToMarkdown(
        '*Meeting follow-ups*\n1. First task\n2. Second task\n<https://app.roas.io/meetings|Open in Meetings>\nReact with :white_check_mark:',
      ),
    ).toBe(
      '**Meeting follow-ups**\n1. First task\n2. Second task\n[Open in Meetings](https://app.roas.io/meetings)\nReact with ✅',
    )
  })

  it('converts Slack user and channel references into readable labels', () => {
    expect(slackMrkdwnToMarkdown('Ask <@U123> in <#C123|launch-room>.')).toBe(
      'Ask @U123 in #launch-room.',
    )
  })
})
