import { describe, expect, it, vi } from 'vitest'
import { isFlowCardOpenSuppressed, suppressFlowCardOpen } from './flow-card-open-suppress'

describe('flow-card-open-suppress', () => {
  it('blocks open for the suppressed flow id until the window expires', () => {
    vi.useFakeTimers()
    suppressFlowCardOpen('flow-1', 500)
    expect(isFlowCardOpenSuppressed('flow-1')).toBe(true)
    expect(isFlowCardOpenSuppressed('flow-2')).toBe(false)
    vi.advanceTimersByTime(501)
    expect(isFlowCardOpenSuppressed('flow-1')).toBe(false)
    vi.useRealTimers()
  })
})
