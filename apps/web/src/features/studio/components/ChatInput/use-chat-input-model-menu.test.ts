import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputModelMenu } from './use-chat-input-model-menu'

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

function elementWithRect(bounds: Partial<DOMRect>, offsetHeight = 0): HTMLElement {
  const element = document.createElement('div')
  element.getBoundingClientRect = vi.fn(() => rect(bounds))
  Object.defineProperty(element, 'offsetHeight', {
    configurable: true,
    value: offsetHeight,
  })
  return element
}

describe('useChatInputModelMenu', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })

  it('positions the model dropdown from the trigger button when opened', () => {
    const { result } = renderHook(() => useChatInputModelMenu({ modelOptionsLength: 3 }))
    result.current.modelButtonRef.current = elementWithRect({
      top: 500,
      left: 100,
      bottom: 532,
      right: 132,
    }) as HTMLButtonElement
    result.current.modelDropdownRef.current = elementWithRect({}, 300) as HTMLDivElement

    act(() => result.current.setModelDropdownOpen(true))

    expect(result.current.modelDropdownOpen).toBe(true)
    expect(result.current.modelDropdownPos).toEqual({ top: 198, left: 100 })
  })

  it('positions hover cards, edit panels, and edit tooltips', () => {
    const { result } = renderHook(() => useChatInputModelMenu({ modelOptionsLength: 3 }))
    result.current.modelDropdownRef.current = elementWithRect({
      top: 200,
      left: 100,
      right: 340,
    }) as HTMLDivElement
    const row = elementWithRect({
      top: 400,
      left: 200,
      right: 440,
    })

    act(() => result.current.positionModelHoverCard(row))
    expect(result.current.modelHoverPos).toEqual({ top: 400, left: 348 })

    act(() => result.current.openModelEditPanel('model-1'))
    expect(result.current.modelEditId).toBe('model-1')
    expect(result.current.modelEditPos).toEqual({ top: 200, left: 348 })

    result.current.subscriptionSubmenuRef.current = elementWithRect({
      top: 220,
      left: 344,
      right: 584,
    }) as HTMLDivElement
    act(() => result.current.openModelEditPanel('openai-codex/gpt-5.5'))
    expect(result.current.modelEditPos).toEqual({ top: 220, left: 592 })

    result.current.modelEditPanelRef.current = elementWithRect({
      left: 348,
      right: 588,
    }) as HTMLDivElement
    const tooltipRow = elementWithRect({
      top: 450,
      left: 500,
      right: 650,
    })
    act(() => result.current.showModelEditTooltip(tooltipRow, 'Context size.'))
    expect(result.current.modelEditTooltip).toEqual({
      text: 'Context size.',
      top: 450,
      left: 596,
    })
  })

  it('clears hover, edit, and tooltip state when the dropdown closes', () => {
    const { result } = renderHook(() => useChatInputModelMenu({ modelOptionsLength: 3 }))
    result.current.modelDropdownRef.current = elementWithRect({
      top: 200,
      left: 100,
      right: 340,
    }) as HTMLDivElement

    act(() => {
      result.current.setModelDropdownOpen(true)
      result.current.setModelHoverTarget({ kind: 'cortex' })
      result.current.openModelEditPanel('model-1')
      result.current.showModelEditTooltip(
        elementWithRect({ top: 450, left: 500, right: 650 }),
        'Tooltip.',
      )
    })

    act(() => result.current.setModelDropdownOpen(false))

    expect(result.current.modelHoverTarget).toBeNull()
    expect(result.current.modelEditId).toBeNull()
    expect(result.current.modelEditTooltip).toBeNull()
  })
})
