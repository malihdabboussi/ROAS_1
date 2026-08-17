import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_WORKING_STATUS_CYCLE_MS, CHAT_WORKING_STATUS_HOLD_MS } from './chat-working-status'
import { useWorkingStatusLabel } from './use-working-status-label'

describe('useWorkingStatusLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('holds a brain or tool label, then alternates working phrases', () => {
    const { result } = renderHook(() => useWorkingStatusLabel('Exploring Brain context', true))

    expect(result.current).toBe('Exploring Brain context')

    act(() => {
      vi.advanceTimersByTime(CHAT_WORKING_STATUS_HOLD_MS)
    })
    expect(result.current).toBe('Working...')

    act(() => {
      vi.advanceTimersByTime(CHAT_WORKING_STATUS_CYCLE_MS)
    })
    expect(result.current).toBe('Getting oriented...')

    act(() => {
      vi.advanceTimersByTime(CHAT_WORKING_STATUS_CYCLE_MS)
    })
    expect(result.current).toBe('Planning next moves...')
  })

  it('starts rotating immediately when there is no pinned label', () => {
    const { result } = renderHook(() => useWorkingStatusLabel(null, true))
    expect(result.current).toBe('Working...')

    act(() => {
      vi.advanceTimersByTime(0)
    })
    act(() => {
      vi.advanceTimersByTime(CHAT_WORKING_STATUS_CYCLE_MS)
    })
    expect(result.current).toBe('Getting oriented...')
  })

  it('resets when work stops', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useWorkingStatusLabel('Exploring Brain context', active),
      { initialProps: { active: true } },
    )

    act(() => {
      vi.advanceTimersByTime(CHAT_WORKING_STATUS_HOLD_MS)
    })
    act(() => {
      vi.advanceTimersByTime(CHAT_WORKING_STATUS_CYCLE_MS)
    })
    expect(result.current).toBe('Getting oriented...')

    rerender({ active: false })
    expect(result.current).toBe('Exploring Brain context')
  })
})
