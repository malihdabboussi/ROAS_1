import { AudioWaveform, Mic, Send, Square } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

interface ChatInputVoiceSendControlsProps {
  disabled: boolean
  sendDisabled: boolean
  isStreaming: boolean
  onStartRecording: () => void
  onVoiceStart?: () => void
  onSend: () => void
  onStop?: () => void
}

export function ChatInputVoiceSendControls({
  disabled,
  sendDisabled,
  isStreaming,
  onStartRecording,
  onVoiceStart,
  onSend,
  onStop,
}: ChatInputVoiceSendControlsProps) {
  return (
    <div className="gap-spacing-0 flex items-center">
      <Tooltip label="Voice input (⌘D)">
        <button
          type="button"
          onClick={onStartRecording}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          aria-label="Voice input"
        >
          <Mic className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      {onVoiceStart && (
        <Tooltip label="Live voice conversation (⌘S)">
          <button
            type="button"
            onClick={onVoiceStart}
            disabled={disabled}
            className="-ml-spacing-0-5 text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
            aria-label="Live voice conversation"
          >
            <AudioWaveform className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      )}
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          className="-ml-spacing-0-5 bg-secondary text-destructive hover:bg-secondary/90 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          aria-label="Stop generating"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={sendDisabled}
          className="-ml-spacing-0-5 bg-secondary text-primary hover:bg-secondary/90 flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          aria-label="Send message"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
