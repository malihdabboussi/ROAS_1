import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDateForGrid } from './format-date'
import { useSelectionState } from './use-selection-state'

describe('properties UI helpers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats grid dates with the existing relative labels', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-22T12:00:00.000Z'))

    expect(formatDateForGrid()).toBe('-')
    expect(formatDateForGrid('2026-06-22T12:00:00.000Z')).toBe('Today')
    expect(formatDateForGrid('2026-06-21T12:00:00.000Z')).toBe('Yesterday')
    expect(formatDateForGrid('2026-06-19T12:00:00.000Z')).toBe('3 days ago')
  })

  it('tracks individual, all, and cleared selection state', () => {
    const { result } = renderHook(() => useSelectionState([{ id: 'a' }, { id: 'b' }]))

    expect(result.current.selectedIds).toEqual([])
    expect(result.current.allSelected).toBe(false)

    act(() => result.current.handleToggleSelection('a', true))
    expect(result.current.selectedIds).toEqual(['a'])
    expect(result.current.allSelected).toBe(false)

    act(() => result.current.handleSelectAll(true))
    expect(result.current.selectedIds).toEqual(['a', 'b'])
    expect(result.current.allSelected).toBe(true)

    act(() => result.current.clearSelection())
    expect(result.current.selectedIds).toEqual([])
    expect(result.current.allSelected).toBe(false)
  })
})
