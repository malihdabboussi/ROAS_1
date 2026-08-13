import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputPlusMenu } from './use-chat-input-plus-menu'

let resizeObserverCallback: ResizeObserverCallback | null = null
let resizeObserverObserve = vi.fn()
let resizeObserverDisconnect = vi.fn()

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback
  }

  observe = resizeObserverObserve
  disconnect = resizeObserverDisconnect
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

describe('useChatInputPlusMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resizeObserverCallback = null
    resizeObserverObserve = vi.fn()
    resizeObserverDisconnect = vi.fn()
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })

  it('positions the plus menu from the trigger button when opened', () => {
    const { result } = renderHook(() => useChatInputPlusMenu())
    result.current.plusButtonRef.current = elementWithRect({
      top: 500,
      left: 100,
      bottom: 532,
      right: 132,
    }) as HTMLButtonElement
    result.current.plusMenuRef.current = elementWithRect({}, 300) as HTMLDivElement

    act(() => result.current.setPlusMenuOpen(true))

    expect(result.current.plusMenuOpen).toBe(true)
    expect(result.current.plusMenuPos).toEqual({ top: 198, left: 100 })
  })

  it('opens and positions submenus from their anchor refs', () => {
    const { result } = renderHook(() => useChatInputPlusMenu())
    result.current.plusSubmenuAnchorRefs.current.skills = elementWithRect({
      top: 450,
      left: 100,
      bottom: 490,
      right: 320,
    }) as HTMLButtonElement
    result.current.plusSubmenuRef.current = elementWithRect({}, 300) as HTMLDivElement

    act(() => result.current.openPlusSubmenu('skills'))
    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(result.current.plusSubmenu).toBe('skills')
    expect(result.current.plusSubmenuPos).toEqual({ top: 190, left: 322 })
  })

  it('repositions an open submenu when first-load content changes its height', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 520 })
    const { result } = renderHook(() => useChatInputPlusMenu())
    result.current.plusSubmenuAnchorRefs.current.access = elementWithRect({
      top: 430,
      left: 100,
      bottom: 470,
      right: 320,
    }) as HTMLButtonElement
    const submenu = elementWithRect({}, 40) as HTMLDivElement
    result.current.plusSubmenuRef.current = submenu

    act(() => result.current.openPlusSubmenu('access'))
    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(result.current.plusSubmenuPos).toEqual({ top: 430, left: 322 })
    Object.defineProperty(submenu, 'offsetHeight', {
      configurable: true,
      value: 360,
    })
    act(() => {
      resizeObserverCallback?.([], {} as ResizeObserver)
      vi.runOnlyPendingTimers()
    })

    expect(resizeObserverObserve).toHaveBeenCalledWith(submenu)
    expect(result.current.plusSubmenuPos).toEqual({ top: 110, left: 322 })
  })

  it('positions info cards and clears menu state on close', () => {
    const { result } = renderHook(() => useChatInputPlusMenu())
    const target = elementWithRect({
      top: 300,
      left: 120,
      right: 220,
      height: 40,
    })

    act(() => {
      result.current.setPlusMenuOpen(true)
      result.current.setPlusSubmenu('skills')
      result.current.showPlusInfoCard(target, 'Skill', 'Controls skill access.')
    })

    expect(result.current.plusInfoCard).toEqual({
      title: 'Skill',
      description: 'Controls skill access.',
      top: 254,
      left: 228,
    })

    act(() => result.current.closePlusMenu())

    expect(result.current.plusMenuOpen).toBe(false)
    expect(result.current.plusSubmenu).toBeNull()
    expect(result.current.plusInfoCard).toBeNull()
  })

  it('hides the root menu when a dedicated submenu is opened externally', () => {
    const { result } = renderHook(() => useChatInputPlusMenu())
    result.current.plusButtonRef.current = elementWithRect({
      top: 500,
      left: 100,
      bottom: 532,
      right: 132,
    }) as HTMLButtonElement

    act(() => result.current.openPlusMenu('integrations'))
    act(() => vi.runOnlyPendingTimers())

    expect(result.current.plusMenuOpen).toBe(true)
    expect(result.current.plusMenuRootVisible).toBe(false)
    expect(result.current.plusSubmenu).toBe('integrations')

    act(() => result.current.togglePlusMenu())
    expect(result.current.plusMenuRootVisible).toBe(true)
  })
})
