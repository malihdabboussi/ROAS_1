import { useCallback, type ClipboardEvent } from 'react'
import { extractClipboardImageFiles } from '../../utils/clipboard-image'
import type { ChatInputRecordingState } from './chat-input-recording-footer'

interface UseChatInputPasteOptions {
  disabled: boolean
  recordingState: ChatInputRecordingState
  handleFileSelect: (files: FileList | readonly File[] | null) => void | Promise<void>
  tryAddFromClipboard: (clipboardData: DataTransfer | null | undefined) => boolean
}

export function useChatInputPaste({
  disabled,
  recordingState,
  handleFileSelect,
  tryAddFromClipboard,
}: UseChatInputPasteOptions) {
  const handleComposerPaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (disabled || recordingState !== 'idle') return

      const imageFiles = extractClipboardImageFiles(event)
      if (imageFiles.length > 0) {
        event.preventDefault()
        void handleFileSelect(imageFiles)
        return
      }

      if (tryAddFromClipboard(event.clipboardData)) {
        event.preventDefault()
      }
    },
    [disabled, handleFileSelect, recordingState, tryAddFromClipboard],
  )

  return { handleComposerPaste }
}
