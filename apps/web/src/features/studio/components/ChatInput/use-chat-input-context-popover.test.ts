import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputContextPopover } from './use-chat-input-context-popover'

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

function rect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...overrides,
  }
}

function elementWithRect(bounds: Partial<DOMRect>): HTMLElement {
  const element = document.createElement('div')
  element.getBoundingClientRect = vi.fn(() => rect(bounds))
  return element
}

describe('useChatInputContextPopover', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })

  it('measures the context popover position from the shell and anchor', () => {
    const shellRef = { current: elementWithRect({ top: 600 }) }
    const { result } = renderHook(() =>
      useChatInputContextPopover({ enabled: true, composerShellRef: shellRef }),
    )
    result.current.contextPopoverAnchorRef.current = elementWithRect({
      left: 420,
      width: 90,
      height: 12,
    }) as HTMLSpanElement

    act(() => result.current.setContextPopoverOpen(true))

    expect(result.current.contextPopoverOpen).toBe(true)
    expect(result.current.contextPopoverPosition).toEqual({
      left: 420,
      bottom: 212,
      width: 90,
    })
  })

  it('closes and clears position when disabled', () => {
    const shellRef = { current: elementWithRect({ top: 600 }) }
    const { result, rerender } = renderHook(
      ({ enabled }) => useChatInputContextPopover({ enabled, composerShellRef: shellRef }),
      { initialProps: { enabled: true } },
    )

    act(() => result.current.setContextPopoverOpen(true))
    rerender({ enabled: false })

    expect(result.current.contextPopoverOpen).toBe(false)
    expect(result.current.contextPopoverPosition).toBeNull()
  })

  it('closes on Escape while open', () => {
    const shellRef = { current: elementWithRect({ top: 600 }) }
    const { result } = renderHook(() =>
      useChatInputContextPopover({ enabled: true, composerShellRef: shellRef }),
    )

    act(() => result.current.setContextPopoverOpen(true))
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(result.current.contextPopoverOpen).toBe(false)
  })
})
