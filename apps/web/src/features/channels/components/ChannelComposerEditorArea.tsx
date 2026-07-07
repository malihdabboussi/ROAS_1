import type { Editor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { Square, Trash2 } from 'lucide-react'
import { SimpleChatAudioRecorder } from '@/components/ui/media/simple-chat-audio-recorder'
import { Tooltip } from '@/components/ui/tooltip'

export type ChannelComposerRecordingState = 'idle' | 'recording' | 'finishing'

export function ChannelComposerEditorArea({
  editor,
  recordingState,
  onRecordingStateChange,
}: {
  editor: Editor
  recordingState: ChannelComposerRecordingState
  onRecordingStateChange: (state: ChannelComposerRecordingState) => void
}) {
  if (recordingState === 'idle') {
    return (
      <div className="px-3 py-1.5">
        <EditorContent editor={editor} />
      </div>
    )
  }

  return (
    <div className="flex items-center px-4 py-2">
      <div className="flex-1">
        <SimpleChatAudioRecorder
          isRecording={recordingState === 'recording'}
          insertionMode={true}
          onTranscriptionUpdate={(_content, delta) => {
            if (delta) editor.commands.insertContent(delta)
          }}
          onTranscriptionComplete={(_content, delta) => {
            if (delta) editor.commands.insertContent(delta)
            onRecordingStateChange('idle')
          }}
          onError={() => onRecordingStateChange('idle')}
        />
      </div>
      <div className="flex items-center gap-1">
        {recordingState === 'recording' && (
          <>
            <Tooltip label="Stop">
              <button
                type="button"
                onClick={() => onRecordingStateChange('finishing')}
                className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              >
                <Square className="text-destructive h-3 w-3" />
              </button>
            </Tooltip>
            <Tooltip label="Cancel">
              <button
                type="button"
                onClick={() => onRecordingStateChange('idle')}
                className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </>
        )}
        {recordingState === 'finishing' && (
          <span className="text-muted-foreground text-xs">Finishing…</span>
        )}
      </div>
    </div>
  )
}
