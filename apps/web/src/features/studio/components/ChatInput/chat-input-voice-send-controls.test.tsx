import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatInputVoiceSendControls } from './chat-input-voice-send-controls'

afterEach(cleanup)

describe('ChatInputVoiceSendControls', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('opens the voice choices on click and runs the selected mode', () => {
    const onStartRecording = vi.fn()
    const onVoiceStart = vi.fn()
    const onSend = vi.fn()

    render(
      <ChatInputVoiceSendControls
        disabled={false}
        sendDisabled={false}
        isStreaming={false}
        spaceId="space-1"
        onStartRecording={onStartRecording}
        onVoiceStart={onVoiceStart}
        onSend={onSend}
        onStop={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Voice input' }))
    expect(onStartRecording).not.toHaveBeenCalled()
    expect(screen.getByText('Choose voice mode')).toBeTruthy()
    expect(screen.getByText('Live conversation')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: /Voice input/ })[1]!)
    expect(onStartRecording).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Voice input' }))

    fireEvent.click(screen.getByRole('button', { name: /Live conversation/ }))
    expect(onVoiceStart).toHaveBeenCalledTimes(1)
    expect(onStartRecording).toHaveBeenCalledTimes(1)
  })

  it('renders stop control while streaming and hides live voice menu when unavailable', () => {
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

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Voice input' }))
    expect(screen.queryByText('Choose voice mode')).toBeNull()
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
