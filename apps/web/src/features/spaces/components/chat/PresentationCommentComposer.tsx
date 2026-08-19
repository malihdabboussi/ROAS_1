'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Send, Square, Trash2 } from 'lucide-react'

const SimpleChatAudioRecorder = dynamic(
  () =>
    import('@/components/ui/media/simple-chat-audio-recorder').then((mod) => ({
      default: mod.SimpleChatAudioRecorder,
    })),
  { ssr: false },
)

type RecordingState = 'idle' | 'recording' | 'finishing'

interface PresentationCommentComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

function insertAtPosition(base: string, position: number, text: string): string {
  if (!text) return base
  const pos = Math.min(Math.max(0, position), base.length)
  const before = base.slice(0, pos)
  const after = base.slice(pos)
  const needsSpace = before.length > 0 && !/\s$/.test(before) && !/^\s/.test(text)
  return `${before}${needsSpace ? ' ' : ''}${text}${after}`
}

export function PresentationCommentComposer({
  onSend,
  disabled = false,
  placeholder = 'Add a comment...',
}: PresentationCommentComposerProps) {
  const [value, setValue] = useState('')
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [displayText, setDisplayText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const baseTextRef = useRef('')
  const insertPositionRef = useRef(0)

  useEffect(() => {
    if (recordingState === 'idle') setDisplayText(value)
  }, [value, recordingState])

  const inputValue = recordingState === 'idle' ? value : displayText

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [inputValue, resizeTextarea])

  const submit = useCallback(() => {
    const text = (recordingState === 'idle' ? value : displayText).trim()
    if (!text || disabled || recordingState !== 'idle') return
    onSend(text)
    setValue('')
    setDisplayText('')
    requestAnimationFrame(resizeTextarea)
  }, [disabled, displayText, onSend, recordingState, resizeTextarea, value])

  const handleStartRecording = () => {
    const currentText = value
    const cursorPos = textareaRef.current?.selectionStart ?? currentText.length
    baseTextRef.current = currentText
    insertPositionRef.current = cursorPos
    setDisplayText(currentText)
    setRecordingState('recording')
  }

  const handleStopRecording = () => setRecordingState('finishing')

  const handleCancelRecording = () => {
    setRecordingState('idle')
    const restore = baseTextRef.current
    setDisplayText(restore)
    setValue(restore)
  }

  const handleTranscriptionUpdate = useCallback(
    (delta: string) => {
      if (recordingState !== 'recording') return
      setDisplayText(insertAtPosition(baseTextRef.current, insertPositionRef.current, delta))
    },
    [recordingState],
  )

  const handleTranscriptionComplete = useCallback(
    (delta: string) => {
      const merged = insertAtPosition(baseTextRef.current, insertPositionRef.current, delta)
      setValue(merged)
      setDisplayText(merged)
      setRecordingState('idle')
      requestAnimationFrame(resizeTextarea)
    },
    [resizeTextarea],
  )

  return (
    <div className="input-glass rounded-spacing-3 flex flex-col">
      <div className="px-spacing-2 pt-spacing-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(event) => {
            if (recordingState !== 'idle') return
            setValue(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && recordingState === 'idle') {
              event.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled || recordingState === 'recording'}
          className="body-2 text-foreground caret-accent placeholder:text-muted-foreground max-h-[200px] min-h-[24px] w-full resize-none bg-transparent focus:outline-none"
        />
      </div>

      {recordingState !== 'idle' ? (
        <div className="gap-spacing-1 px-spacing-2 py-spacing-2 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <SimpleChatAudioRecorder
              isRecording={recordingState === 'recording'}
              insertionMode
              onTranscriptionUpdate={(_complete, delta) => handleTranscriptionUpdate(delta ?? '')}
              onTranscriptionComplete={(_complete, delta) =>
                handleTranscriptionComplete(delta ?? '')
              }
              onError={() => handleCancelRecording()}
            />
          </div>
          <div className="flex items-center gap-1">
            {recordingState === 'recording' ? (
              <>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  disabled={disabled}
                  className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
                  title="Stop recording"
                  aria-label="Stop recording"
                >
                  <Square className="text-destructive h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  disabled={disabled}
                  className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
                  title="Cancel recording"
                  aria-label="Cancel recording"
                >
                  <Trash2 className="icon-sm" />
                </button>
              </>
            ) : (
              <span className="typo-caption text-muted-foreground">Finishing...</span>
            )}
          </div>
        </div>
      ) : (
        <div className="px-spacing-2 py-spacing-2 flex items-center justify-end gap-1">
          <span className="tooltip" data-tooltip="Voice input">
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={disabled}
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
              aria-label="Record comment"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
          </span>
          <span className="tooltip" data-tooltip="Send comment">
            <button
              type="button"
              onClick={submit}
              disabled={disabled || !inputValue.trim()}
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
              aria-label="Send comment"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
