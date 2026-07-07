'use client'

import { useEffect, type MutableRefObject } from 'react'
import type { Editor } from '@tiptap/react'

export interface ChannelComposerHandleValue<Payload> {
  getPayload: () => Payload | null
  clear: () => void
  setContent: (html: string) => void
  hasUploadingFiles: () => boolean
}

export function useChannelComposerHandle<Payload>({
  composerHandleRef,
  buildPayload,
  resetComposer,
  editor,
  hasUploadingFiles,
}: {
  composerHandleRef?: MutableRefObject<ChannelComposerHandleValue<Payload> | null>
  buildPayload: () => Payload | null
  resetComposer: () => void
  editor: Editor | null
  hasUploadingFiles: () => boolean
}) {
  useEffect(() => {
    if (!composerHandleRef) return
    composerHandleRef.current = {
      getPayload: buildPayload,
      clear: resetComposer,
      setContent: (html: string) => {
        editor?.commands.setContent(html, { emitUpdate: false })
      },
      hasUploadingFiles,
    }
    return () => {
      composerHandleRef.current = null
    }
  }, [composerHandleRef, buildPayload, resetComposer, editor, hasUploadingFiles])
}
