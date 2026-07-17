import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { useChatStore } from '../../store/use-chat-store'
import type { DocumentAttachment } from '../../types'

export interface ChatInputDraftStore {
  composerDraftByContext: Record<string, string>
  setComposerDraft: (contextKey: string, text: string) => void
  clearComposerDraft: (contextKey: string) => void
}

type ScheduleAnimationFrame = (callback: () => void) => number

export interface UseChatInputDraftOptions {
  value: string
  draftContextKey: string
  initialValue?: string
  initialDocuments?: DocumentAttachment[]
  restoreNonce?: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  setValue: Dispatch<SetStateAction<string>>
  setDisplayText: Dispatch<SetStateAction<string>>
  clearPastedBlocks: () => void
  restoreAttachedFiles: (documents?: DocumentAttachment[]) => void
  getDraftStore?: () => ChatInputDraftStore
  scheduleAnimationFrame?: ScheduleAnimationFrame
  saveDelayMs?: number
}

const scheduleWithRequestAnimationFrame: ScheduleAnimationFrame = (callback) =>
  requestAnimationFrame(callback)

function getDefaultDraftStore(): ChatInputDraftStore {
  return useChatStore.getState()
}

export function useChatInputDraft({
  value,
  draftContextKey,
  initialValue,
  initialDocuments,
  restoreNonce,
  textareaRef,
  setValue,
  setDisplayText,
  clearPastedBlocks,
  restoreAttachedFiles,
  getDraftStore = getDefaultDraftStore,
  scheduleAnimationFrame = scheduleWithRequestAnimationFrame,
  saveDelayMs = 500,
}: UseChatInputDraftOptions) {
  const valueRef = useRef(value)
  valueRef.current = value
  const getDraftStoreRef = useRef(getDraftStore)
  getDraftStoreRef.current = getDraftStore
  const scheduleAnimationFrameRef = useRef(scheduleAnimationFrame)
  scheduleAnimationFrameRef.current = scheduleAnimationFrame
  const draftMountRef = useRef(true)
  const lastAppliedRestoreNonceRef = useRef<string | null>(null)

  useEffect(() => {
    if (!restoreNonce) return
    if (lastAppliedRestoreNonceRef.current === restoreNonce) return
    lastAppliedRestoreNonceRef.current = restoreNonce
    const next = initialValue ?? ''
    setValue(next)
    setDisplayText(next)
    clearPastedBlocks()
    if (initialDocuments && initialDocuments.length > 0) {
      restoreAttachedFiles(initialDocuments)
    }
  }, [
    restoreNonce,
    initialValue,
    initialDocuments,
    setValue,
    setDisplayText,
    clearPastedBlocks,
    restoreAttachedFiles,
  ])

  useEffect(() => {
    return () => {
      const text = valueRef.current
      const store = getDraftStoreRef.current()
      if (text.trim()) {
        store.setComposerDraft(draftContextKey, text)
      } else {
        store.clearComposerDraft(draftContextKey)
      }
    }
  }, [draftContextKey])

  useEffect(() => {
    if (draftMountRef.current) {
      draftMountRef.current = false
      if (!initialValue) {
        const draft = getDraftStoreRef.current().composerDraftByContext[draftContextKey] ?? ''
        if (draft) {
          setValue(draft)
          setDisplayText(draft)
          resizeTextareaForDraft(textareaRef, draft, scheduleAnimationFrameRef.current)
        }
      }
      return
    }

    const store = getDraftStoreRef.current()
    let draft = store.composerDraftByContext[draftContextKey] ?? ''
    if (!draft && draftContextKey !== 'new') {
      const pendingNew = store.composerDraftByContext['new'] ?? ''
      if (pendingNew.trim()) {
        draft = pendingNew
        store.setComposerDraft(draftContextKey, pendingNew)
        store.clearComposerDraft('new')
      }
    }
    setValue(draft)
    setDisplayText(draft)
    resizeTextareaForDraft(textareaRef, draft, scheduleAnimationFrameRef.current)
    // Only re-hydrate when the draft identity changes — not when `initialValue` flickers.
    // Restores from failed sends go through `restoreNonce`.
  }, [draftContextKey, setValue, setDisplayText, textareaRef])

  useEffect(() => {
    const timer = setTimeout(() => {
      const store = getDraftStoreRef.current()
      if (value.trim()) {
        store.setComposerDraft(draftContextKey, value)
      } else {
        store.clearComposerDraft(draftContextKey)
      }
    }, saveDelayMs)
    return () => clearTimeout(timer)
  }, [value, draftContextKey, saveDelayMs])
}

function resizeTextareaForDraft(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  draft: string,
  scheduleAnimationFrame: ScheduleAnimationFrame,
) {
  scheduleAnimationFrame(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    if (draft.length === 0) {
      textarea.style.height = ''
      return
    }
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  })
}
