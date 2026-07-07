import { describe, expect, it } from 'vitest'
import { expandCalendarVisibleWindow } from './useSpaceCalendarExternalEvents'

describe('useSpaceCalendarExternalEvents', () => {
  it('expands visible calendar windows for adjacent week provider events', () => {
    const window = {
      start: new Date('2026-06-15T00:00:00.000Z'),
      end: new Date('2026-06-21T23:59:59.999Z'),
    }

    const expanded = expandCalendarVisibleWindow(window, 7)

    expect(expanded.start.toISOString()).toBe('2026-06-08T00:00:00.000Z')
    expect(expanded.end.toISOString()).toBe('2026-06-28T23:59:59.999Z')
  })
})
