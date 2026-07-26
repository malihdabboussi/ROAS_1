'use client'

import { useCallback, useState, type MutableRefObject } from 'react'
import type { Editor } from '@tiptap/react'
import { toast } from 'sonner'
import { pastedBlocksToHtml } from '@/components/chat/PastedTextComposerAdapter'
import type { ChannelMention } from '@/lib/channels'
import {
  dedupeChannelMentions,
  parseEntityMentionsFromHtml,
  parseMemberMentionsFromHtml,
  parseMentionsFromText,
} from '../lib/mention-parser'
import type { AttachedFile } from './ChannelComposerAttachments'
import { extractSkillKeysFromText, type SlashSkillEntry } from './use-channel-composer-slash-skills'

type PastedTextBlock = Parameters<typeof pastedBlocksToHtml>[0][number]
type MentionCandidate = Parameters<typeof parseMentionsFromText>[1][number]

export interface ChannelComposerPayload {
  content: string
  mentions: ChannelMention[]
  attachments?: string[]
  skill_keys?: string[]
}

export function useChannelComposerSubmit({
  editor,
  disabled,
  onSend,
  onBeforeSend,
  attachedFiles,
  attachedFilesRef,
  pastedBlocksRef,
  candidatesRef,
  slashSkillItemsRef,
  clearPastedBlocks,
  clearDraft,
  clearAttachedFiles,
  embedded,
  composerAttachmentsKey,
}: {
  editor: Editor | null
  disabled: boolean
  onSend: (payload: ChannelComposerPayload) => Promise<void> | void
  onBeforeSend?: (payload: ChannelComposerPayload) => Promise<boolean>
  attachedFiles: AttachedFile[]
  attachedFilesRef: MutableRefObject<AttachedFile[]>
  pastedBlocksRef: MutableRefObject<PastedTextBlock[]>
  candidatesRef: MutableRefObject<MentionCandidate[]>
  slashSkillItemsRef: MutableRefObject<SlashSkillEntry[]>
  clearPastedBlocks: () => void
  clearDraft: () => void
  clearAttachedFiles: () => void
  embedded: boolean
  composerAttachmentsKey: string
}) {
  const [sending, setSending] = useState(false)

  const buildPayload = useCallback((): ChannelComposerPayload | null => {
    if (!editor) return null
    const text = editor.getText()
    const html = editor.getHTML()
    const files = attachedFilesRef.current
    const pasted = pastedBlocksRef.current
    if (!text.trim() && files.length === 0 && pasted.length === 0) return null
    if (files.some((file) => file.uploading)) return null
    const mentions = dedupeChannelMentions([
      ...parseMentionsFromText(text, candidatesRef.current),
      ...parseMemberMentionsFromHtml(html, candidatesRef.current),
      ...parseEntityMentionsFromHtml(html),
    ])
    const knownSkillKeys = new Set(slashSkillItemsRef.current.map((skill) => skill.key))
    const skillKeys = extractSkillKeysFromText(text, knownSkillKeys)
    const driveUrls = files.filter((file) => file.isDriveLink && file.url).map((file) => file.url!)
    const driveLinkHtml = driveUrls.length
      ? driveUrls
          .map(
            (url) => `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`,
          )
          .join('')
      : ''
    const fileUrls = files.filter((file) => !file.isDriveLink && file.url).map((file) => file.url!)
    const pastedHtml = pastedBlocksToHtml(pasted)
    return {
      content: pastedHtml + html + driveLinkHtml,
      mentions,
      attachments: fileUrls.length ? fileUrls : undefined,
      skill_keys: skillKeys.length ? skillKeys : undefined,
    }
  }, [attachedFilesRef, candidatesRef, editor, pastedBlocksRef, slashSkillItemsRef])

  const resetComposer = useCallback(() => {
    editor?.commands.clearContent(true)
    clearPastedBlocks()
    if (typeof window !== 'undefined' && !embedded) {
      clearDraft()
      localStorage.removeItem(composerAttachmentsKey)
    }
    clearAttachedFiles()
  }, [clearAttachedFiles, clearDraft, clearPastedBlocks, composerAttachmentsKey, editor, embedded])

  const triggerSend = useCallback(async () => {
    if (!editor || disabled || sending) return
    if (attachedFiles.some((file) => file.uploading)) {
      toast.error('Wait for files to finish uploading.')
      return
    }
    const payload = buildPayload()
    if (!payload) return
    setSending(true)
    try {
      if (onBeforeSend && !(await onBeforeSend(payload))) return
      await onSend(payload)
      resetComposer()
    } finally {
      setSending(false)
    }
  }, [attachedFiles, buildPayload, disabled, editor, onBeforeSend, onSend, resetComposer, sending])

  const hasUploadingFiles = useCallback(
    () => attachedFilesRef.current.some((file) => file.uploading),
    [attachedFilesRef],
  )

  return {
    sending,
    buildPayload,
    resetComposer,
    triggerSend,
    hasUploadingFiles,
  }
}
