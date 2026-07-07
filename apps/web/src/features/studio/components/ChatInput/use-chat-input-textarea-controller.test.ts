import { act, renderHook } from '@testing-library/react'
import type { ChangeEvent, SetStateAction, SyntheticEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputTextareaController } from './use-chat-input-textarea-controller'

function applyState<T>(current: T, update: SetStateAction<T>): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update
}

function textarea(value: string, cursor: number, scrollHeight = 260): HTMLTextAreaElement {
  const element = document.createElement('textarea')
  element.value = value
  element.selectionStart = cursor
  element.selectionEnd = cursor
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
  return element
}

function options(overrides: Partial<Parameters<typeof useChatInputTextareaController>[0]> = {}) {
  let composerValue = 'Hello'
  let displayText = 'Hello'
  const textareaRef = { current: textarea(composerValue, composerValue.length) }
  const setValue = vi.fn((update: SetStateAction<string>) => {
    composerValue = applyState(composerValue, update)
    if (textareaRef.current) {
      textareaRef.current.value = composerValue
    }
  })
  const setDisplayText = vi.fn((update: SetStateAction<string>) => {
    displayText = applyState(displayText, update)
    if (textareaRef.current && overrides.recordingState !== 'idle') {
      textareaRef.current.value = displayText
    }
  })
  return {
    textareaRef,
    highlightBackdropRef: { current: document.createElement('div') },
    recordingState: 'idle' as const,
    value: composerValue,
    displayText,
    setValue,
    setDisplayText,
    onInputPrewarm: vi.fn(),
    syncSlashMenuFromComposer: vi.fn(),
    syncAtMenuFromComposer: vi.fn(),
    updateSlashFloating: vi.fn(),
    updateAtFloating: vi.fn(),
    slashMenuOpen: true,
    atMenuOpen: true,
    setAtMenuTab: vi.fn(),
    scheduleAnimationFrame: (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    },
    ...overrides,
  }
}

describe('useChatInputTextareaController', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('resizes textarea and syncs slash and @ menus on composer changes', () => {
    const hookOptions = options()
    const { result } = renderHook(() => useChatInputTextareaController(hookOptions))
    const element = textarea('/br', 3, 260)

    act(() =>
      result.current.handleTextareaChange({
        currentTarget: element,
        target: element,
      } as ChangeEvent<HTMLTextAreaElement>),
    )

    expect(hookOptions.setValue).toHaveBeenCalledWith('/br')
    expect(hookOptions.onInputPrewarm).toHaveBeenCalled()
    expect(element.style.height).toBe('200px')
    expect(hookOptions.syncSlashMenuFromComposer).toHaveBeenCalledWith('/br', 3)
    expect(hookOptions.syncAtMenuFromComposer).toHaveBeenCalledWith('/br', 3)
  })

  it('keeps the highlight backdrop scroll and floating menus aligned', () => {
    const hookOptions = options()
    const { result } = renderHook(() => useChatInputTextareaController(hookOptions))
    hookOptions.textareaRef.current!.scrollTop = 48

    act(() => result.current.handleTextareaScroll())

    expect(hookOptions.highlightBackdropRef.current?.scrollTop).toBe(48)
    expect(hookOptions.updateSlashFloating).toHaveBeenCalled()
    expect(hookOptions.updateAtFloating).toHaveBeenCalled()
  })

  it('opens the @ menu from the footer and preserves the cursor at the inserted trigger', () => {
    const hookOptions = options()
    const { result } = renderHook(() => useChatInputTextareaController(hookOptions))

    act(() => result.current.openAtMenu('media'))

    expect(hookOptions.setValue).toHaveBeenCalledWith('Hello@')
    expect(hookOptions.setDisplayText).toHaveBeenCalledWith('Hello@')
    expect(hookOptions.textareaRef.current!.selectionStart).toBe(6)
    expect(hookOptions.syncAtMenuFromComposer).toHaveBeenCalledWith('Hello@', 6)
    expect(hookOptions.setAtMenuTab).toHaveBeenCalledWith('media')
    expect(hookOptions.textareaRef.current!.style.height).toBe('200px')
  })

  it('does not reposition floating menus on select when slash and @ menus are closed', () => {
    const hookOptions = options({ slashMenuOpen: false, atMenuOpen: false })
    const { result } = renderHook(() => useChatInputTextareaController(hookOptions))
    const element = textarea('Hello', 5)

    act(() =>
      result.current.handleTextareaSelect({
        currentTarget: element,
        target: element,
      } as unknown as SyntheticEvent<HTMLTextAreaElement>),
    )

    expect(hookOptions.updateSlashFloating).not.toHaveBeenCalled()
    expect(hookOptions.updateAtFloating).not.toHaveBeenCalled()
  })

  it('updates display text only when opening the @ menu during recording', () => {
    const hookOptions = options({
      recordingState: 'recording',
      value: 'Base',
      displayText: 'Recording',
    })
    const { result } = renderHook(() => useChatInputTextareaController(hookOptions))

    act(() => result.current.openAtMenu())

    expect(hookOptions.setValue).not.toHaveBeenCalled()
    expect(hookOptions.setDisplayText).toHaveBeenCalledWith('Recording@')
    expect(hookOptions.syncAtMenuFromComposer).toHaveBeenCalledWith('Recording@', 10)
  })
})
