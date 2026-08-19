'use client'

import dynamic from 'next/dynamic'
import type { RefObject } from 'react'
import { GraduationCap, Loader2, Mic, Square, Trash2 } from 'lucide-react'
import { TabsContent } from '@/components/ui/navigation/tabs'
import type { RecordingState } from './types'

const SimpleChatAudioRecorder = dynamic(
  () =>
    import('@/components/ui/media/simple-chat-audio-recorder').then((mod) => ({
      default: mod.SimpleChatAudioRecorder,
    })),
  { ssr: false },
)

export interface UserAddInfoTextTabProps {
  title: string
  onTitleChange: (v: string) => void
  textAreaRef: RefObject<HTMLTextAreaElement | null>
  textInputValue: string
  textContent: string
  onTextChange: (v: string) => void
  recordingState: RecordingState
  rememberingText: boolean
  onRememberText: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording: () => void
  onTranscriptionUpdate: (text: string) => void
  onTranscriptionComplete: (text: string) => void
  onRecorderError: () => void
}

export function UserAddInfoTextTab({
  title,
  onTitleChange,
  textAreaRef,
  textInputValue,
  textContent,
  onTextChange,
  recordingState,
  rememberingText,
  onRememberText,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onTranscriptionUpdate,
  onTranscriptionComplete,
  onRecorderError,
}: UserAddInfoTextTabProps) {
  return (
    <TabsContent value="text" className="space-y-spacing-2 mt-0">
      <input
        type="text"
        placeholder="Source title (e.g. book name, article title)"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
      />
      <div className="relative">
        <textarea
          ref={textAreaRef}
          placeholder="Paste the knowledge content here..."
          value={textInputValue}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={recordingState === 'recording'}
          rows={6}
          className="px-spacing-3 py-spacing-2 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full resize-none border pr-11"
        />
        <button
          type="button"
          onClick={onStartRecording}
          disabled={recordingState !== 'idle'}
          className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
          style={{ position: 'absolute', bottom: 16, right: 8 }}
        >
          <Mic className="h-3.5 w-3.5" />
        </button>
      </div>
      {recordingState !== 'idle' && (
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex-1">
            <SimpleChatAudioRecorder
              isRecording={recordingState === 'recording'}
              insertionMode={true}
              onTranscriptionUpdate={(_complete, delta) => onTranscriptionUpdate(delta || '')}
              onTranscriptionComplete={(_complete, delta) => onTranscriptionComplete(delta || '')}
              onError={(_message) => {
                onRecorderError()
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            {recordingState === 'recording' && (
              <>
                <button
                  type="button"
                  onClick={onStopRecording}
                  className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
                >
                  <Square className="text-destructive h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={onCancelRecording}
                  className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {recordingState === 'finishing' && (
              <span className="text-muted-foreground text-xs">Finishing...</span>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={rememberingText || !title.trim() || !textContent.trim()}
        onClick={onRememberText}
        className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
      >
        <span className="relative z-10 flex items-center gap-2">
          {rememberingText ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Extracting knowledge...
            </>
          ) : (
            <>
              <GraduationCap className="h-3.5 w-3.5" />
              Train
            </>
          )}
        </span>
      </button>
    </TabsContent>
  )
}
