import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBrainVisualizationUiState } from './use-brain-visualization-ui-state'

function installMatchMedia(matches: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | null = null
  const mediaQuery = {
    matches,
    addEventListener: vi.fn((_event: string, nextListener: (event: MediaQueryListEvent) => void) => {
      listener = nextListener
    }),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => mediaQuery),
  })
  return {
    mediaQuery,
    setMatches(nextMatches: boolean) {
      mediaQuery.matches = nextMatches
      listener?.({ matches: nextMatches } as MediaQueryListEvent)
    },
  }
}

describe('useBrainVisualizationUiState', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tracks mobile viewport, queue visibility, active jobs, and dock filter state', () => {
    const matchMedia = installMatchMedia(false)
    const queueVisibilityListener = vi.fn()
    window.addEventListener('brain-queue-visibility', queueVisibilityListener)

    try {
      const { result, unmount } = renderHook(() =>
        useBrainVisualizationUiState({
          queueJobs: [
            { status: 'queued' },
            { status: 'processing' },
            { status: 'retry' },
            { status: 'succeeded' },
          ],
        }),
      )

      expect(result.current.isMobileBrain).toBe(false)
      expect(result.current.activeQueueCount).toBe(3)
      expect(queueVisibilityListener).toHaveBeenLastCalledWith(
        expect.objectContaining({ detail: { visible: true } }),
      )

      act(() => matchMedia.setMatches(true))
      expect(result.current.isMobileBrain).toBe(true)

      act(() => result.current.toggleBrainNodesMonochrome())
      expect(result.current.brainNodesMonochrome).toBe(true)

      act(() => {
        result.current.handleBrainDateRangePatch({
          custom_start: '2026-06-01',
          custom_end: '2026-06-30',
        })
      })
      expect(result.current.brainDateRange).toEqual({
        time_range: 'all',
        custom_start: '2026-06-01',
        custom_end: '2026-06-30',
      })

      act(() => result.current.setExperiencesOnly(true))
      expect(result.current.experiencesOnly).toBe(true)

      act(() => result.current.handleClearBrainDateRange())
      expect(result.current.brainDateRange).toEqual({ time_range: 'all' })

      unmount()
      expect(queueVisibilityListener).toHaveBeenLastCalledWith(
        expect.objectContaining({ detail: { visible: false } }),
      )
    } finally {
      window.removeEventListener('brain-queue-visibility', queueVisibilityListener)
    }
  })
})
