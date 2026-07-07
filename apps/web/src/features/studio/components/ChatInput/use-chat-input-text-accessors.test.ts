import { act, renderHook } from '@testing-library/react'
import { createRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '../../store/use-chat-store'
import { useChatInputTextAccessors } from './use-chat-input-text-accessors'

function textareaRef(scrollHeight = 140) {
  const textarea = document.createElement('textarea')
  Object.defineProperty(textarea, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
  textarea.focus = vi.fn()
  return { current: textarea }
}

function stringState(initial: string): [() => string, Dispatch<SetStateAction<string>>] {
  let value = initial
  const setValue: Dispatch<SetStateAction<string>> = vi.fn((next) => {
    value = typeof next === 'function' ? next(value) : next
  })
  return [() => value, setValue]
}

describe('useChatInputTextAccessors', () => {
  beforeEach(() => {
    useChatStore.getState().setPendingComposerText(null)
  })

  it('exposes append and replace accessors through refs and mirrors current text', () => {
    const [getValue, setValue] = stringState('hello')
    const [getDisplayText, setDisplayText] = stringState('display')
    const insertTextRef = createRef<((text: string) => void) | null>()
    const setTextRef = createRef<((text: string) => void) | null>()
    const composerMirrorRef: MutableRefObject<string> = { current: '' }
    const ref = textareaRef()

    const { rerender, unmount } = renderHook(
      ({ value }) =>
        useChatInputTextAccessors({
          value,
          textareaRef: ref,
          setValue,
          setDisplayText,
          insertTextRef,
          setTextRef,
          composerMirrorRef,
          consumePendingComposerText: true,
          scheduleAnimationFrame: (callback) => {
            callback()
            return 1
          },
        }),
      { initialProps: { value: getValue() } },
    )

    expect(composerMirrorRef.current).toBe('hello')

    act(() => insertTextRef.current?.('world'))
    expect(getValue()).toBe('hello world')
    expect(getDisplayText()).toBe('display world')
    expect(ref.current.focus).toHaveBeenCalled()

    act(() => setTextRef.current?.('replacement'))
    expect(getValue()).toBe('replacement')
    expect(getDisplayText()).toBe('replacement')

    rerender({ value: 'replacement' })
    expect(composerMirrorRef.current).toBe('replacement')

    unmount()
    expect(insertTextRef.current).toBeNull()
    expect(setTextRef.current).toBeNull()
  })

  it('consumes pending composer text when enabled', () => {
    const [, setValue] = stringState('')
    const [, setDisplayText] = stringState('')
    const ref = textareaRef(180)
    useChatStore.getState().setPendingComposerText('queued prompt')

    renderHook(() =>
      useChatInputTextAccessors({
        value: '',
        textareaRef: ref,
        setValue,
        setDisplayText,
        consumePendingComposerText: true,
        scheduleAnimationFrame: (callback) => {
          callback()
          return 1
        },
      }),
    )

    expect(setValue).toHaveBeenCalledWith('queued prompt')
    expect(setDisplayText).toHaveBeenCalledWith('queued prompt')
    expect(ref.current.style.height).toBe('180px')
    expect(ref.current.focus).toHaveBeenCalled()
    expect(useChatStore.getState().pendingComposerText).toBeNull()
  })

  it('leaves pending composer text untouched when disabled', () => {
    const [, setValue] = stringState('')
    const [, setDisplayText] = stringState('')
    useChatStore.getState().setPendingComposerText('queued prompt')

    renderHook(() =>
      useChatInputTextAccessors({
        value: '',
        textareaRef: textareaRef(),
        setValue,
        setDisplayText,
        consumePendingComposerText: false,
      }),
    )

    expect(setValue).not.toHaveBeenCalled()
    expect(setDisplayText).not.toHaveBeenCalled()
  })
})
