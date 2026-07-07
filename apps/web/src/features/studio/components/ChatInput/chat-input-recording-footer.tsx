'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { Square, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

export type ChatInputRecordingState = 'idle' | 'recording' | 'finishing'

export interface ChatInputAudioRecorderComponentProps {
  isRecording: boolean
  onTranscriptionUpdate: (text: string, delta?: string) => void
  onTranscriptionComplete: (text: string, delta?: string) => void
  onError?: (message: string) => void
  insertionMode?: boolean
}

const SimpleChatAudioRecorder = dynamic(
  () =>
    import('@/components/ui/media/simple-chat-audio-recorder').then((mod) => ({
      default: mod.SimpleChatAudioRecorder,
    })),
  { ssr: false },
) as ComponentType<ChatInputAudioRecorderComponentProps>

interface ChatInputRecordingFooterProps {
  recordingState: Exclude<ChatInputRecordingState, 'idle'>
  disabled: boolean
  composerPadX: string
  AudioRecorderComponent?: ComponentType<ChatInputAudioRecorderComponentProps>
  onStopRecording: () => void
  onCancelRecording: () => void
  onTranscriptionUpdate: (delta: string) => void
  onTranscriptionComplete: (delta: string) => void
  onError: () => void
}

export function ChatInputRecordingFooter({
  recordingState,
  disabled,
  composerPadX,
  AudioRecorderComponent = SimpleChatAudioRecorder,
  onStopRecording,
  onCancelRecording,
  onTranscriptionUpdate,
  onTranscriptionComplete,
  onError,
}: ChatInputRecordingFooterProps) {
  return (
    <div className={`flex items-center justify-between ${composerPadX} py-spacing-2`}>
      <div className="flex-1">
        <AudioRecorderComponent
          isRecording={recordingState === 'recording'}
          insertionMode={true}
          onTranscriptionUpdate={(_complete, delta) => onTranscriptionUpdate(delta || '')}
          onTranscriptionComplete={(_complete, delta) => onTranscriptionComplete(delta || '')}
          onError={onError}
        />
      </div>
      <div className="flex items-center gap-1">
        {recordingState === 'recording' && (
          <>
            <Tooltip label="Stop">
              <button
                type="button"
                onClick={onStopRecording}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
              >
                <Square className="h-3 w-3 text-destructive" />
              </button>
            </Tooltip>
            <Tooltip label="Cancel">
              <button
                type="button"
                onClick={onCancelRecording}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </>
        )}
        {recordingState === 'finishing' && (
          <span className="text-muted-foreground text-xs">Finishing...</span>
        )}
      </div>
    </div>
  )
}
