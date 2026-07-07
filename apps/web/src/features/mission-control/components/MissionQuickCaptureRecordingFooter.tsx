import dynamic from 'next/dynamic'
import { Square, Trash2 } from 'lucide-react'
import type { MissionQuickCaptureRecordingState } from './mission-quick-capture-config'

const SimpleChatAudioRecorder = dynamic(
  () =>
    import('@/components/ui/media/simple-chat-audio-recorder').then((mod) => ({
      default: mod.SimpleChatAudioRecorder,
    })),
  { ssr: false },
)

interface MissionQuickCaptureRecordingFooterProps {
  recordingState: MissionQuickCaptureRecordingState
  disabled: boolean
  onStopRecording: () => void
  onCancelRecording: () => void
  onTranscriptionUpdate: (delta: string) => void
  onTranscriptionComplete: (delta: string) => void
  onError: () => void
}

export function MissionQuickCaptureRecordingFooter({
  recordingState,
  disabled,
  onStopRecording,
  onCancelRecording,
  onTranscriptionUpdate,
  onTranscriptionComplete,
  onError,
}: MissionQuickCaptureRecordingFooterProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex-1">
        <SimpleChatAudioRecorder
          isRecording={recordingState === 'recording'}
          insertionMode
          onTranscriptionUpdate={(_complete, delta) => onTranscriptionUpdate(delta ?? '')}
          onTranscriptionComplete={(_complete, delta) => onTranscriptionComplete(delta ?? '')}
          onError={onError}
        />
      </div>
      <div className="flex items-center gap-1">
        {recordingState === 'recording' && (
          <>
            <button
              type="button"
              onClick={onStopRecording}
              disabled={disabled}
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
              title="Stop"
            >
              <Square className="h-3 w-3 text-red-500" />
            </button>
            <button
              type="button"
              onClick={onCancelRecording}
              disabled={disabled}
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
              title="Cancel"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {recordingState === 'finishing' && (
          <span className="typo-caption text-muted-foreground">Finishing...</span>
        )}
      </div>
    </div>
  )
}
