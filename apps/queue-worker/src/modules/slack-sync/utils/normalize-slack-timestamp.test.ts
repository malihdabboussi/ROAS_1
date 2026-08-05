import { describe, expect, it } from 'vitest'
import { normalizeSlackTimestamp } from './normalize-slack-timestamp'

describe('normalizeSlackTimestamp', () => {
  it('converts ISO timestamps used by Slack brain sync', () => {
    expect(normalizeSlackTimestamp('2026-08-04T18:53:39.445+00:00')).toBe('1785869619.000000')
  })
})
