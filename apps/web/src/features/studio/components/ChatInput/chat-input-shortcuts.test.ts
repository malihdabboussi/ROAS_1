import { describe, expect, it, vi } from 'vitest'
import { handleChatInputShortcutKey } from './chat-input-shortcuts'

function shortcutEvent(key: string, overrides: { metaKey?: boolean; ctrlKey?: boolean } = {}) {
  return {
    key,
    metaKey: overrides.metaKey ?? true,
    ctrlKey: overrides.ctrlKey ?? false,
    preventDefault: vi.fn(),
  }
}

describe('handleChatInputShortcutKey', () => {
  it('toggles recording for command/control D and prevents the browser default', () => {
    const onStartRecording = vi.fn()
    const onStopRecording = vi.fn()
    const startEvent = shortcutEvent('d')

    expect(
      handleChatInputShortcutKey({
        event: startEvent,
        disabled: false,
        recordingState: 'idle',
        onStartRecording,
        onStopRecording,
      }),
    ).toBe(true)
    expect(startEvent.preventDefault).toHaveBeenCalled()
    expect(onStartRecording).toHaveBeenCalled()

    const stopEvent = shortcutEvent('d', { metaKey: false, ctrlKey: true })
    expect(
      handleChatInputShortcutKey({
        event: stopEvent,
        disabled: false,
        recordingState: 'recording',
        onStartRecording,
        onStopRecording,
      }),
    ).toBe(true)
    expect(stopEvent.preventDefault).toHaveBeenCalled()
    expect(onStopRecording).toHaveBeenCalled()
  })

  it('starts live voice for command/control S only when enabled', () => {
    const onVoiceStart = vi.fn()
    const event = shortcutEvent('s')

    expect(
      handleChatInputShortcutKey({
        event,
        disabled: false,
        recordingState: 'idle',
        onStartRecording: vi.fn(),
        onStopRecording: vi.fn(),
        onVoiceStart,
      }),
    ).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(onVoiceStart).toHaveBeenCalled()

    const disabledEvent = shortcutEvent('s')
    expect(
      handleChatInputShortcutKey({
        event: disabledEvent,
        disabled: true,
        recordingState: 'idle',
        onStartRecording: vi.fn(),
        onStopRecording: vi.fn(),
        onVoiceStart,
      }),
    ).toBe(true)
    expect(disabledEvent.preventDefault).toHaveBeenCalled()
  })

  it('ignores non-shortcut keys', () => {
    const event = shortcutEvent('Enter')

    expect(
      handleChatInputShortcutKey({
        event,
        disabled: false,
        recordingState: 'idle',
        onStartRecording: vi.fn(),
        onStopRecording: vi.fn(),
      }),
    ).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
