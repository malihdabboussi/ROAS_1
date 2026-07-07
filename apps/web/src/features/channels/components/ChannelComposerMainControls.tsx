'use client'

import type { RefObject } from 'react'
import type { Editor } from '@tiptap/react'
import { PastedTextStrip } from '@/components/chat/PastedTextComposerAdapter'
import {
  ChannelComposerAttachmentChips,
  type AttachedFile,
} from './ChannelComposerAttachments'
import { ChannelComposerBottomBar } from './ChannelComposerBottomBar'
import {
  ChannelComposerEditorArea,
  type ChannelComposerRecordingState,
} from './ChannelComposerEditorArea'
import { ChannelComposerFormattingToolbar } from './ChannelComposerFormattingToolbar'
import { ChannelComposerLinkInput } from './ChannelComposerLinkInput'

type PastedTextBlock = Parameters<typeof PastedTextStrip>[0]['blocks'][number]

export function ChannelComposerMainControls({
  editor,
  pastedBlocks,
  onPastedBlockClick,
  onPastedBlockRemove,
  attachedFiles,
  onRemoveAttachedFile,
  linkInputOpen,
  linkUrl,
  onLinkUrlChange,
  onToggleLinkInput,
  onApplyLink,
  onCloseLinkInput,
  recordingState,
  onRecordingStateChange,
  fileInputRef,
  attachButtonRef,
  emojiButtonRef,
  disabled,
  embedded,
  canSend,
  onFileSelect,
  onAttachClick,
  onEmojiClick,
  onMentionEntity,
  onStartRecording,
  onSend,
}: {
  editor: Editor
  pastedBlocks: PastedTextBlock[]
  onPastedBlockClick: (block: PastedTextBlock) => void
  onPastedBlockRemove: (block: PastedTextBlock) => void
  attachedFiles: AttachedFile[]
  onRemoveAttachedFile: (fileId: string) => void
  linkInputOpen: boolean
  linkUrl: string
  onLinkUrlChange: (url: string) => void
  onToggleLinkInput: () => void
  onApplyLink: () => void
  onCloseLinkInput: () => void
  recordingState: ChannelComposerRecordingState
  onRecordingStateChange: (state: ChannelComposerRecordingState) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  attachButtonRef: RefObject<HTMLButtonElement | null>
  emojiButtonRef: RefObject<HTMLButtonElement | null>
  disabled: boolean
  embedded: boolean
  canSend: boolean
  onFileSelect: (files: FileList | null) => void
  onAttachClick: () => void
  onEmojiClick: () => void
  onMentionEntity: () => void
  onStartRecording: () => void
  onSend: () => void
}) {
  return (
    <>
      <PastedTextStrip
        blocks={pastedBlocks}
        onBlockClick={onPastedBlockClick}
        onBlockRemove={onPastedBlockRemove}
        stripClassName="px-3 pb-1 pt-2"
      />
      <ChannelComposerAttachmentChips files={attachedFiles} onRemove={onRemoveAttachedFile} />
      <ChannelComposerFormattingToolbar
        editor={editor}
        linkInputOpen={linkInputOpen}
        onToggleLinkInput={onToggleLinkInput}
      />
      <ChannelComposerLinkInput
        open={linkInputOpen}
        value={linkUrl}
        onChange={onLinkUrlChange}
        onApply={onApplyLink}
        onClose={onCloseLinkInput}
      />
      <ChannelComposerEditorArea
        editor={editor}
        recordingState={recordingState}
        onRecordingStateChange={onRecordingStateChange}
      />
      <ChannelComposerBottomBar
        fileInputRef={fileInputRef}
        attachButtonRef={attachButtonRef}
        emojiButtonRef={emojiButtonRef}
        attachedFilesCount={attachedFiles.length}
        disabled={disabled}
        embedded={embedded}
        canSend={canSend}
        onFileSelect={onFileSelect}
        onAttachClick={onAttachClick}
        onEmojiClick={onEmojiClick}
        onMentionEntity={onMentionEntity}
        onStartRecording={onStartRecording}
        onSend={onSend}
      />
    </>
  )
}
