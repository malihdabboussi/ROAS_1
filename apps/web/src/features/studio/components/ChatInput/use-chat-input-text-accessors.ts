'use client'

import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react'
import { useChatStore } from '../../store/use-chat-store'

type ScheduleAnimationFrame = (callback: () => void) => number

export interface UseChatInputTextAccessorsOptions {
  value: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  setValue: Dispatch<SetStateAction<string>>
  setDisplayText: Dispatch<SetStateAction<string>>
  insertTextRef?: MutableRefObject<((text: string) => void) | null>
  setTextRef?: MutableRefObject<((text: string) => void) | null>
  composerMirrorRef?: MutableRefObject<string>
  consumePendingComposerText: boolean
  scheduleAnimationFrame?: ScheduleAnimationFrame
}

const scheduleRequestAnimationFrame: ScheduleAnimationFrame = (callback) =>
  requestAnimationFrame(() => callback())

function appendWithSeparator(previous: string, text: string): string {
  const separator = previous.length > 0 && !previous.endsWith(' ') ? ' ' : ''
  return previous + separator + text
}

export function useChatInputTextAccessors({
  value,
  textareaRef,
  setValue,
  setDisplayText,
  insertTextRef,
  setTextRef,
  composerMirrorRef,
  consumePendingComposerText,
  scheduleAnimationFrame = scheduleRequestAnimationFrame,
}: UseChatInputTextAccessorsOptions) {
  const pendingComposerText = useChatStore((state) => state.pendingComposerText)
  const setPendingComposerText = useChatStore((state) => state.setPendingComposerText)

  if (composerMirrorRef) composerMirrorRef.current = value

  const insertText = useCallback(
    (text: string) => {
      setValue((previous) => appendWithSeparator(previous, text))
      setDisplayText((previous) => appendWithSeparator(previous, text))
      scheduleAnimationFrame(() => textareaRef.current?.focus())
    },
    [scheduleAnimationFrame, setDisplayText, setValue, textareaRef],
  )

  const setText = useCallback(
    (text: string) => {
      setValue(text)
      setDisplayText(text)
      scheduleAnimationFrame(() => textareaRef.current?.focus())
    },
    [scheduleAnimationFrame, setDisplayText, setValue, textareaRef],
  )

  useEffect(() => {
    if (insertTextRef) insertTextRef.current = insertText
    return () => {
      if (insertTextRef) insertTextRef.current = null
    }
  }, [insertTextRef, insertText])

  useEffect(() => {
    if (setTextRef) setTextRef.current = setText
    return () => {
      if (setTextRef) setTextRef.current = null
    }
  }, [setTextRef, setText])

  useEffect(() => {
    if (!consumePendingComposerText) return
    if (pendingComposerText) {
      setValue(pendingComposerText)
      setDisplayText(pendingComposerText)
      scheduleAnimationFrame(() => {
        const textarea = textareaRef.current
        if (textarea) {
          textarea.style.height = 'auto'
          textarea.style.height = `${textarea.scrollHeight}px`
          textarea.focus()
        }
      })
      setPendingComposerText(null)
    }
  }, [
    consumePendingComposerText,
    pendingComposerText,
    scheduleAnimationFrame,
    setDisplayText,
    setPendingComposerText,
    setValue,
    textareaRef,
  ])

  return { insertText, setText }
}
