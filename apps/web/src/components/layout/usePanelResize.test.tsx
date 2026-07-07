import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePanelResize } from './usePanelResize'

describe('usePanelResize', () => {
  it('starts dragging, clamps the panel width, and stops on pointer up', () => {
    const { result } = renderHook(() =>
      usePanelResize({ defaultWidthPercent: 40, minPercent: 20, maxPercent: 50 }),
    )
    const container = document.createElement('div')
    container.getBoundingClientRect = vi.fn(() => ({
      bottom: 0,
      height: 0,
      left: 100,
      right: 1100,
      toJSON: () => ({}),
      top: 0,
      width: 1000,
      x: 100,
      y: 0,
    }))
    result.current.containerRef.current = container

    act(() => {
      result.current.handleMouseDown({ preventDefault: vi.fn() } as unknown as React.MouseEvent)
    })
    expect(result.current.isDragging).toBe(true)

    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { clientX: 900 }))
    })
    expect(result.current.rawDragWidthPercent).toBe(80)
    expect(result.current.chatWidthPercent).toBe(50)

    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { clientX: 200 }))
    })
    expect(result.current.rawDragWidthPercent).toBe(10)
    expect(result.current.chatWidthPercent).toBe(20)

    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup'))
    })
    expect(result.current.isDragging).toBe(false)
  })
})
