import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChatInputOutsideClose } from './use-chat-input-outside-close'

function ref<T extends HTMLElement>(element: T | null) {
  return { current: element }
}

function elementWithChild(tagName: 'div' | 'textarea' = 'div') {
  const element = document.createElement(tagName)
  const child = document.createElement('button')
  element.appendChild(child)
  return { element, child }
}

function defaultOptions() {
  return {
    plusMenuOpen: false,
    modelDropdownOpen: false,
    slashMenuOpen: false,
    atMenuOpen: false,
    contextPopoverOpen: false,
    plusMenuRef: ref<HTMLDivElement>(null),
    plusSubmenuRef: ref<HTMLDivElement>(null),
    plusButtonRef: ref<HTMLButtonElement>(null),
    modelDropdownRef: ref<HTMLDivElement>(null),
    subscriptionSubmenuRef: ref<HTMLDivElement>(null),
    modelHoverCardRef: ref<HTMLDivElement>(null),
    modelEditPanelRef: ref<HTMLDivElement>(null),
    modelButtonRef: ref<HTMLButtonElement>(null),
    slashDropdownRef: ref<HTMLDivElement>(null),
    atDropdownRef: ref<HTMLDivElement>(null),
    textareaRef: ref<HTMLTextAreaElement>(null),
    contextPopoverPanelRef: ref<HTMLDivElement>(null),
    contextPopoverTriggerRef: ref<HTMLButtonElement>(null),
    setPlusMenuOpen: vi.fn(),
    setPlusSubmenu: vi.fn(),
    setModelDropdownOpen: vi.fn(),
    setSlashMenuOpen: vi.fn(),
    setAtMenuOpen: vi.fn(),
    setContextPopoverOpen: vi.fn(),
  }
}

describe('useChatInputOutsideClose', () => {
  it('closes every open menu when the mousedown target is outside all menu refs', () => {
    const options = {
      ...defaultOptions(),
      plusMenuOpen: true,
      modelDropdownOpen: true,
      slashMenuOpen: true,
      atMenuOpen: true,
      contextPopoverOpen: true,
    }
    renderHook(() => useChatInputOutsideClose(options))

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(options.setPlusMenuOpen).toHaveBeenCalledWith(false)
    expect(options.setPlusSubmenu).toHaveBeenCalledWith(null)
    expect(options.setModelDropdownOpen).toHaveBeenCalledWith(false)
    expect(options.setSlashMenuOpen).toHaveBeenCalledWith(false)
    expect(options.setAtMenuOpen).toHaveBeenCalledWith(false)
    expect(options.setContextPopoverOpen).toHaveBeenCalledWith(false)
  })

  it('keeps the plus menu open when the target is inside the plus menu', () => {
    const { element, child } = elementWithChild('textarea')
    const options = {
      ...defaultOptions(),
      plusMenuOpen: true,
      plusMenuRef: ref(element),
    }
    renderHook(() => useChatInputOutsideClose(options))

    child.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(options.setPlusMenuOpen).not.toHaveBeenCalled()
    expect(options.setPlusSubmenu).not.toHaveBeenCalled()
  })

  it('keeps slash and at menus open when the target is inside the textarea', () => {
    const { element, child } = elementWithChild()
    const options = {
      ...defaultOptions(),
      slashMenuOpen: true,
      atMenuOpen: true,
      textareaRef: ref(element),
    }
    renderHook(() => useChatInputOutsideClose(options))

    child.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(options.setSlashMenuOpen).not.toHaveBeenCalled()
    expect(options.setAtMenuOpen).not.toHaveBeenCalled()
  })
})
