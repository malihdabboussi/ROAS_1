import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputFloatingMenus } from './use-chat-input-floating-menus'

const floatingMocks = vi.hoisted(() => ({
  callIndex: 0,
  slash: {
    setReference: vi.fn(),
    setFloating: vi.fn(),
    update: vi.fn(),
    styles: { position: 'absolute' as const, left: 12, top: 24 },
  },
  at: {
    setReference: vi.fn(),
    setFloating: vi.fn(),
    update: vi.fn(),
    styles: { position: 'absolute' as const, left: 32, top: 44 },
  },
}))

vi.mock('@floating-ui/react-dom', () => ({
  autoUpdate: vi.fn(),
  flip: vi.fn(() => ({ name: 'flip' })),
  offset: vi.fn(() => ({ name: 'offset' })),
  shift: vi.fn(() => ({ name: 'shift' })),
  useFloating: vi.fn(() => {
    const target = floatingMocks.callIndex % 2 === 0 ? floatingMocks.slash : floatingMocks.at
    floatingMocks.callIndex += 1
    return {
      refs: {
        setReference: target.setReference,
        setFloating: target.setFloating,
      },
      floatingStyles: target.styles,
      update: target.update,
    }
  }),
}))

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

function shellWithRect(bounds: Partial<DOMRect>): HTMLDivElement {
  const element = document.createElement('div')
  element.getBoundingClientRect = vi.fn(() => rect(bounds))
  return element
}

function textarea(): HTMLTextAreaElement {
  const element = document.createElement('textarea')
  element.value = '/brief @asset'
  element.selectionStart = 6
  element.selectionEnd = 6
  return element
}

describe('useChatInputFloatingMenus', () => {
  beforeEach(() => {
    floatingMocks.callIndex = 0
    floatingMocks.slash.setReference.mockClear()
    floatingMocks.slash.setFloating.mockClear()
    floatingMocks.slash.update.mockClear()
    floatingMocks.at.setReference.mockClear()
    floatingMocks.at.setFloating.mockClear()
    floatingMocks.at.update.mockClear()
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  it('sets slash floating refs, resets scroll on list changes, and updates position while open', () => {
    const textareaRef = { current: textarea() }
    const composerShellRef = { current: shellWithRect({ left: 20, width: 500 }) }
    const { result, rerender } = renderHook(
      ({ slashMenuOpen, slashItems }) =>
        useChatInputFloatingMenus({
          textareaRef,
          composerShellRef,
          value: '/brief',
          slashMenuOpen,
          slashItems,
          slashSkillsExpanded: false,
          slashWorkflowsExpanded: false,
          atMenuOpen: false,
          atItems: [],
        }),
      {
        initialProps: {
          slashMenuOpen: false,
          slashItems: [{ id: 'skill-1' }],
        },
      },
    )
    const menu = document.createElement('div')
    menu.scrollTop = 64

    act(() => result.current.slashFloatingContainerRef(menu))
    rerender({ slashMenuOpen: true, slashItems: [{ id: 'skill-2' }] })

    expect(result.current.slashDropdownRef.current).toBe(menu)
    expect(floatingMocks.slash.setFloating).toHaveBeenCalledWith(menu)
    expect(floatingMocks.slash.setReference).toHaveBeenCalledWith(
      expect.objectContaining({ getBoundingClientRect: expect.any(Function) }),
    )
    expect(menu.scrollTop).toBe(0)
    expect(floatingMocks.slash.update).toHaveBeenCalled()
    expect(result.current.slashFloatingStyles).toEqual(floatingMocks.slash.styles)
  })

  it('measures @ menu shell width while open and clears it when closed', () => {
    const textareaRef = { current: textarea() }
    const composerShellRef = { current: shellWithRect({ left: 42, width: 640 }) }
    const { result, rerender } = renderHook(
      ({ atMenuOpen }) =>
        useChatInputFloatingMenus({
          textareaRef,
          composerShellRef,
          value: '@asset',
          slashMenuOpen: false,
          slashItems: [],
          slashSkillsExpanded: false,
          slashWorkflowsExpanded: false,
          atMenuOpen,
          atItems: [{ id: 'artifact-1' }],
        }),
      { initialProps: { atMenuOpen: true } },
    )
    const menu = document.createElement('div')

    act(() => result.current.atFloatingContainerRef(menu))

    expect(result.current.atDropdownRef.current).toBe(menu)
    expect(floatingMocks.at.setFloating).toHaveBeenCalledWith(menu)
    expect(floatingMocks.at.setReference).toHaveBeenCalledWith(
      expect.objectContaining({ getBoundingClientRect: expect.any(Function) }),
    )
    expect(floatingMocks.at.update).toHaveBeenCalled()
    expect(result.current.atComposerShellRect).toEqual({ width: 640, left: 42 })
    expect(result.current.atFloatingStyles).toEqual(floatingMocks.at.styles)

    rerender({ atMenuOpen: false })

    expect(result.current.atComposerShellRect).toBeNull()
    expect(floatingMocks.at.setReference).toHaveBeenLastCalledWith(null)
  })
})
