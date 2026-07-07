'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'

export function useChannelComposerLink(editor: Editor | null) {
  const [linkInputOpen, setLinkInputOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const toggleLinkInput = useCallback(() => {
    setLinkInputOpen((open) => !open)
  }, [])

  const closeLinkInput = useCallback(() => {
    setLinkInputOpen(false)
    setLinkUrl('')
  }, [])

  const applyLink = useCallback(() => {
    if (!editor || !linkUrl) return
    const href = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    closeLinkInput()
  }, [closeLinkInput, editor, linkUrl])

  return {
    linkInputOpen,
    linkUrl,
    setLinkUrl,
    toggleLinkInput,
    closeLinkInput,
    applyLink,
  }
}
