type ChatInputShortcutEvent = {
  metaKey: boolean
  ctrlKey: boolean
  key: string
  preventDefault: () => void
}

type RecordingState = 'idle' | 'recording' | 'finishing'

interface HandleChatInputShortcutKeyOptions {
  event: ChatInputShortcutEvent
  disabled: boolean
  recordingState: RecordingState
  onStartRecording: () => void
  onStopRecording: () => void
  onVoiceStart?: () => void
}

export function handleChatInputShortcutKey({
  event,
  disabled,
  recordingState,
  onStartRecording,
  onStopRecording,
  onVoiceStart,
}: HandleChatInputShortcutKeyOptions): boolean {
  const mod = event.metaKey || event.ctrlKey
  if (mod && event.key === 'd') {
    event.preventDefault()
    if (disabled) return true
    if (recordingState === 'idle') onStartRecording()
    else if (recordingState === 'recording') onStopRecording()
    return true
  }
  if (mod && event.key === 's') {
    event.preventDefault()
    if (disabled || !onVoiceStart) return true
    onVoiceStart()
    return true
  }
  return false
}
