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

  it('converts Markdown tables into readable Slack bullets', () => {
    const input = [
      '| Date | Spend | Leads | CPL | CTR |',
      '| --- | ---: | ---: | ---: | ---: |',
      '| Jul 17 | $328 | 42 | $7.82 | 2.38% |',
      '| Jul 18 | $1,774 | 185 | $9.59 | 2.17% |',
    ].join('\n')

    expect(markdownToSlackMrkdwn(input)).toBe(
      [
        '• *Jul 17* — Spend: $328 · Leads: 42 · CPL: $7.82 · CTR: 2.38%',
        '• *Jul 18* — Spend: $1,774 · Leads: 185 · CPL: $9.59 · CTR: 2.17%',
      ].join('\n'),
    )
  })

  it('leaves Markdown table syntax inside fenced code unchanged', () => {
    const input = ['```', '| Date | Spend |', '| --- | --- |', '| Jul 17 | $328 |', '```'].join(
      '\n',
    )

    expect(markdownToSlackMrkdwn(input)).toBe(input)
  })
})
