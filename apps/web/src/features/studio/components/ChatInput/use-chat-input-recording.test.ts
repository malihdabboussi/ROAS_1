import { act, renderHook } from '@testing-library/react'
import type { SetStateAction } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputRecording } from './use-chat-input-recording'

function applyState<T>(current: T, update: SetStateAction<T>): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update
}

function textarea(value: string, cursor: number): HTMLTextAreaElement {
  const element = document.createElement('textarea')
  element.value = value
  element.selectionStart = cursor
  element.selectionEnd = cursor
  return element
}

describe('useChatInputRecording', () => {
  let composerValue: string
  let setValue: ReturnType<typeof vi.fn>

  beforeEach(() => {
    composerValue = 'Hello world'
    setValue = vi.fn((update: SetStateAction<string>) => {
      composerValue = applyState(composerValue, update)
    })
  })

  it('keeps interim transcription in display text and commits final text at the captured cursor', () => {
    const textareaRef = { current: textarea(composerValue, 5) }
    const { result } = renderHook(() =>
      useChatInputRecording({
        value: composerValue,
        setValue,
        textareaRef,
      }),
    )

    act(() => result.current.handleStartRecording())
    expect(result.current.recordingState).toBe('recording')
    expect(result.current.displayText).toBe('Hello world')

    act(() => result.current.handleTranscriptionUpdate(' there'))
    expect(result.current.displayText).toBe('Hello there world')
    expect(setValue).not.toHaveBeenCalled()

    act(() => result.current.handleTranscriptionComplete(' again'))
    expect(result.current.recordingState).toBe('idle')
    expect(result.current.displayText).toBe('Hello again world')
    expect(composerValue).toBe('Hello again world')
  })

  it('restores the base text when recording is cancelled or errors', () => {
    const textareaRef = { current: textarea(composerValue, composerValue.length) }
    const { result } = renderHook(() =>
      useChatInputRecording({
        value: composerValue,
        setValue,
        textareaRef,
      }),
    )

    act(() => result.current.handleStartRecording())
    act(() => result.current.handleTranscriptionUpdate(' now'))
    expect(result.current.displayText).toBe('Hello world now')

    act(() => result.current.handleCancelRecording())
    expect(result.current.recordingState).toBe('idle')
    expect(result.current.displayText).toBe('Hello world')
    expect(composerValue).toBe('Hello world')

    act(() => result.current.handleStartRecording())
    act(() => result.current.handleTranscriptionUpdate(' again'))
    act(() => result.current.handleRecordingError())

    expect(result.current.recordingState).toBe('idle')
    expect(result.current.displayText).toBe('Hello world')
    expect(composerValue).toBe('Hello world')
  })
})
