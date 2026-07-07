import { useCallback } from 'react'
import type {
  ChangeEventHandler,
  Dispatch,
  ReactEventHandler,
  RefObject,
  SetStateAction,
} from 'react'
import type { StudioAtMenuTabId } from './chat-input-at-mentions'
import type { ChatInputRecordingState } from './chat-input-recording-footer'

type ScheduleAnimationFrame = (callback: FrameRequestCallback) => number

const DEFAULT_TEXTAREA_MAX_HEIGHT = 200

function defaultScheduleAnimationFrame(callback: FrameRequestCallback): number {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback)
  }
  callback(0)
  return 0
}

export function resizeChatInputTextarea(
  textarea: HTMLTextAreaElement | null,
  maxHeight = DEFAULT_TEXTAREA_MAX_HEIGHT,
) {
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${String(Math.min(textarea.scrollHeight, maxHeight))}px`
}

export function syncChatInputHighlightBackdropScroll(
  textarea: HTMLTextAreaElement | null,
  highlightBackdrop: HTMLDivElement | null,
) {
  if (!textarea || !highlightBackdrop) return
  highlightBackdrop.scrollTop = textarea.scrollTop
}

export interface UseChatInputTextareaControllerOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  highlightBackdropRef: RefObject<HTMLDivElement | null>
  recordingState: ChatInputRecordingState
  value: string
  displayText: string
  setValue: Dispatch<SetStateAction<string>>
  setDisplayText: Dispatch<SetStateAction<string>>
  onInputPrewarm: () => void
  syncSlashMenuFromComposer: (text: string, cursor: number) => void
  syncAtMenuFromComposer: (text: string, cursor: number) => void
  updateSlashFloating: () => void
  updateAtFloating: () => void
  slashMenuOpen: boolean
  atMenuOpen: boolean
  setAtMenuTab: (tab: StudioAtMenuTabId) => void
  scheduleAnimationFrame?: ScheduleAnimationFrame
}

export function useChatInputTextareaController({
  textareaRef,
  highlightBackdropRef,
  recordingState,
  value,
  displayText,
  setValue,
  setDisplayText,
  onInputPrewarm,
  syncSlashMenuFromComposer,
  syncAtMenuFromComposer,
  updateSlashFloating,
  updateAtFloating,
  slashMenuOpen,
  atMenuOpen,
  setAtMenuTab,
  scheduleAnimationFrame = defaultScheduleAnimationFrame,
}: UseChatInputTextareaControllerOptions) {
  const resizeTextarea = useCallback(() => {
    resizeChatInputTextarea(textareaRef.current)
  }, [textareaRef])

  const handleTextareaScroll = useCallback(() => {
    syncChatInputHighlightBackdropScroll(textareaRef.current, highlightBackdropRef.current)
    if (slashMenuOpen) updateSlashFloating()
    if (atMenuOpen) updateAtFloating()
  }, [
    atMenuOpen,
    highlightBackdropRef,
    slashMenuOpen,
    textareaRef,
    updateAtFloating,
    updateSlashFloating,
  ])

  const handleTextareaChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      const nextValue = event.currentTarget.value
      const cursor = event.currentTarget.selectionStart
      setValue(nextValue)
      onInputPrewarm()
      resizeChatInputTextarea(event.currentTarget)
      syncSlashMenuFromComposer(nextValue, cursor)
      syncAtMenuFromComposer(nextValue, cursor)
    },
    [onInputPrewarm, setValue, syncAtMenuFromComposer, syncSlashMenuFromComposer],
  )

  const handleTextareaSelect: ReactEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      const cursor = event.currentTarget.selectionStart
      const nextValue = event.currentTarget.value
      syncSlashMenuFromComposer(nextValue, cursor)
      syncAtMenuFromComposer(nextValue, cursor)
      if (slashMenuOpen) updateSlashFloating()
      if (atMenuOpen) updateAtFloating()
    },
    [
      atMenuOpen,
      slashMenuOpen,
      syncAtMenuFromComposer,
      syncSlashMenuFromComposer,
      updateAtFloating,
      updateSlashFloating,
    ],
  )

  const openAtMenu = useCallback(
    (tab?: StudioAtMenuTabId) => {
      const text = recordingState === 'idle' ? value : displayText
      const next = `${text}@`
      if (recordingState === 'idle') {
        setValue(next)
        setDisplayText(next)
      } else {
        setDisplayText(next)
      }
      scheduleAnimationFrame(() => {
        const element = textareaRef.current
        if (!element) return
        const position = next.length
        element.focus()
        element.setSelectionRange(position, position)
        syncAtMenuFromComposer(next, position)
        if (tab) setAtMenuTab(tab)
        resizeChatInputTextarea(element)
      })
    },
    [
      displayText,
      recordingState,
      scheduleAnimationFrame,
      setAtMenuTab,
      setDisplayText,
      setValue,
      syncAtMenuFromComposer,
      textareaRef,
      value,
    ],
  )

  return {
    resizeTextarea,
    handleTextareaScroll,
    handleTextareaChange,
    handleTextareaSelect,
    openAtMenu,
  }
}
