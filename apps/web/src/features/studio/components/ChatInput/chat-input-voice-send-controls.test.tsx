import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputVoiceSendControls } from './chat-input-voice-send-controls'

afterEach(cleanup)

describe('ChatInputVoiceSendControls', () => {
  it('renders voice, live voice, and send controls with delegated callbacks', () => {
    const onStartRecording = vi.fn()
    const onVoiceStart = vi.fn()
    const onSend = vi.fn()

    render(
      <ChatInputVoiceSendControls
        disabled={false}
        sendDisabled={false}
        isStreaming={false}
        onStartRecording={onStartRecording}
        onVoiceStart={onVoiceStart}
        onSend={onSend}
        onStop={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Voice input' }))
    expect(onStartRecording).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Live voice conversation' }))
    expect(onVoiceStart).toHaveBeenCalledTimes(1)

    const sendButton = screen.getByRole('button', { name: 'Send message' })
    expect(sendButton.className).toContain('text-primary')
    expect(sendButton.hasAttribute('disabled')).toBe(false)
    fireEvent.click(sendButton)
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('renders stop control while streaming and hides live voice when unavailable', () => {
    const onStop = vi.fn()
    render(
      <ChatInputVoiceSendControls
        disabled={false}
        sendDisabled={false}
        isStreaming
        onStartRecording={vi.fn()}
        onSend={vi.fn()}
        onStop={onStop}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Live voice conversation' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull()

    const stopButton = screen.getByRole('button', { name: 'Stop generating' })
    expect(stopButton.className).toContain('text-destructive')
    fireEvent.click(stopButton)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('keeps send disabled when the composer cannot send', () => {
    const onSend = vi.fn()
    render(
      <ChatInputVoiceSendControls
        disabled={false}
        sendDisabled
        isStreaming={false}
        onStartRecording={vi.fn()}
        onSend={onSend}
        onStop={vi.fn()}
      />,
    )

    const sendButton = screen.getByRole('button', { name: 'Send message' })
    expect(sendButton.hasAttribute('disabled')).toBe(true)
  })
})
