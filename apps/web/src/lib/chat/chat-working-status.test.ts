import { describe, expect, it } from 'vitest'
import { CHAT_WORKING_STATUS_PHRASES, resolveWorkingStatusLabel } from './chat-working-status'

describe('resolveWorkingStatusLabel', () => {
  it('keeps the pinned tool or brain label until cycling starts', () => {
    expect(
      resolveWorkingStatusLabel({
        pinnedLabel: 'Exploring Brain context',
        cycling: false,
        cycleIndex: 3,
      }),
    ).toBe('Exploring Brain context')
  })

  it('falls back to Working... when nothing is pinned yet', () => {
    expect(
      resolveWorkingStatusLabel({
        pinnedLabel: null,
        cycling: false,
        cycleIndex: 0,
      }),
    ).toBe('Working...')
  })

  it('rotates Cursor-style phrases once cycling', () => {
    expect(
      resolveWorkingStatusLabel({
        pinnedLabel: 'Exploring Brain context',
        cycling: true,
        cycleIndex: 2,
      }),
    ).toBe('Planning next moves...')
    expect(
      resolveWorkingStatusLabel({
        pinnedLabel: 'Exploring Brain context',
        cycling: true,
        cycleIndex: CHAT_WORKING_STATUS_PHRASES.length + 2,
      }),
    ).toBe('Planning next moves...')
  })
})
