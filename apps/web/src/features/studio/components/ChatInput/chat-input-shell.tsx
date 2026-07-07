import type { ComponentProps, DragEventHandler, ReactNode, Ref } from 'react'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { CHAT_FILE_INPUT_ACCEPT } from '@/lib/chat/chat-toast-errors.config'
import { ChatInputAttachmentsArea } from './chat-input-attachments-area'
import { ChatInputAtMentionMenuPortal } from './chat-input-at-mention-menu-portal'
import { ChatInputDragOverlay } from './chat-input-composer-notices'
import { ChatInputNormalFooter } from './chat-input-normal-footer'
import { ChatInputRecordingFooter } from './chat-input-recording-footer'
import { ChatInputSlashMenuPortal } from './chat-input-slash-menu-portal'
import { ChatInputTextarea } from './chat-input-textarea'

type ChatInputShellFooter =
  | {
      kind: 'recording'
      props: ComponentProps<typeof ChatInputRecordingFooter>
    }
  | {
      kind: 'normal'
      props: ComponentProps<typeof ChatInputNormalFooter>
    }

interface ChatInputShellProps {
  shellRef: Ref<HTMLDivElement>
  wrapperClass?: string
  roundedClass: string
  onDragEnter: DragEventHandler<HTMLDivElement>
  onDragLeave: DragEventHandler<HTMLDivElement>
  onDragOver: DragEventHandler<HTMLDivElement>
  onDrop: DragEventHandler<HTMLDivElement>
  pastedTextControls: ReactNode
  attachmentsProps: Omit<
    ComponentProps<typeof ChatInputAttachmentsArea>,
    'fileInputAccept'
  >
  slashMenuProps: ComponentProps<typeof ChatInputSlashMenuPortal>
  atMentionMenuProps: ComponentProps<typeof ChatInputAtMentionMenuPortal>
  textareaProps: ComponentProps<typeof ChatInputTextarea>
  footer: ChatInputShellFooter
  driveModalProps: Pick<
    ComponentProps<typeof DriveFileBrowserModal>,
    'open' | 'onClose' | 'onSelectFileForChat'
  >
  dropboxModalProps: Pick<
    ComponentProps<typeof DropboxFileBrowserModal>,
    'open' | 'onClose' | 'onSelectFileForChat'
  >
  dragOverlayVisible: boolean
}

export function ChatInputShell({
  shellRef,
  wrapperClass,
  roundedClass,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  pastedTextControls,
  attachmentsProps,
  slashMenuProps,
  atMentionMenuProps,
  textareaProps,
  footer,
  driveModalProps,
  dropboxModalProps,
  dragOverlayVisible,
}: ChatInputShellProps) {
  return (
    <div
      ref={shellRef}
      className={
        wrapperClass
          ? `relative ${wrapperClass}`
          : `input-glass relative flex flex-col overflow-hidden ${roundedClass}`
      }
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div>
        {pastedTextControls}

        <ChatInputAttachmentsArea
          fileInputAccept={CHAT_FILE_INPUT_ACCEPT}
          {...attachmentsProps}
        />

        <ChatInputSlashMenuPortal {...slashMenuProps} />
        <ChatInputAtMentionMenuPortal {...atMentionMenuProps} />
        <ChatInputTextarea {...textareaProps} />

        {footer.kind === 'recording' ? (
          <ChatInputRecordingFooter {...footer.props} />
        ) : (
          <ChatInputNormalFooter {...footer.props} />
        )}
      </div>

      <DriveFileBrowserModal context="chat" {...driveModalProps} />
      <DropboxFileBrowserModal context="chat" {...dropboxModalProps} />

      {dragOverlayVisible ? (
        <ChatInputDragOverlay wrapperClass={wrapperClass} roundedClass={roundedClass} />
      ) : null}
    </div>
  )
}
