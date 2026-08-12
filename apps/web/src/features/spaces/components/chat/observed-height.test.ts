import { describe, expect, it } from 'vitest'

import { resolveObservedHeight } from './observed-height'

describe('resolveObservedHeight', () => {
  it('does not schedule another update for the same rounded measurement', () => {
    expect(resolveObservedHeight(640, 640)).toBeNull()
    expect(resolveObservedHeight(640, 640.4)).toBeNull()
  })

  it('returns a normalized height when the measured size materially changes', () => {
    expect(resolveObservedHeight(640, 641.2)).toBe(641)
    expect(resolveObservedHeight(640, -10)).toBe(0)
  })

  it('ignores invalid measurements', () => {
    expect(resolveObservedHeight(640, Number.NaN)).toBeNull()
    expect(resolveObservedHeight(640, Number.POSITIVE_INFINITY)).toBeNull()
  })
})
