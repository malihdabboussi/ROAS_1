'use client'

import type { MutableRefObject } from 'react'
import type { AnyExtension } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { extractClipboardImageFilesFromItems } from '@/lib/media/clipboard-image'
import { EntityChipNode } from '../extensions/entity-chip-node'

export function useChannelComposerEditor({
  channelId,
  embedded,
  embeddedRef,
  placeholderText,
  memberMentionExtension,
  hasActiveMemberMention,
  handleFileSelectRef,
  tryAddFromClipboardRef,
  triggerSendRef,
  handleSlashKeyDown,
  handleEntityMentionKeyDown,
  syncSlashMenu,
  syncEntityMention,
  persistDraftUpdate,
  onEmptyChange,
}: {
  channelId: string
  embedded: boolean
  embeddedRef: MutableRefObject<boolean>
  placeholderText?: string
  memberMentionExtension: AnyExtension
  hasActiveMemberMention: boolean
  handleFileSelectRef: MutableRefObject<(files: FileList | File[] | null) => void>
  tryAddFromClipboardRef: MutableRefObject<(data: DataTransfer | null | undefined) => boolean>
  triggerSendRef: MutableRefObject<() => Promise<void> | void>
  handleSlashKeyDown: (event: KeyboardEvent) => boolean
  handleEntityMentionKeyDown: (event: KeyboardEvent) => boolean
  syncSlashMenu: (editor: Editor) => void
  syncEntityMention: (editor: Editor) => void
  persistDraftUpdate: (editor: Editor) => void
  onEmptyChange: (isEmpty: boolean) => void
}) {
  return useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'composer-link' } }),
      Placeholder.configure({
        placeholder:
          placeholderText ??
          (embedded
            ? 'Add instructions, context, or details… (@ people, @@ tasks & conversations)'
            : 'Message channel… (@ to mention members)'),
      }),
      memberMentionExtension,
      EntityChipNode,
    ],
    editorProps: {
      attributes: {
        class:
          'channel-composer-editor body-2 text-foreground min-h-8 max-h-52 overflow-y-auto focus:outline-none',
        id: `channel-composer-${channelId}`,
      },
      handlePaste(_view, event) {
        const imageFiles = extractClipboardImageFilesFromItems(
          (event as ClipboardEvent).clipboardData?.items,
        )
        if (imageFiles.length > 0) {
          event.preventDefault()
          handleFileSelectRef.current(imageFiles)
          return true
        }
        if (tryAddFromClipboardRef.current((event as ClipboardEvent).clipboardData)) {
          event.preventDefault()
          return true
        }
        return false
      },
      handleKeyDown(_view, event) {
        if (handleSlashKeyDown(event)) return true
        if (handleEntityMentionKeyDown(event)) return true
        if (event.key === 'Enter' && !event.shiftKey) {
          if (embeddedRef.current) return false
          if (hasActiveMemberMention) return false
          event.preventDefault()
          void triggerSendRef.current()
          return true
        }
        return false
      },
    },
    onUpdate({ editor }) {
      syncSlashMenu(editor)
      syncEntityMention(editor)
      persistDraftUpdate(editor)
      onEmptyChange(editor.isEmpty)
    },
  })
}
