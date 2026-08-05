import { describe, expect, it } from 'vitest'
import { normalizeSlackTimestamp } from './normalize-slack-timestamp'

describe('normalizeSlackTimestamp', () => {
  it('keeps Slack epoch timestamps', () => {
    expect(normalizeSlackTimestamp('1784462400.000000')).toBe('1784462400.000000')
    expect(normalizeSlackTimestamp('1710000000')).toBe('1710000000')
  })

  it('converts ISO timestamps to Slack epoch seconds', () => {
    expect(normalizeSlackTimestamp('2026-08-04T18:53:39.445+00:00')).toBe('1785869619.000000')
  })

  it('rejects unparseable values', () => {
    expect(() => normalizeSlackTimestamp('not-a-timestamp')).toThrow('Slack timestamp is not valid')
  })
})
