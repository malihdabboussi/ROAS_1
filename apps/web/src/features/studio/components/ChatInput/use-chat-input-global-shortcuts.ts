import { useEffect } from 'react'
import { handleChatInputShortcutKey } from './chat-input-shortcuts'
import type { ChatInputRecordingState } from './chat-input-recording-footer'

interface UseChatInputGlobalShortcutsOptions {
  disabled: boolean
  recordingState: ChatInputRecordingState
  onStartRecording: () => void
  onStopRecording: () => void
  onVoiceStart?: () => void
}

export function useChatInputGlobalShortcuts({
  disabled,
  recordingState,
  onStartRecording,
  onStopRecording,
  onVoiceStart,
}: UseChatInputGlobalShortcutsOptions) {
  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest?.('[data-chat-input]')) return
      handleChatInputShortcutKey({
        event,
        disabled,
        recordingState,
        onStartRecording,
        onStopRecording,
        onVoiceStart,
      })
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [disabled, onStartRecording, onStopRecording, onVoiceStart, recordingState])
}
