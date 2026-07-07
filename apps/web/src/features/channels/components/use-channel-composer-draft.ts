'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

export function useChannelComposerDraft({
  embedded,
  draftKey,
}: {
  embedded: boolean
  draftKey: string
}) {
  const draftHydratedRef = useRef(false)

  useEffect(() => {
    draftHydratedRef.current = false
  }, [draftKey])

  const hydrateDraft = useCallback(
    (editor: Editor | null) => {
      if (!editor || draftHydratedRef.current || typeof window === 'undefined' || embedded) return
      draftHydratedRef.current = true
      const savedDraft = localStorage.getItem(draftKey)
      if (!savedDraft?.trim()) return
      editor.commands.setContent(savedDraft)
    },
    [draftKey, embedded],
  )

  const persistDraftUpdate = useCallback(
    (updatedEditor: Editor) => {
      if (embedded || typeof window === 'undefined') return
      const text = updatedEditor.getText().trim()
      if (!text) {
        localStorage.removeItem(draftKey)
        return
      }
      localStorage.setItem(draftKey, updatedEditor.getHTML())
    },
    [draftKey, embedded],
  )

  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined' && !embedded) {
      localStorage.removeItem(draftKey)
    }
  }, [draftKey, embedded])

  return { hydrateDraft, persistDraftUpdate, clearDraft }
}
