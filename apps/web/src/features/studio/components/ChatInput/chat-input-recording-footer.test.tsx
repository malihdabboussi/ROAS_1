import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ChatInputRecordingFooter,
  type ChatInputAudioRecorderComponentProps,
} from './chat-input-recording-footer'

function FakeAudioRecorder({
  isRecording,
  insertionMode,
  onTranscriptionUpdate,
  onTranscriptionComplete,
  onError,
}: ChatInputAudioRecorderComponentProps) {
  return (
    <div
      data-testid="audio-recorder"
      data-recording={String(isRecording)}
      data-insertion-mode={String(insertionMode)}
    >
      <button type="button" onClick={() => onTranscriptionUpdate('', 'draft words')}>
        update transcript
      </button>
      <button type="button" onClick={() => onTranscriptionComplete('', 'final words')}>
        complete transcript
      </button>
      <button type="button" onClick={() => onError?.('no microphone')}>recorder error</button>
    </div>
  )
}

afterEach(cleanup)

describe('ChatInputRecordingFooter', () => {
  it('renders active recording controls and delegates recorder callbacks', () => {
    const onStopRecording = vi.fn()
    const onCancelRecording = vi.fn()
    const onTranscriptionUpdate = vi.fn()
    const onTranscriptionComplete = vi.fn()
    const onError = vi.fn()
    const { container } = render(
      <ChatInputRecordingFooter
        recordingState="recording"
        disabled={false}
        composerPadX="px-spacing-2"
        AudioRecorderComponent={FakeAudioRecorder}
        onStopRecording={onStopRecording}
        onCancelRecording={onCancelRecording}
        onTranscriptionUpdate={onTranscriptionUpdate}
        onTranscriptionComplete={onTranscriptionComplete}
        onError={onError}
      />,
    )

    expect(screen.getByTestId('audio-recorder').dataset.recording).toBe('true')
    expect(screen.getByTestId('audio-recorder').dataset.insertionMode).toBe('true')
    expect(container.firstElementChild?.className).toContain('px-spacing-2')
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-destructive')

    fireEvent.click(container.querySelectorAll('button')[3]!)
    expect(onStopRecording).toHaveBeenCalledTimes(1)

    fireEvent.click(container.querySelectorAll('button')[4]!)
    expect(onCancelRecording).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'update transcript' }))
    expect(onTranscriptionUpdate).toHaveBeenCalledWith('draft words')

    fireEvent.click(screen.getByRole('button', { name: 'complete transcript' }))
    expect(onTranscriptionComplete).toHaveBeenCalledWith('final words')

    fireEvent.click(screen.getByRole('button', { name: 'recorder error' }))
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('renders finishing state without recording action controls', () => {
    const { container } = render(
      <ChatInputRecordingFooter
        recordingState="finishing"
        disabled={false}
        composerPadX="px-spacing-1"
        AudioRecorderComponent={FakeAudioRecorder}
        onStopRecording={vi.fn()}
        onCancelRecording={vi.fn()}
        onTranscriptionUpdate={vi.fn()}
        onTranscriptionComplete={vi.fn()}
        onError={vi.fn()}
      />,
    )

    expect(screen.getByTestId('audio-recorder').dataset.recording).toBe('false')
    expect(screen.getByText('Finishing...').className).toContain('text-muted-foreground')
    expect(container.querySelectorAll('svg')).toHaveLength(0)
  })
})
