import type { Ref } from 'react'
import type { MessageReference } from '../../types'
import { ArtifactAttachments, type AttachedArtifact } from '../chat/ArtifactAttachments'
import { FileAttachments, type AttachedFile } from '../chat/FileAttachments'
import {
  ChatInputCreditsExhaustedNotice,
} from './chat-input-composer-notices'
import { ChatInputReferenceChips } from './chat-input-reference-chips'

interface ChatInputAttachmentsAreaProps {
  fileInputRef: Ref<HTMLInputElement>
  fileInputAccept: string
  attachedFiles: AttachedFile[]
  attachedArtifacts: AttachedArtifact[]
  attachedReferences: MessageReference[]
  creditsExhausted?: boolean
  composerPadX: string
  composerChipRowPad: string
  onFileSelect: (files: FileList | null) => void
  onFileRemove: (id: string) => void
  onArtifactRemove: (id: string) => void
  onReferenceRemove: (ref: MessageReference) => void
}

export function ChatInputAttachmentsArea({
  fileInputRef,
  fileInputAccept,
  attachedFiles,
  attachedArtifacts,
  attachedReferences,
  creditsExhausted,
  composerPadX,
  composerChipRowPad,
  onFileSelect,
  onFileRemove,
  onArtifactRemove,
  onReferenceRemove,
}: ChatInputAttachmentsAreaProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={fileInputAccept}
        onChange={(event) => {
          onFileSelect(event.target.files)
          event.target.value = ''
        }}
        className="hidden"
      />

      <FileAttachments
        files={attachedFiles}
        onRemove={onFileRemove}
        stripClassName={composerChipRowPad}
      />
      <ArtifactAttachments
        artifacts={attachedArtifacts}
        chipRowClassName={composerChipRowPad}
        onRemove={onArtifactRemove}
      />
      <ChatInputReferenceChips
        references={attachedReferences}
        chipRowClassName={composerChipRowPad}
        onRemove={onReferenceRemove}
      />

      {creditsExhausted ? <ChatInputCreditsExhaustedNotice composerPadX={composerPadX} /> : null}
    </>
  )
}
