import type { RefObject } from 'react'
import { AtSign, Mic, Paperclip, SmilePlus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { CHAT_FILE_INPUT_ACCEPT, CHAT_MAX_FILES } from '@/lib/chat/chat-toast-errors.config'

export function ChannelComposerBottomBar({
  fileInputRef,
  attachButtonRef,
  emojiButtonRef,
  attachedFilesCount,
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
  fileInputRef: RefObject<HTMLInputElement | null>
  attachButtonRef: RefObject<HTMLButtonElement | null>
  emojiButtonRef: RefObject<HTMLButtonElement | null>
  attachedFilesCount: number
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
    <div className="flex items-center justify-between px-2 py-1">
      <div className="flex items-center gap-0.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={CHAT_FILE_INPUT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            onFileSelect(event.target.files)
            event.target.value = ''
          }}
        />

        <Tooltip
          label={
            attachedFilesCount >= CHAT_MAX_FILES ? `Max ${CHAT_MAX_FILES} files` : 'Attach files'
          }
        >
          <button
            ref={attachButtonRef}
            type="button"
            onClick={onAttachClick}
            disabled={attachedFilesCount >= CHAT_MAX_FILES}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        <Tooltip label="Emoji">
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={onEmojiClick}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        <Tooltip label="Mention task, doc, channel, space, mission">
          <button
            type="button"
            onClick={onMentionEntity}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            aria-label="Mention entity"
          >
            <AtSign className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center gap-0.5">
        <Tooltip label="Voice input (⌘D)">
          <button
            type="button"
            onClick={onStartRecording}
            disabled={disabled}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          >
            <Mic className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        {!embedded ? (
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className="bg-secondary text-primary hover:bg-secondary/90 flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  )
}
