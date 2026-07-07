import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChatInputGlobalShortcuts } from './use-chat-input-global-shortcuts'

function keydownEvent(key: string, options: { metaKey?: boolean; ctrlKey?: boolean } = {}) {
  return new KeyboardEvent('keydown', {
    key,
    metaKey: options.metaKey ?? true,
    ctrlKey: options.ctrlKey ?? false,
    bubbles: true,
    cancelable: true,
  })
}

function defaultOptions() {
  return {
    disabled: false,
    recordingState: 'idle' as const,
    onStartRecording: vi.fn(),
    onStopRecording: vi.fn(),
    onVoiceStart: vi.fn(),
  }
}

describe('useChatInputGlobalShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('handles document shortcuts outside the chat input shell', () => {
    const options = defaultOptions()
    renderHook(() => useChatInputGlobalShortcuts(options))

    const event = keydownEvent('d')
    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(options.onStartRecording).toHaveBeenCalledOnce()
  })

  it('ignores shortcuts from inside the chat input shell', () => {
    const options = defaultOptions()
    renderHook(() => useChatInputGlobalShortcuts(options))
    const shell = document.createElement('div')
    shell.dataset.chatInput = 'true'
    const button = document.createElement('button')
    shell.appendChild(button)
    document.body.appendChild(shell)

    const event = keydownEvent('d')
    button.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(options.onStartRecording).not.toHaveBeenCalled()
  })

  it('removes the document shortcut listener on unmount', () => {
    const options = defaultOptions()
    const { unmount } = renderHook(() => useChatInputGlobalShortcuts(options))
    unmount()

    document.dispatchEvent(keydownEvent('s'))

    expect(options.onVoiceStart).not.toHaveBeenCalled()
  })
})
