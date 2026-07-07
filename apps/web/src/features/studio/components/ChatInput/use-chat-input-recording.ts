import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { ChatInputRecordingState } from './chat-input-recording-footer'

interface UseChatInputRecordingOptions {
  value: string
  setValue: Dispatch<SetStateAction<string>>
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

function insertAtPosition(base: string, position: number, text: string): string {
  if (!text) return base

  const pos = Math.min(Math.max(0, position), base.length)
  const before = base.slice(0, pos)
  const after = base.slice(pos)

  const needsSpace = before.length > 0 && !/\s$/.test(before) && !/^\s/.test(text)
  const spacer = needsSpace ? ' ' : ''

  return `${before}${spacer}${text}${after}`
}

export function useChatInputRecording({
  value,
  setValue,
  textareaRef,
}: UseChatInputRecordingOptions) {
  const [recordingState, setRecordingState] = useState<ChatInputRecordingState>('idle')
  const [_shouldTranscribe, setShouldTranscribe] = useState(false)
  const baseTextRef = useRef<string>('')
  const accumulatedTranscriptRef = useRef<string>('')
  const [insertPosition, setInsertPosition] = useState<number>(0)
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    if (recordingState === 'idle') {
      setDisplayText(value)
    }
  }, [value, recordingState])

  const handleStartRecording = useCallback(() => {
    const currentText = value
    const cursorPos = textareaRef.current?.selectionStart ?? currentText.length

    baseTextRef.current = currentText
    setInsertPosition(cursorPos)
    accumulatedTranscriptRef.current = ''

    setDisplayText(currentText)
    setRecordingState('recording')
  }, [textareaRef, value])

  const handleStopRecording = useCallback(() => {
    setShouldTranscribe(true)
    setRecordingState('finishing')
  }, [])

  const restoreBaseText = useCallback(() => {
    setShouldTranscribe(false)
    setRecordingState('idle')
    accumulatedTranscriptRef.current = ''
    const restore = baseTextRef.current
    setDisplayText(restore)
    setValue(restore)
  }, [setValue])

  const handleCancelRecording = useCallback(() => {
    restoreBaseText()
  }, [restoreBaseText])

  const handleTranscriptionUpdate = useCallback(
    (text: string) => {
      if (recordingState !== 'recording') return

      const merged = insertAtPosition(baseTextRef.current, insertPosition, text)
      setDisplayText(merged)
    },
    [insertPosition, recordingState],
  )

  const handleTranscriptionComplete = useCallback(
    (finalText: string) => {
      const finalMerged = insertAtPosition(baseTextRef.current, insertPosition, finalText)

      setDisplayText(finalMerged)
      setValue(finalMerged)

      setRecordingState('idle')
      setShouldTranscribe(false)
      accumulatedTranscriptRef.current = ''
    },
    [insertPosition, setValue],
  )

  return {
    recordingState,
    displayText,
    setDisplayText,
    handleStartRecording,
    handleStopRecording,
    handleCancelRecording,
    handleTranscriptionUpdate,
    handleTranscriptionComplete,
    handleRecordingError: restoreBaseText,
  }
}
